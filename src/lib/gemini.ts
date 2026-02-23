import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function detectWater(base64Image: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      },
      {
        text: 'Is there a body of water (lake, river, ocean, pond, puddle, pool, etc.) in this image? Respond with JSON.'
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasWater: { type: Type.BOOLEAN, description: "True if any body of water is visible." },
          waterType: { type: Type.STRING, description: "The type of water body, e.g., 'lake', 'puddle', 'ocean', 'river', or 'none'." }
        },
        required: ["hasWater", "waterType"]
      }
    }
  });
  
  return JSON.parse(response.text || '{"hasWater": false, "waterType": "none"}');
}

export async function generateFishStats(waterType: string, lure: string, bait: string, boat: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a REAL-WORLD fish species that might be found in a ${waterType}. The player is using a ${lure} lure and ${bait} bait, fishing from a ${boat}. Make it realistic. Assign a rarity based on how hard it is to catch (Common, Uncommon, Rare, Epic, Legendary).`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The real name of the fish." },
          description: { type: Type.STRING, description: "A short, realistic description." },
          rarity: { type: Type.STRING, description: "One of: Common, Uncommon, Rare, Epic, Legendary." },
          weightKg: { type: Type.NUMBER, description: "Realistic weight in kg." },
          lengthCm: { type: Type.NUMBER, description: "Realistic length in cm." },
          color: { type: Type.STRING, description: "A hex color code representing the fish's primary color." },
          price: { type: Type.NUMBER, description: "Value of the fish in coins based on rarity and size. Common: 10-50, Uncommon: 50-200, Rare: 200-1000, Epic: 1000-5000, Legendary: 5000-50000." }
        },
        required: ["name", "description", "rarity", "weightKg", "lengthCm", "color", "price"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
}

export async function generateFishImage(fishName: string, waterType: string, color: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `A realistic 2D game asset of a real fish called ${fishName}, found in ${waterType}. The primary color is ${color}. High quality, vibrant colors, white background, single subject, centered.`,
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (err) {
    console.error("Failed to generate image:", err);
  }
  return null;
}

export async function findNearbyFishingSpots(lat: number, lng: number) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Find nearby lakes, rivers, ponds, beaches, or good fishing spots.",
    config: {
      tools: [{googleMaps: {}}],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      }
    }
  });
  
  const text = response.text;
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return { text, chunks };
}
