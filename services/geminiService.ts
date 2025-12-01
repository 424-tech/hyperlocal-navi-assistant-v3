
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { GroundingChunk, RouteCoordinate, TrafficSegment, RouteStep, Landmark, ItineraryLocation, ItineraryRoute, Language } from '../types';

// Lazy initialization to prevent crash on module load if key is missing
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (ai) return ai;
  
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set API_KEY in your .env file or deployment settings.");
  }
  
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai;
};

// --- STRICT SANITIZATION HELPERS ---
const validateNumber = (val: any): number | null => {
    const num = Number(val);
    if (isNaN(num)) return null;
    return num;
};

const validateCoord = (lat: any, lng: any): {lat: number, lng: number} | null => {
    const vLat = validateNumber(lat);
    const vLng = validateNumber(lng);
    
    if (vLat === null || vLng === null) return null;
    // Basic strict bounds checking (Latitude -90 to 90, Longitude -180 to 180)
    if (Math.abs(vLat) > 90 || Math.abs(vLng) > 180) return null;
    
    return { lat: vLat, lng: vLng };
};

// --- Function Declarations for Day Planner ---

const locationFunctionDeclaration: FunctionDeclaration = {
  name: 'location',
  parameters: {
    type: Type.OBJECT,
    description: 'Geographic coordinates of a location on the SCB Medical College Campus.',
    properties: {
      name: { type: Type.STRING, description: 'Name of the location.' },
      description: { type: Type.STRING, description: 'Description of activity at this location.' },
      lat: { type: Type.NUMBER, description: 'Latitude of the location.' },
      lng: { type: Type.NUMBER, description: 'Longitude of the location.' },
      time: { type: Type.STRING, description: 'Time of day to visit (e.g., "09:00").' },
      duration: { type: Type.STRING, description: 'Duration of stay (e.g., "45 minutes").' },
      sequence: { type: Type.NUMBER, description: 'Order in the day itinerary (1 = first stop).' },
    },
    required: ['name', 'description', 'lat', 'lng'],
  },
};

const lineFunctionDeclaration: FunctionDeclaration = {
  name: 'line',
  parameters: {
    type: Type.OBJECT,
    description: 'Connection between two locations.',
    properties: {
      name: { type: Type.STRING, description: 'Name of the route segment.' },
      start: {
        type: Type.OBJECT,
        properties: {
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
        },
      },
      end: {
        type: Type.OBJECT,
        properties: {
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
        },
      },
      transport: { type: Type.STRING, description: 'Mode of transport (Walking, Wheelchair, etc.).' },
      travelTime: { type: Type.STRING, description: 'Estimated travel time.' },
    },
    required: ['name', 'start', 'end'],
  },
};

// Helper to extract text from a response without triggering SDK warnings about function calls
const extractTextSafe = (response: any): string => {
    let text = "";
    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                text += part.text;
            }
        }
    }
    return text;
};

export const isScbCampusLocation = async (location: string): Promise<boolean> => {
  try {
    const client = getAI();
    const prompt = `Based on your knowledge, is the location "${location}" part of, or inside, the SCB Medical College & Hospital campus in Cuttack, India? Answer with a single word: "yes" or "no".`;
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = extractTextSafe(response).trim().toLowerCase();
    return text.includes("yes");
  } catch (error) {
    console.error("Error checking location context:", error);
    return true; 
  }
};

export const planDayItinerary = async (promptText: string, language: Language = 'en') => {
  try {
    const client = getAI();
    const langInstruction = language === 'or' 
        ? "IMPORTANT: Provide all names, descriptions, and summaries in Odia (Oriya) language. The user speaks Odia." 
        : "";

    const systemInstructions = `
      You are an expert Day Planner for the SCB Medical College & Hospital Campus in Cuttack.
      Your goal is to create a logical, sequential day plan for a user visiting the campus (e.g., for treatment, visiting a student, or medical formalities).
      
      ${langInstruction}

      **Constraints:**
      1. All coordinates MUST be strictly within the campus bounds: Latitude ~20.478 to 20.486, Longitude ~85.872 to 85.883.
      2. If the user asks for something outside the campus, politely explain you only cover the campus area.
      3. Use the 'location' tool to mark stops with times and sequence numbers.
      4. Use the 'line' tool to connect these stops.
      5. Create a realistic schedule (walking times, waiting times at OPDs).
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction: systemInstructions,
        temperature: 0.5,
        tools: [
          {
            functionDeclarations: [
              locationFunctionDeclaration,
              lineFunctionDeclaration,
            ],
          },
        ],
      },
    });

    const locations: ItineraryLocation[] = [];
    const lines: ItineraryRoute[] = [];
    
    // Parse function calls from the response safely
    if (response.functionCalls) {
        for (const fc of response.functionCalls) {
            const args = fc.args as any;
            if (!args) continue;

            if (fc.name === 'location') {
                const coord = validateCoord(args.lat, args.lng);
                if (coord) {
                    locations.push({
                        name: args.name || "Location",
                        description: args.description || "",
                        lat: coord.lat,
                        lng: coord.lng,
                        time: args.time,
                        duration: args.duration,
                        sequence: validateNumber(args.sequence) || 0
                    });
                }
            } else if (fc.name === 'line') {
                const start = validateCoord(args.start?.lat, args.start?.lng);
                const end = validateCoord(args.end?.lat, args.end?.lng);
                
                if (start && end) {
                    lines.push({
                        name: args.name || "Route",
                        start: start,
                        end: end,
                        transport: args.transport,
                        travelTime: args.travelTime
                    });
                }
            }
        }
    }
    
    const summaryText = extractTextSafe(response);

    // Sort locations by sequence
    locations.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    return { locations, lines, summaryText };

  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw error;
  }
};

export const planRoute = async (start: string, destination: string, notes: string, location: { latitude: number; longitude: number; } | null, language: Language = 'en') => {
  try {
    const client = getAI();
    const langInstruction = language === 'or' 
        ? "IMPORTANT: Provide all step descriptions, landmarks names, traffic descriptions, and the final summary in Odia (Oriya) language. The user speaks Odia." 
        : "";

    const prompt = `
      You are a hyperlocal navigation expert for the SCB Medical College campus in Cuttack, India. Your primary function is to provide detailed, step-by-step navigation *within this campus*.
      A user needs directions from "${start}" to "${destination}".
      
      ${langInstruction}

      **IMPORTANT CONTEXT CHECK:**
      1.  **If the route is within the SCB campus:** Proceed to generate a detailed, interactive route plan. The user will be viewing a specific digital map of the campus, so your directions must be precise and reference landmarks visible on that map. The JSON output is critical.
      2.  **If the start or destination is clearly outside the SCB campus (e.g., "Bhubaneswar Airport", another city, etc.):** You MUST respond differently. First, state clearly that your expertise is limited to the SCB campus and you cannot provide an interactive map for their requested route. Then, provide general, high-level text-based directions for their query. In this specific case, the JSON object you generate MUST have empty arrays for "steps", "landmarks", and "traffic".

      The user has provided these notes: "${notes}".
      Current user location is approximately latitude: ${location?.latitude}, longitude: ${location?.longitude}.
      
      **JSON Object Specification (ONLY FOR ON-CAMPUS ROUTES):**
      The JSON object MUST be in a fenced code block and have the following structure. If the route is off-campus, this object must contain empty arrays as specified above.
      {
        "steps": [
          {
            "description": "A short, clear instruction for this step. e.g., 'Walk from the main gate towards the Department of Surgery.'",
            "path": [{"lat": 20.481, "lng": 85.876}, {"lat": 20.482, "lng": 85.877}]
          }
        ],
        "landmarks": [
          {
            "name": "A key landmark mentioned in the steps. e.g., 'Department of Surgery SCB'",
            "position": {"lat": 20.482, "lng": 85.877}
          }
        ],
        "traffic": [
          {
            "level": "moderate",
            "description": "Reason for congestion. e.g., 'Crowded near OPD building.'",
            "path": [{"lat": 20.482, "lng": 85.877}, {"lat": 20.4825, "lng": 85.8775}]
          }
        ]
      }

      **GUIDELINES (ONLY FOR ON-CAMPUS ROUTES):**
      1.  **Steps**: Break the route into small, logical steps. Each step must have a clear 'description' and a 'path' with an array of coordinates. The path for one step should connect to the next.
      2.  **Landmarks**: Identify key landmarks (e.g., 'Department of Surgery SCB', 'Overhead Water Tank', 'College of Nursing') and provide their precise coordinates in the 'landmarks' array. This is crucial for plotting them on the map.
      3.  **Coordinates**: All coordinates MUST fall within the approximate bounds of the SCB campus (latitude ~20.478 to 20.486, longitude ~85.872 to 85.883).
      4.  **Traffic**: Use your knowledge and tools to identify potential areas of congestion (e.g., near the main entrance, outpatient departments) and add them to the 'traffic' array.
      
      After the JSON block, provide a summary of the route in Markdown. For off-campus routes, this summary will be your main response.
    `;
    const response = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16384 },
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
        toolConfig: location ? {
            retrievalConfig: {
                latLng: {
                    latitude: location.latitude,
                    longitude: location.longitude
                }
            }
        } : undefined
      },
    });

    const rawText = extractTextSafe(response);
    let steps: RouteStep[] = [];
    let landmarks: Landmark[] = [];
    let trafficSegments: TrafficSegment[] = [];
    let text = rawText;

    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = rawText.match(jsonBlockRegex);

    if (match && match[1]) {
      try {
        const parsedJson = JSON.parse(match[1]);
        if (parsedJson.steps && Array.isArray(parsedJson.steps)) {
          // STRICT VALIDATION FOR STEPS with Optional Chaining
          steps = parsedJson.steps.map((step: any) => ({
              description: step.description || "Move to next point",
              path: Array.isArray(step.path) 
                ? step.path.map((p: any) => validateCoord(p?.lat, p?.lng)).filter((p: any) => p !== null) 
                : []
          })).filter((step: RouteStep) => step.path.length > 0);
        }
        
        if (parsedJson.landmarks && Array.isArray(parsedJson.landmarks)) {
          // STRICT VALIDATION FOR LANDMARKS
          landmarks = parsedJson.landmarks.map((lm: any) => ({
              name: lm.name || "Landmark",
              position: validateCoord(lm.position?.lat, lm.position?.lng)
          })).filter((lm: any) => lm.position !== null);
        }

        if (parsedJson.traffic && Array.isArray(parsedJson.traffic)) {
           // STRICT VALIDATION FOR TRAFFIC with Optional Chaining
           trafficSegments = parsedJson.traffic.map((t: any) => ({
               level: t.level || 'moderate',
               description: t.description || 'Traffic info',
               path: Array.isArray(t.path)
                ? t.path.map((p: any) => validateCoord(p?.lat, p?.lng)).filter((p: any) => p !== null)
                : []
           })).filter((t: TrafficSegment) => t.path.length > 1);
        }
        text = rawText.replace(jsonBlockRegex, '').trim();
      } catch (e) {
        console.error("Failed to parse route JSON from response:", e);
      }
    }

    const groundingChunks: GroundingChunk[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { text, groundingChunks, steps, landmarks, trafficSegments };
  } catch (error) {
    console.error("Error planning route:", error);
    return { text: "Sorry, I couldn't plan a route. Check your API Key.", groundingChunks: [], steps: [], landmarks: [], trafficSegments: [] };
  }
};

export const getLocalUpdates = async (location: { latitude: number; longitude: number; } | string | null, language: Language = 'en') => {
    try {
        const client = getAI();
        let locationContext = '';
        if (typeof location === 'string' && location.trim() !== '') {
            locationContext = `in the area around "${location}"`;
        } else if (typeof location === 'object' && location?.latitude && location.longitude) {
            locationContext = `around latitude: ${location.latitude}, longitude: ${location.longitude}`;
        } else {
            locationContext = 'in the general Cuttack area';
        }

        const langInstruction = language === 'or' 
            ? "Summarize the updates in Odia (Oriya) language." 
            : "";

        const prompt = `
            Find the latest news about traffic, road closures, public events, or market days ${locationContext}. 
            Provide a concise summary of the key updates that could affect local travel.
            ${langInstruction}
        `;
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        const text = extractTextSafe(response) || "No updates found.";
        const groundingChunks: GroundingChunk[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        return { text, groundingChunks };
    } catch (error) {
        console.error("Error fetching local updates:", error);
        return { text: "Could not fetch local updates. Please check your API Key and connection.", groundingChunks: [] };
    }
};

let chatInstance: Chat | null = null;
let currentChatLanguage: Language = 'en';

export const startChat = (language: Language = 'en'): Chat => {
    const client = getAI();
    // If language changed, create new instance to reset system instruction
    if (!chatInstance || currentChatLanguage !== language) {
        currentChatLanguage = language;
        const langInstruction = language === 'or' 
            ? "You MUST reply in Odia (Oriya) language." 
            : "";
            
        chatInstance = client.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `You are a helpful assistant for the Hyperlocal Navi-Assistant app. Answer questions about navigation, local places, or general topics concisely. ${langInstruction}`,
            },
        });
    }
    return chatInstance;
};

export const sendMessageToChat = async (chat: Chat, message: string) => {
    try {
        const response = await chat.sendMessageStream({ message });
        return response; 
    } catch (error) {
        console.error("Error sending message to chat:", error);
        throw new Error("Failed to get a response from the assistant. Check API Key.");
    }
};
