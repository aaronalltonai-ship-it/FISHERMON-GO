import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, Crosshair, Navigation, Loader2, Store, Target, User, MapPin, Fish, Shield, Trophy, Plus } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

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
  players?: any[];
  onProximityChange?: (proximity: { isNearBaitShop: boolean; isNearTournament: boolean; isNearRanger: boolean; locationType: 'urban' | 'rural' }) => void;
  onPlayerClick?: (player: any) => void;
}

interface MapFeature {
  id: number;
  type: 'water' | 'waterway' | 'bait_shop' | 'park';
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

const baitShopIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="bg-orange-500 p-1.5 rounded-full border-2 border-white shadow-lg">
      <Store size={16} className="text-white" />
    </div>
  ),
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const parkIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="bg-emerald-600 p-1.5 rounded-full border-2 border-white shadow-lg">
      <Trophy size={16} className="text-white" />
    </div>
  ),
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const spotIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="bg-blue-500 p-1.5 rounded-full border-2 border-white shadow-lg">
      <Fish size={16} className="text-white" />
    </div>
  ),
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const rangerIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="bg-blue-700 p-1.5 rounded-full border-2 border-white shadow-lg">
      <Shield size={16} className="text-white" />
    </div>
  ),
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const monsterShadowIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="relative">
      <div className="w-32 h-16 bg-black/20 blur-xl rounded-[100%] animate-[monster-swim_10s_infinite_linear]" />
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <Fish size={40} className="text-black rotate-90" />
      </div>
    </div>
  ),
  className: 'monster-shadow-container',
  iconSize: [128, 64],
  iconAnchor: [64, 32],
});

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
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

const otherPlayerIcon = (name: string, hasPassport: boolean) => L.divIcon({
  html: renderToStaticMarkup(
    <div className="relative flex flex-col items-center">
      <div className={`p-1 rounded-full border-2 ${hasPassport ? 'bg-purple-600 border-yellow-400' : 'bg-blue-600 border-white'} shadow-lg`}>
        <User size={16} className="text-white" />
      </div>
      <div className="absolute -top-6 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-bold border border-white/10">
        {name}
      </div>
    </div>
  ),
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export function MapView({ spots, players = [], onProximityChange, onPlayerClick, onAddSpot }: MapViewProps & { onAddSpot?: (spot: { lat: number, lng: number, name: string, type: string }) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [mapType, setMapType] = useState<'normal' | 'satellite'>('normal');
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [rangers, setRangers] = useState<Array<{ id: number; pos: [number, number]; target: [number, number] }>>([]);
  const [monsters, setMonsters] = useState<Array<{ id: number; pos: [number, number]; target: [number, number] }>>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchFeatures = useCallback(async () => {
    if (!position) return;
    setIsLoading(true);
    try {
      const [lat, lng] = position;
      const radius = 1500; // 1.5km radius
      const query = `
        [out:json][timeout:15];
        (
          way["natural"="water"](around:${radius},${lat},${lng});
          relation["natural"="water"](around:${radius},${lat},${lng});
          way["waterway"](around:${radius},${lat},${lng});
          relation["waterway"](around:${radius},${lat},${lng});
          node["amenity"="fuel"](around:${radius},${lat},${lng});
          way["amenity"="fuel"](around:${radius},${lat},${lng});
          relation["amenity"="fuel"](around:${radius},${lat},${lng});
          way["leisure"="park"](around:${radius},${lat},${lng});
          relation["leisure"="park"](around:${radius},${lat},${lng});
        );
        out geom;
      `;
      
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.osm.ch/api/interpreter'
      ];

      let response;
      let lastError;

      for (const endpoint of endpoints) {
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            body: query
          });
          if (response.ok) break;
        } catch (e) {
          lastError = e;
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Overpass API error: ${response?.statusText || lastError}`);
      }
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid JSON from Overpass API");
      }
      
      const newFeatures: MapFeature[] = [];
      if (data && data.elements) {
        data.elements.forEach((el: any) => {
          let type: MapFeature['type'] = 'water';
          if (el.tags?.amenity === 'fuel') type = 'bait_shop';
          else if (el.tags?.leisure === 'park') type = 'park';
          else if (el.tags?.waterway) type = 'waterway';

          let coords: [number, number][] = [];
          if (el.type === 'node') {
            coords = [[el.lat, el.lon]];
          } else if (el.geometry) {
            coords = el.geometry.map((g: any) => [g.lat, g.lon]);
          }

          if (coords.length > 0) {
            const isPolygon = coords.length > 2 && coords[0][0] === coords[coords.length-1][0] && coords[0][1] === coords[coords.length-1][1];
            
            let centerLat = 0, centerLng = 0;
            coords.forEach(c => { centerLat += c[0]; centerLng += c[1]; });
            centerLat /= coords.length;
            centerLng /= coords.length;
            
            newFeatures.push({
              id: el.id,
              type,
              geometry: coords,
              isPolygon,
              name: el.tags?.name,
              center: [centerLat, centerLng]
            });
          }
        });
      }
      setFeatures(newFeatures);
      
      // Spawn rangers near parks
      const parkFeatures = newFeatures.filter(f => f.type === 'park');
      const newRangers = parkFeatures.map((p, i) => ({
        id: i,
        pos: [...p.center] as [number, number],
        target: [p.center[0] + (Math.random() - 0.5) * 0.005, p.center[1] + (Math.random() - 0.5) * 0.005] as [number, number]
      }));
      setRangers(newRangers);

      // Spawn monsters in large water bodies
      const waterFeatures = newFeatures.filter(f => f.type === 'water' && f.isPolygon);
      const newMonsters = waterFeatures.map((w, i) => ({
        id: i,
        pos: [...w.center] as [number, number],
        target: [w.center[0] + (Math.random() - 0.5) * 0.01, w.center[1] + (Math.random() - 0.5) * 0.01] as [number, number]
      }));
      setMonsters(newMonsters);
    } catch (err) {
      console.error("Failed to fetch features", err);
    } finally {
      setIsLoading(false);
    }
  }, [position]);

  useEffect(() => {
    if (position && features.length === 0 && !isLoading) {
      fetchFeatures();
    }
  }, [position]);

  useEffect(() => {
    if (rangers.length === 0) return;
    
    const interval = setInterval(() => {
      setRangers(prev => prev.map(r => {
        const dx = r.target[0] - r.pos[0];
        const dy = r.target[1] - r.pos[1];
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 0.0001) {
          // New target
          return {
            ...r,
            target: [r.pos[0] + (Math.random() - 0.5) * 0.005, r.pos[1] + (Math.random() - 0.5) * 0.005]
          };
        }
        
        // Move towards target
        const speed = 0.00005;
        return {
          ...r,
          pos: [r.pos[0] + (dx/dist) * speed, r.pos[1] + (dy/dist) * speed]
        };
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [rangers.length]);

  useEffect(() => {
    if (monsters.length === 0) return;
    
    const interval = setInterval(() => {
      setMonsters(prev => prev.map(m => {
        const dx = m.target[0] - m.pos[0];
        const dy = m.target[1] - m.pos[1];
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 0.0001) {
          return {
            ...m,
            target: [m.pos[0] + (Math.random() - 0.5) * 0.01, m.pos[1] + (Math.random() - 0.5) * 0.01]
          };
        }
        
        const speed = 0.00002; // Slower than rangers
        return {
          ...m,
          pos: [m.pos[0] + (dx/dist) * speed, m.pos[1] + (dy/dist) * speed]
        };
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [monsters.length]);

  const proximity = useMemo(() => {
    if (!position || features.length === 0) return { isNearBaitShop: false, isNearTournament: false, isNearRanger: false, nearestWater: null };
    
    let isNearBaitShop = false;
    let isNearTournament = false;
    let isNearRanger = false;
    let nearestWater = null;
    let minWaterDist = Infinity;
    let urbanFeatureCount = 0;

    features.forEach(f => {
      const dist = getDistance(position[0], position[1], f.center[0], f.center[1]);
      
      if (f.type === 'bait_shop') urbanFeatureCount++;
      if (f.type === 'park') urbanFeatureCount++;
      
      if (f.type === 'bait_shop' && dist < 100) isNearBaitShop = true;
      if (f.type === 'park' && dist < 300) isNearTournament = true;
      
      if (f.type === 'water' || f.type === 'waterway') {
        if (dist < minWaterDist) {
          minWaterDist = dist;
          nearestWater = { feature: f, distance: dist };
        }
      }
    });

    rangers.forEach(r => {
      const dist = getDistance(position[0], position[1], r.pos[0], r.pos[1]);
      if (dist < 50) isNearRanger = true;
    });

    const locationType: 'urban' | 'rural' = urbanFeatureCount > 3 ? 'urban' : 'rural';

    return { isNearBaitShop, isNearTournament, isNearRanger, nearestWater, locationType };
  }, [position, features, rangers]);

  useEffect(() => {
    if (onProximityChange) {
      onProximityChange({
        isNearBaitShop: proximity.isNearBaitShop,
        isNearTournament: proximity.isNearTournament,
        isNearRanger: proximity.isNearRanger,
        locationType: proximity.locationType
      });
    }
  }, [proximity.isNearBaitShop, proximity.isNearTournament, proximity.isNearRanger, proximity.locationType, onProximityChange]);

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
        <MapEvents onMapClick={(lat, lng) => {
          const name = prompt("Enter a name for this fishing spot:");
          if (name) {
            onAddSpot?.({ lat, lng, name, type: 'custom' });
          }
        }} />
        
        {players.map(p => (
          p.location && (
            <Marker 
              key={p.id} 
              position={[p.location.lat, p.location.lng]} 
              icon={otherPlayerIcon(p.name, p.hasPassport)}
              eventHandlers={{
                click: () => onPlayerClick?.(p)
              }}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-gray-500">Level {p.level}</div>
                  {p.hasPassport && (
                    <div className="mt-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                      World Traveler
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        ))}
        
        {features.map(f => {
          if (f.type === 'bait_shop') {
            return (
              <Marker key={f.id} position={f.center} icon={baitShopIcon}>
                <Popup>
                  <div className="font-bold">Bait Shop (Gas Station)</div>
                  <div className="text-xs text-gray-500">Shop for lures, rods, and chum here!</div>
                </Popup>
              </Marker>
            );
          }
          if (f.type === 'park') {
            return (
              <Marker key={f.id} position={f.center} icon={parkIcon}>
                <Popup>
                  <div className="font-bold">{f.name || 'Public Park'}</div>
                  <div className="text-xs text-blue-500 font-bold">Tournament Zone Active!</div>
                </Popup>
              </Marker>
            );
          }
          return f.isPolygon ? (
            <Polygon 
              key={f.id} 
              positions={f.geometry} 
              pathOptions={{ className: 'flashing-water' }}
            >
              <Popup>{f.name || 'Water Body'}</Popup>
            </Polygon>
          ) : (
            <Polyline 
              key={f.id} 
              positions={f.geometry} 
              pathOptions={{ className: 'flashing-water' }}
            >
              <Popup>{f.name || 'Waterway'}</Popup>
            </Polyline>
          );
        })}

        {rangers.map(r => (
          <Marker key={`ranger-${r.id}`} position={r.pos} icon={rangerIcon}>
            <Popup>
              <div className="font-bold text-blue-700">Park Ranger</div>
              <div className="text-xs">Patrolling for fishing licenses.</div>
            </Popup>
          </Marker>
        ))}

        {monsters.map(m => (
          <Marker key={`monster-${m.id}`} position={m.pos} icon={monsterShadowIcon} interactive={false} />
        ))}

        {spots.map((spot, i) => (
          <Marker key={`spot-${i}`} position={[spot.lat, spot.lng]} icon={spotIcon}>
            <Popup>
              <div className="font-bold">{spot.name}</div>
              <div className="text-sm capitalize text-gray-600">{spot.type}</div>
            </Popup>
          </Marker>
        ))}

        {position && proximity.nearestWater && (
          <Polyline 
            positions={[position, proximity.nearestWater.feature.center]} 
            pathOptions={{ color: '#f59e0b', dashArray: '5, 10', weight: 3 }} 
          />
        )}
      </MapContainer>

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
          onClick={fetchFeatures}
          className="bg-blue-600 p-3 rounded-full shadow-lg text-white hover:bg-blue-500 relative"
          title="Scan Nearby"
        >
          {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Navigation size={24} />}
        </button>
      </div>
      
      {proximity.nearestWater && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[400] bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none">
          <Navigation size={16} className="text-blue-400" />
          <span className="font-bold">{Math.round(proximity.nearestWater.distance)}m</span>
          <span className="text-white/70 text-sm">to nearest water</span>
        </div>
      )}
    </div>
  );
}
