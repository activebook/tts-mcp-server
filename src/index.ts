#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { generateSpeech, getVoices, getVoiceStyleTemplates } from "./service.js";
import { getAndSetProxyEnvironment } from "./sys_proxy.js";

const server = new McpServer(
  {
    name: "tts-mcp-server",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Get settings from environment
const settings = {
  apiKey: process.env.GOOGLE_API_KEY,
  nameModel: process.env.GOOGLE_NAME_MODEL || 'gemini-2.0-flash',
  ttsEngine: process.env.GOOGLE_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
  voiceChoice: process.env.GOOGLE_VOICE || 'Kore',
};


// Resource templates
server.resource("Voice style template", new ResourceTemplate('tts://voice-styles/{style_name}', { list: undefined }), async (uri, variables) => {
  const styleName = variables.style_name[0];
  const templates = getVoiceStyleTemplates();

  if (!templates[styleName]) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Voice style '${styleName}' not found`
    );
  }

  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(templates[styleName], null, 2),
      },
    ],
  };
});



// Tools
server.tool("google_tts_generate", "Generate TTS audio from text content", {
  content: z.string().describe("The text content to convert to speech"),
  directory: z.string().optional().describe("Directory to save the audio file (Default: current directory)"),
  voice: z.string().optional().describe("Voice to use for TTS (Default: Kore)"),
  style: z.string().optional().describe("Voice style - either a style name (e.g., 'news_anchor') or custom style text"),
}, async (args) => {
  const { content, directory = process.cwd(), voice = settings.voiceChoice, style = "news_anchor" } = args;
  try {
    const savedPath = await generateSpeech(content, voice, directory, style, settings);
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
});

server.tool("get_google_tts_voices", "Get list of available TTS voices", {
  count: z.number().optional().describe("Number of voices to return (0 for all)"),
}, async (args) => {
  const { count } = args;
  try {
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
});

server.tool("get_voice_styles", "Get list of available voice styles", {
  detail: z.boolean().optional().describe("Whether to show voice style detail (Default: false)"),
}, async (args) => {
  const { detail = false } = args;
  try {
    const templates = getVoiceStyleTemplates();
    if (!detail) {
      for (const key in templates) {
        if (templates[key] && typeof templates[key] === 'object') {
          delete templates[key].prompt;
        }
      }
    }
    return {
      content: [{ type: "text", text: JSON.stringify(templates) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Register voice style prompts
function registerVoiceStylePrompts() {
  const templates = getVoiceStyleTemplates();

  for (const [styleName, styleData] of Object.entries(templates)) {
    if (styleData && typeof styleData === 'object' && 'prompt' in styleData && 'description' in styleData) {
      const style = styleData as { prompt: string; description: string };

      server.prompt(styleName, style.description, async () => {
        return {
          description: `${styleName}: ${style.description}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: style.prompt,
              },
            },
          ],
        };
      });
    }
  }
}

async function main() {
  // Set proxy environment
  getAndSetProxyEnvironment();
  // Register all voice style prompts
  registerVoiceStylePrompts();
  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TTS MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
