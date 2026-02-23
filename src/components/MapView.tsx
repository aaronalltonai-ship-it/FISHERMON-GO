import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, Crosshair, Navigation, Loader2 } from 'lucide-react';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const playerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  spots: Array<{ lat: number; lng: number; name: string; type: string }>;
}

interface WaterFeature {
  id: number;
  type: string;
  geometry: [number, number][];
  isPolygon: boolean;
  name?: string;
  center: [number, number];
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function LocationMarker({ position }: { position: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} icon={playerIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

export function MapView({ spots }: MapViewProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [mapType, setMapType] = useState<'normal' | 'satellite'>('normal');
  const [waterFeatures, setWaterFeatures] = useState<WaterFeature[]>([]);
  const [isLoadingWater, setIsLoadingWater] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const fetchWaterFeatures = useCallback(async () => {
    if (!position) return;
    setIsLoadingWater(true);
    try {
      const [lat, lng] = position;
      const radius = 2000; // 2km radius
      const query = `
        [out:json][timeout:25];
        (
          way["natural"="water"](around:${radius},${lat},${lng});
          relation["natural"="water"](around:${radius},${lat},${lng});
          way["waterway"](around:${radius},${lat},${lng});
          relation["waterway"](around:${radius},${lat},${lng});
        );
        out geom;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      const data = await response.json();
      
      const features: WaterFeature[] = [];
      data.elements.forEach((el: any) => {
        if (el.type === 'way' && el.geometry) {
          const coords: [number, number][] = el.geometry.map((g: any) => [g.lat, g.lon]);
          const isPolygon = coords.length > 2 && coords[0][0] === coords[coords.length-1][0] && coords[0][1] === coords[coords.length-1][1];
          
          let centerLat = 0, centerLng = 0;
          coords.forEach(c => { centerLat += c[0]; centerLng += c[1]; });
          centerLat /= coords.length;
          centerLng /= coords.length;
          
          features.push({
            id: el.id,
            type: el.tags?.waterway ? 'waterway' : 'water',
            geometry: coords,
            isPolygon,
            name: el.tags?.name,
            center: [centerLat, centerLng]
          });
        }
      });
      setWaterFeatures(features);
    } catch (err) {
      console.error("Failed to fetch water features", err);
    } finally {
      setIsLoadingWater(false);
    }
  }, [position]);

  // Fetch water features once when position is first acquired
  useEffect(() => {
    if (position && waterFeatures.length === 0 && !isLoadingWater) {
      fetchWaterFeatures();
    }
  }, [position]); // Only run when position changes, but guard prevents infinite loops

  const nearestWater = useMemo(() => {
    if (!position || waterFeatures.length === 0) return null;
    let nearest = waterFeatures[0];
    let minDistance = Infinity;
    
    waterFeatures.forEach(feature => {
      // Check distance to center of feature
      const dist = getDistance(position[0], position[1], feature.center[0], feature.center[1]);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = feature;
      }
    });
    
    return { feature: nearest, distance: minDistance };
  }, [position, waterFeatures]);

  const center: [number, number] = position || [0, 0];

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer 
        center={center} 
        zoom={15} 
        className="w-full h-full"
        zoomControl={false}
      >
        {mapType === 'normal' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        
        <LocationMarker position={position} />
        
        {/* Render Overpass Water Features */}
        {waterFeatures.map(feature => (
          feature.isPolygon ? (
            <Polygon 
              key={feature.id} 
              positions={feature.geometry} 
              pathOptions={{ className: 'flashing-water' }}
            >
              <Popup>{feature.name || 'Water Body'}</Popup>
            </Polygon>
          ) : (
            <Polyline 
              key={feature.id} 
              positions={feature.geometry} 
              pathOptions={{ className: 'flashing-water' }}
            >
              <Popup>{feature.name || 'Waterway'}</Popup>
            </Polyline>
          )
        ))}

        {/* Render Custom Spots */}
        {spots.map((spot, i) => (
          <Marker key={`spot-${i}`} position={[spot.lat, spot.lng]} icon={customIcon}>
            <Popup>
              <div className="font-bold">{spot.name}</div>
              <div className="text-sm capitalize text-gray-600">{spot.type}</div>
            </Popup>
          </Marker>
        ))}

        {/* Draw Line to Nearest Water */}
        {position && nearestWater && (
          <Polyline 
            positions={[position, nearestWater.feature.center]} 
            pathOptions={{ color: '#f59e0b', dashArray: '5, 10', weight: 3 }} 
          />
        )}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute bottom-32 right-4 z-[400] flex flex-col gap-2">
        <button 
          onClick={() => setMapType(t => t === 'normal' ? 'satellite' : 'normal')}
          className="bg-white p-3 rounded-full shadow-lg text-black hover:bg-gray-100"
          title="Toggle Map Type"
        >
          <Layers size={24} />
        </button>
        <button 
          onClick={() => {
            if (position) {
              setPosition([...position] as [number, number]);
            }
          }}
          className="bg-white p-3 rounded-full shadow-lg text-black hover:bg-gray-100"
          title="Center on Me"
        >
          <Crosshair size={24} />
        </button>
        <button 
          onClick={fetchWaterFeatures}
          className="bg-blue-600 p-3 rounded-full shadow-lg text-white hover:bg-blue-500 relative"
          title="Scan for Water Nearby"
        >
          {isLoadingWater ? <Loader2 size={24} className="animate-spin" /> : <Navigation size={24} />}
        </button>
      </div>
      
      {/* Nearest Water Indicator */}
      {nearestWater && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[400] bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none">
          <Navigation size={16} className="text-blue-400" />
          <span className="font-bold">{Math.round(nearestWater.distance)}m</span>
          <span className="text-white/70 text-sm">to nearest water</span>
        </div>
      )}
    </div>
  );
}
