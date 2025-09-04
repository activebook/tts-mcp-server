import { GoogleGenAI } from "@google/genai";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import wav from "wav";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function saveWaveFile(
  filename: string,
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });
    writer.on('finish', resolve);
    writer.on('error', reject);
    writer.write(pcmData);
    writer.end();
  });
}

async function generateSpeech(text: string, voice: string, directory: string, style?: string, settings: any = {}): Promise<string> {
    const apiKey = settings.apiKey;
    const nameModel = settings.nameModel;
    const ttsEngine = settings.ttsEngine;

    // Read speech style templates from config
    const speechStyleTemplates = getVoiceStyleTemplates() || {};

    // Determine the speech style to use
    let speechStyle = "";
    if (style) {
        if (speechStyleTemplates[style]) {
            speechStyle = speechStyleTemplates[style].style;
        } else {
            speechStyle = style; // Use custom style text directly
        }
    }

    if (!apiKey) {
        throw new Error('Google AI API key not configured. Please set your API key in settings.');
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Go up one level from dist/ to find config.yaml in project root
    const projectRoot = path.resolve(__dirname, '..');
    const configPath = path.join(projectRoot, 'config.yaml');

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent) as any;
    const filenamePrompt = `${config?.google_tts?.name_prompt || 'Generate a short, descriptive filename for this text content (without extension): '}"${text.substring(0, 100)}..."`;

    // Generate filename using Gemini
    const filenameResponse = await ai.models.generateContent({
        model: nameModel,
        contents: [{ parts: [{ text: filenamePrompt }] }],
    });
    let generatedName = filenameResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'tts_audio';
    // Sanitize filename
    generatedName = generatedName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filename = `${generatedName}.wav`;
    const outputPath = path.join(directory, filename);

    // Prepare the text with speech style
    const styledText = speechStyle ? `${speechStyle}: ${text}` : text;

    const response: any = await ai.models.generateContent({
        model: ttsEngine,
        contents: [{ parts: [{ text: styledText }] }],
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                },
            },
        },
    });

    // Try different possible response structures
    let data = null;

    // Try the expected structure first
    if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        data = response.candidates[0].content.parts[0].inlineData.data;
    }
    // Try alternative structures
    else if (response.candidates?.[0]?.content?.parts?.[0]?.data) {
        data = response.candidates[0].content.parts[0].data;
    }
    else if (response.candidates?.[0]?.inlineData?.data) {
        data = response.candidates[0].inlineData.data;
    }
    else if (response.inlineData?.data) {
        data = response.inlineData.data;
    }

    if (!data) {
        console.error('Response candidates:', response.candidates);
        console.error('Response content:', response.candidates?.[0]?.content);
        console.error('Response parts:', response.candidates?.[0]?.content?.parts);
        console.error('Full response:', response);
        throw new Error('No audio data received from Google AI. Check API response structure.');
    }

    const audioBuffer = Buffer.from(data, 'base64');
    await saveWaveFile(outputPath, audioBuffer);

    return outputPath;
}

// Function to get voices from config file
async function getVoices(): Promise<Array<{name: string, description: string}>> {
  try {
    // Go up one level from dist/ to find config.yaml in project root
    const projectRoot = path.resolve(__dirname, '..');
    const configPath = path.join(projectRoot, 'config.yaml');

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent) as any;

    if (config?.google_tts?.voices) {
      return config.google_tts.voices;
    } else {
      throw new Error('Invalid config file structure');
    }
  } catch (error) {
    console.error('Error reading config file:', error);
    // Fallback to empty array if config file is not found or invalid
    return [];
  }
}

// Helper function to get speech style templates from config
function getVoiceStyleTemplates() {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const configPath = path.join(projectRoot, 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent) as any;
    return config?.speech_styles || {};
  } catch (error) {
    console.error('Error reading speech style templates from config:', error);
    return {};
  }
}

export { generateSpeech, getVoices, getVoiceStyleTemplates };
