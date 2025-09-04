import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { generateSpeech, getVoices } from "./service.js";
import { getAndSetProxyEnvironment } from "./sys_proxy.js";

const server = new Server(
  {
    name: "tts-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Get settings from environment
const settings = {
  apiKey: process.env.GOOGLE_API_KEY,
  nameModel: process.env.GOOGLE_NAME_MODEL || 'gemini-2.0-flash',
  ttsEngine: process.env.GOOGLE_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
  voiceChoice: process.env.GOOGLE_VOICE || 'Kore',
  speechStyle: 'Generate this audio in a formal, clear, and objective news-reporting style',
};

// Tool: google_tts_generate
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "google_tts_generate") {
    const { content, directory: directory = process.cwd(), voice = settings.voiceChoice } = request.params.arguments as {
      content: string;
      directory?: string;   // Optional property
      voice?: string;  // Optional property
    };

    try {
      const savedPath = await generateSpeech(content, voice, directory, settings);
      return {
        content: [{ type: "text", text: savedPath }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "get_google_tts_voices") {
    try {
      const { count } = request.params.arguments as {
        count?: number;
      };
      let voices = await getVoices();
      if (count !== undefined && count > 0) {
        voices = voices.slice(0, count);
      }
      return {
        content: [{ type: "text", text: JSON.stringify(voices) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  return {
    content: [{ type: "text", text: "Tool not found" }],
    isError: true,
  };
});

// Tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "google_tts_generate",
        description: "Generate TTS audio from text content",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The text content to convert to speech" },
            directory: { type: "string", description: "Directory to save the audio file (Default: current directory)" },
            voice: { type: "string", description: "Voice to use for TTS (Default: Kore)" },
          },
          required: ["content"],
        },
      },
      {
        name: "get_google_tts_voices",
        description: "Get list of available TTS voices",
        inputSchema: {
          type: "object",
          properties: {
            count: { type: "number", description: "Number of voices to return (0 for all)" },
          },
          required: [],
        },
      },
    ],
  };
});

async function main() {
  getAndSetProxyEnvironment();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TTS MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
