
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { GroundingChunk, RouteCoordinate, TrafficSegment, RouteStep, Landmark, ItineraryLocation, ItineraryRoute, Language } from '../types';
import { isRouteStep, isLandmark, isTrafficSegment, isItineraryLocation, isItineraryRoute, isRouteCoordinate } from '../utils/validation';

// Lazy initialization to prevent crash on module load if key is missing
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (ai) return ai;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;

  if (!apiKey) {
    console.error("Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file.");
    // Return null instead of throwing to prevent app crash on load, 
    // components should handle null client gracefully.
    throw new Error("API Key is missing. Please set VITE_GEMINI_API_KEY.");
  }

  ai = new GoogleGenAI({ apiKey });
  return ai;
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
          // Construct potential object and validate
          const potentialLoc = {
            name: args.name,
            description: args.description,
            lat: Number(args.lat),
            lng: Number(args.lng),
            time: args.time,
            duration: args.duration,
            sequence: Number(args.sequence)
          };

          if (isItineraryLocation(potentialLoc)) {
            locations.push(potentialLoc);
          }
        } else if (fc.name === 'line') {
          const potentialRoute = {
            name: args.name,
            start: { lat: Number(args.start?.lat), lng: Number(args.start?.lng) },
            end: { lat: Number(args.end?.lat), lng: Number(args.end?.lng) },
            transport: args.transport,
            travelTime: args.travelTime
          };

          if (isItineraryRoute(potentialRoute)) {
            lines.push(potentialRoute);
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
          steps = parsedJson.steps.filter(isRouteStep);
        }

        if (parsedJson.landmarks && Array.isArray(parsedJson.landmarks)) {
          landmarks = parsedJson.landmarks.filter(isLandmark);
        }

        if (parsedJson.traffic && Array.isArray(parsedJson.traffic)) {
          trafficSegments = parsedJson.traffic.filter(isTrafficSegment);
        }
        text = rawText.replace(jsonBlockRegex, '').trim();
      } catch (e) {
        console.error("Failed to parse or validate route JSON:", e);
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
      ? "OUTPUT MUST BE IN ODIA (ORIYA) SCRIPT."
      : "";

    // NEW PROMPT STRATEGY: Daily Briefing / Situation Report (SITREP)
    const prompt = `
            You are a kind, empathetic, and authoritative Hospital Guide for SCB Medical College, Cuttack.
            A patient or their relative is looking for the "Daily Situation Report" to navigate the campus.

            **YOUR TASK:**
            Search Google for the VERY LATEST updates (last 24 hours) from:
            1. Commissionerate Police Cuttack-Bhubaneswar (Traffic updates)
            2. Cuttack Municipal Corporation (CMC) or Collector Cuttack (Road works/Closures)
            3. SCB Medical College Official Notices (Hospital admin news)
            4. Local news (Weather, Strikes/Bandhs)
            
            ${langInstruction}

            **TONE:** 
            Kind, Clear, and Explanatory. Like a helpful volunteer speaking to a worried patient.
            Avoid "police jargon" or dry lists. Explain *what it means* for the patient.

            **STRUCTURE OF RESPONSE:**
            1. **Headline:** A 3-5 word summary of the current status (e.g., "Normal Traffic Flow Today" or "Heavy Rain Alert").
            2. **The Situation Report:** Write 2-3 sentences summarizing the key events. If there is a traffic diversion, explain *where* to go instead. 
            
            **CRITICAL RULES:**
            *   **NO FAKE NEWS:** If you find NO recent updates, state clearly: "We have checked with local authorities and there are no major incidents reported at this time."
            *   **NO BULLET POINTS:** Write in natural, comforting sentences.
            *   **INTEGRITY:** If you mention a specific road closure or event, ensure it is based on a real recent source.
        `;
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = extractTextSafe(response) || "No major alerts.";
    const groundingChunks: GroundingChunk[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, groundingChunks };
  } catch (error) {
    console.error("Error fetching local updates:", error);
    return { text: "Could not fetch local updates. Check connection.", groundingChunks: [] };
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

export const enhanceTrafficReport = async (text: string, language: Language): Promise<string> => {
  try {
    const client = getAI();
    const langInstruction = language === 'or'
      ? "The output MUST be in Odia (Oriya) language."
      : "The output MUST be in English.";

    const prompt = `
            A user has submitted a traffic report: "${text}".
            Rewrite this to be ultra-concise (under 10 words) for a dashboard ticker. 
            Do not add new facts.
            ${langInstruction}
        `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return extractTextSafe(response).trim();
  } catch (error) {
    console.error("Error enhancing report:", error);
    return text; // Fallback to original text
  }
};
