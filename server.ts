import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3001;

// Set high limits for JSON payload to accommodate base64 image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Lazy initializer for Gemini client to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Analyze image endpoint (Phase 1)
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: "Missing image data or mimeType." });
    }

    // Clean base64 string
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: `You are an expert AI Character Designer and Multimodal Analyst. 
          Analyze this photo of a user in-depth to help create their highly accurate "AI Clone" or "Digital Twin".
          Provide a highly detailed, professional, and accurate breakdown in the following JSON format:
          {
            "appearance": "Physical appearance, style, and clothing aesthetic. Describe specific details such as glasses, hairstyle, clothing style, colors, and accessories.",
            "vibe": "Facial expressions, micro-expressions, vibe, and overall mood/energy (e.g., confident, tech-savvy, warm, professional, relaxed, introverted/extroverted hints).",
            "posture": "Posture, body language, framing (e.g., close-up, bust, full body), and what it communicates about their presence.",
            "summary": "A cohesive summary of the personality type, professional archetype, and aesthetic aura they project."
          }
          Ensure your output is strictly valid JSON matching this schema.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            appearance: { type: Type.STRING },
            vibe: { type: Type.STRING },
            posture: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ["appearance", "vibe", "posture", "summary"],
        }
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image." });
  }
});

// 2. Generate customized system prompt (Phase 2)
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { answers, visualProfile } = req.body;
    if (!answers) {
      return res.status(400).json({ error: "Missing personality answers." });
    }

    const ai = getGeminiClient();

    const promptText = `
      You are an elite Character Psychologist and System Prompt Architect. 
      Your task is to synthesize user details and visual analysis into an absolute masterpiece of a System Prompt for their AI Clone (Digital Twin).
      
      Here are the inputs:
      [USER ANSWERS]
      - Core Personality Traits (Humor, Intellect, Intro/Extroversion, Energy): ${answers.personality || "Not specified"}
      - Catchphrases, Slang & Vocabulary Speaking Style: ${answers.style || "Not specified"}
      - Knowledge Base, Expertise & Hobbies (Fields they love discussing): ${answers.interests || "Not specified"}
      - Behavioral Rules & Boundary Constraints (How they react when roasted, happy, or asked deep tech questions): ${answers.behavior || "Not specified"}
      
      [VISUAL PROFILE ANALYSIS]
      ${visualProfile ? JSON.stringify(visualProfile) : "No visual profile uploaded yet."}
      
      Draft a comprehensive, highly operationalized System Prompt. It MUST instruct the AI to perfectly emulate the user's speaking style, intellect, humor, and visual vibe.
      The System Prompt must include:
      1. Role & Identity Statement (Who are they, including background and visual vibe).
      2. Persona, Tone & Speaking Guidelines (Specific slang, pacing, humor style, punctuation, capitalization preference - e.g. lower-case only, use of emojis, or high punctuation).
      3. Knowledge & Boundaries (What they are an expert in, and how they handle off-topic or roasting).
      4. Behavior Patterns (Exact response templates or behavioral triggers).
      
      Provide your output in this JSON format:
      {
        "systemPrompt": "The full, ready-to-use System Prompt text block.",
        "headline": "A catchy one-liner title describing this persona (e.g., 'The Sarcastic Rust Developer' or 'The Warm Creative Strategist').",
        "description": "A 2-sentence description summarizing the clone's personality."
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            systemPrompt: { type: Type.STRING },
            headline: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["systemPrompt", "headline", "description"],
        }
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Error generating system prompt:", error);
    res.status(500).json({ error: error.message || "Failed to generate system prompt." });
  }
});

// 3. Chat with AI Clone (Phase 4)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemPrompt, visualProfile } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages history must be provided as an array." });
    }

    const ai = getGeminiClient();

    // Map conversation history to Gemini parts
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    // Generate final system instruction
    const baseSystemInstruction = systemPrompt || "You are a helpful AI Clone.";
    const enrichedSystemInstruction = `${baseSystemInstruction}\n\nIMPORTANT: You are speaking as the digital twin. Keep responses aligned to your personality, speaking rate, vocabulary, and humor. Avoid breaking character. Your visual profile looks like: ${visualProfile ? JSON.stringify(visualProfile) : "an elegant digital representation."}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: enrichedSystemInstruction,
        temperature: 0.8,
        topP: 0.95,
        responseModalities: ["TEXT", "AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede"
            }
          }
        }
      }
    });

    let textContent = "";
    let audioBase64 = "";
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) textContent += part.text;
      if (part.inlineData && part.inlineData.data) {
        audioBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    if (!textContent) {
      try { textContent = response.text; } catch(e) {}
    }

    res.json({ 
      content: textContent || "I'm processing that, but couldn't formulate a text response.",
      audio: audioBase64
    });
  } catch (error: any) {
    console.error("Error during clone chat:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response." });
  }
});

// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
