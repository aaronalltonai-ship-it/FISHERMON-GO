import { GoogleGenAI, Type, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSpeech(text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Zephyr') {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  return null;
}

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
    model: 'gemini-2.5-flash-lite',
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
          price: { type: Type.NUMBER, description: "Value of the fish in coins based on rarity and size. Common: 500-1500, Uncommon: 1500-5000, Rare: 5000-15000, Epic: 15000-50000, Legendary: 50000-250000." }
        },
        required: ["name", "description", "rarity", "weightKg", "lengthCm", "color", "price"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
}

export async function generateMonsterStats(waterType: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: `Generate a MYTHICAL, GIGANTIC sea monster or lake monster that might be found in a ${waterType}. This is a "Boss" fish. It should be terrifying and huge. Assign it the rarity 'MONSTER'.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The name of the monster (e.g., 'The Kraken', 'Nessie', 'The Deep Lurker')." },
          description: { type: Type.STRING, description: "A terrifying description." },
          rarity: { type: Type.STRING, description: "Must be 'MONSTER'." },
          weightKg: { type: Type.NUMBER, description: "Massive weight (e.g., 5000-50000 kg)." },
          lengthCm: { type: Type.NUMBER, description: "Massive length (e.g., 1000-5000 cm)." },
          color: { type: Type.STRING, description: "A hex color code." },
          price: { type: Type.NUMBER, description: "Value: 500,000 - 2,500,000 coins." }
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
      model: 'gemini-3.1-flash-image-preview',
      contents: `A cinematic, highly detailed 3D render of a ${fishName} jumping out of ${waterType}. The fish has vibrant ${color} scales with glowing bioluminescent trails. Action-packed scene with water splashes, bubbles, and dynamic lighting. 4k resolution, Unreal Engine 5 style, white background for easy compositing.`,
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
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

export async function generatePresetVideos(waterType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `A school of realistic fish swimming underwater in ${waterType}. Clear water, cinematic lighting, realistic movements. Pure white background for easy background removal. The fish should be swimming across the frame.`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  return operation;
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

export async function generateFishVideo(fishName: string, waterType: string, color: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `An action-packed, cinematic 3D video of a ${fishName} fighting against a fishing line in ${waterType}. The fish has ${color} scales that shimmer with glowing trails. Lots of bubbles, water turbulence, and dynamic movement. High quality, 3D animation style, realistic water physics. The fish is the central subject, swimming aggressively.`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  return operation;
}

export async function pollVideoOperation(operation: any) {
  let currentOp = operation;
  while (!currentOp.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    currentOp = await ai.operations.getVideosOperation({ operation: currentOp });
  }
  return currentOp;
}

export async function getDownloadUrl(downloadLink: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey || '',
    },
  });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
