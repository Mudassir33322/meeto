import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Dynamic check for GEMINI_API_KEY
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY is not configured or is placeholder. Falling back to local/static responses for previews.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

app.use(express.json({ limit: "50mb" }));

// API endpoint to translate text
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ error: "Missing required fields: text, sourceLang, targetLang" });
    }

    if (sourceLang === targetLang) {
      return res.json({ translatedText: text });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Mock Fallback translation so the app still demonstrates functionality elegantly
      return res.json({
        translatedText: `[Translated from ${sourceLang} to ${targetLang}]: ${text}`,
        isMock: true
      });
    }

    const prompt = `You are a real-time speech translation assistant. 
Translate the following speaker transcript from ${sourceLang} into ${targetLang}.
Preserve the tone, directness, and meaning completely.
Provide ONLY the translated text inside your response. Do NOT add any extra commentary, greetings, explanation, or quotes.

Original Speaker Text:
"${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    const translatedText = response.text ? response.text.trim().replace(/^"|"$/g, '') : text;
    res.json({ translatedText });
  } catch (error: any) {
    console.error("Translation API error:", error);
    res.status(500).json({ error: error.message || "Translation failed" });
  }
});

// API endpoint to summarize a meeting and build automated structured notes
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript, duration, languages } = req.body;
    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: "Invalid or missing transcript format" });
    }

    const transcriptText = transcript
      .map((entry: any) => `[${entry.time}] ${entry.user} (${entry.lang}): ${entry.text}`)
      .join("\n");

    const ai = getGeminiClient();
    if (!ai) {
      // Provide a beautiful mock review report so the workspace looks gorgeous even when key is missing/unconfigured
      const mockResult = {
        summary: "This meeting centered on coordinate syncing, task delegation, and cross-cultural translation alignments. The team successfully tested bidirectional translations and whiteboard mock structures.",
        topics: [
          { id: "1", title: "Real-time Voice Translation Validation", details: "Tested lag-free speech synthesizers and recognition overrides between regional dialects." },
          { id: "2", title: "Whiteboard Planning & Diagramming", details: "Outlined visual wireframes for layout structures and architectural boundaries." }
        ],
        actionItems: [
          { id: "a1", description: "Verify audio packet rates on low-bandwidth setups", owner: "User A" },
          { id: "a2", description: "Export formatted PDF/Word documents to review committees", owner: "User B" }
        ],
        decisions: [
          "Adopt high-contrast themes as visual anchors to improve user focus.",
          "Enable dual audio channel recordings to facilitate review replays."
        ],
        isMock: true
      };
      return res.json(mockResult);
    }

    const prompt = `You are an executive meeting recorder assistant. Analyze the meeting transcript, duration, and context provided to produce a polished executive summary and actionable notes in JSON format.

Meeting Stats:
- Duration: ${duration || "Unknown"}
- Language Environment: ${languages ? languages.join(", ") : "Multilingual"}

Transcript:
${transcriptText || "No lines recorded."}

Provide a JSON object response with the following keys and structures:
1. "summary" (string) - A professional, cohesive executive summary of the meeting.
2. "topics" (array of objects with "id", "title" and "details" strings) - The primary conversation threads and discussion topics.
3. "actionItems" (array of objects with "id", "description" and "owner" strings) - Specific tasks assigned, with owners.
4. "decisions" (array of strings) - Key conclusions, policies, or agreements reached in the meeting.

Your response MUST be strict JSON matching the schema format. Give only JSON, no wrapping in markdown tags beyond possibly standard json blocks if required, but preferable to use standard JSON output configuration.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A professional executive summary paragraph of the meeting." },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING, description: "Title of the conversation topic." },
                  details: { type: Type.STRING, description: "Detailed description of what was argued or decided during this topic." }
                },
                required: ["id", "title", "details"]
              }
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING, description: "What needs to be done." },
                  owner: { type: Type.STRING, description: "The person responsible (or 'Unassigned')." }
                },
                required: ["id", "description", "owner"]
              }
            },
            decisions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "topics", "actionItems", "decisions"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No output generated from Gemini API");
    }

    const notes = JSON.parse(textResult.trim());
    res.json(notes);
  } catch (error: any) {
    console.error("Summarization API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate meeting summary" });
  }
});

// Interface for peer-to-peer room data
interface RoomMember {
  id: string;
  name: string;
  langCode: string;
  isMuted: boolean;
  isCameraOn: boolean;
  raisedHand: boolean;
  lastActive: number;
  isScreenActive: boolean;
}

interface RoomSignal {
  id: string;
  from: string;
  to: string;
  data: any;
  timestamp: number;
}

interface RoomDetails {
  name: string;
  whiteboard: string;
  members: { [id: string]: RoomMember };
  signals: { [memberId: string]: RoomSignal[] };
  transcript: any[];
  files: any[];
  updatedAt: number;
}

// In-memory reliable storage for real-time channels
const activeRooms: { [roomName: string]: RoomDetails } = {};

const getOrCreateRoom = (roomName: string): RoomDetails => {
  const normName = roomName.trim().toLowerCase();
  if (!activeRooms[normName]) {
    activeRooms[normName] = {
      name: roomName,
      whiteboard: "",
      members: {},
      signals: {},
      transcript: [],
      files: [],
      updatedAt: Date.now()
    };
  }
  return activeRooms[normName];
};

// Periodic keepalive garbage collection for disconnected peers
setInterval(() => {
  const now = Date.now();
  Object.keys(activeRooms).forEach((roomName) => {
    const room = activeRooms[roomName];
    let liveCount = 0;
    Object.keys(room.members).forEach((memberId) => {
      const mbr = room.members[memberId];
      // If no hearthbeat for 12 seconds, peer is assumed disconnected
      if (now - mbr.lastActive > 12000) {
        delete room.members[memberId];
        delete room.signals[memberId];
      } else {
        liveCount++;
      }
    });
    if (liveCount === 0 && now - room.updatedAt > 3600 * 1000) {
      delete activeRooms[roomName];
    }
  });
}, 8000);

// API 1: Retrieve complete synced room data
app.get("/api/room/:roomName", (req, res) => {
  const room = getOrCreateRoom(req.params.roomName);
  res.json({
    name: room.name,
    whiteboard: room.whiteboard,
    members: Object.values(room.members),
    transcript: room.transcript,
    files: room.files
  });
});

// API 2: Register user or send continuous keepalive heartbeat/settings update
app.post("/api/room/:roomName/join", (req, res) => {
  const room = getOrCreateRoom(req.params.roomName);
  const { id, name, langCode, isMuted, isCameraOn, raisedHand, isScreenActive } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing member identity ID" });
  }

  room.members[id] = {
    id,
    name: name || "Anonymous Delegate",
    langCode: langCode || "English",
    isMuted: !!isMuted,
    isCameraOn: !!isCameraOn,
    raisedHand: !!raisedHand,
    lastActive: Date.now(),
    isScreenActive: !!isScreenActive
  };
  room.updatedAt = Date.now();

  res.json({
    success: true,
    members: Object.values(room.members),
    transcript: room.transcript,
    files: room.files,
    whiteboard: room.whiteboard
  });
});

// API 3: Explicitly exit delegation meeting
app.post("/api/room/:roomName/leave", (req, res) => {
  const room = getOrCreateRoom(req.params.roomName);
  const { id } = req.body;
  if (id) {
    delete room.members[id];
    delete room.signals[id];
    room.updatedAt = Date.now();
  }
  res.json({ success: true });
});

// API 4: Sync drawing whiteboard modifications
app.post("/api/room/:roomName/whiteboard", (req, res) => {
  const room = getOrCreateRoom(req.params.roomName);
  const { whiteboard } = req.body;
  room.whiteboard = whiteboard || "";
  room.updatedAt = Date.now();
  res.json({ success: true, whiteboard: room.whiteboard });
});

// API 5: Post transcript sentence additions
app.post("/api/room/:roomName/transcript", (req, res) => {
  const room = getOrCreateRoom(req.params.roomName);
  const { entry } = req.body;
  if (entry) {
    // Avoid double inserts
    if (!room.transcript.some(t => t.id === entry.id)) {
      room.transcript.push(entry);
    }
  }
  room.updatedAt = Date.now();
  res.json({ success: true, transcript: room.transcript });
});

// API 6: Sync shared uploaded documents
app.post("/api/room/:roomName/files", (req, res) => {
  const room = getOrCreateRoom(req.params.roomName);
  const { file } = req.body;
  if (file) {
    if (!room.files.some(f => f.id === file.id)) {
      room.files.push(file);
    }
  }
  room.updatedAt = Date.now();
  res.json({ success: true, files: room.files });
});

// API 7: WebRTC signaling mailbox - Post SDP Offers, SDP Answers, ICE Candidates from peer
app.post("/api/room/:roomName/signals", (req, res) => {
  const room = getOrCreateRoom(req.params.roomName);
  const { from, to, data } = req.body;

  if (!from || !to || !data) {
    return res.status(400).json({ error: "Invalid signaling payload values" });
  }

  if (!room.signals[to]) {
    room.signals[to] = [];
  }

  room.signals[to].push({
    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    from,
    to,
    data,
    timestamp: Date.now()
  });

  res.json({ success: true });
});

// API 8: Poll inbound signaling mailbox
app.get("/api/room/:roomName/signals/:memberId", (req, res) => {
  const room = getOrCreateRoom(req.params.roomName);
  const memberId = req.params.memberId;
  const pending = room.signals[memberId] || [];
  
  // Clean mailbox once retrieved
  room.signals[memberId] = [];
  res.json({ signals: pending });
});

// Configure Vite middleware in development
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
