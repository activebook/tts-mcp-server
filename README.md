# TTS MCP Server

A Model Context Protocol (MCP) server that provides Text-to-Speech (TTS) functionality using Google TTS API.

## Features

- **Tools**: Generate TTS audio, list voices, get style templates
- **Resources**: Access voice style templates via URI patterns
- **Prompts**: Direct access to 16+ voice style prompt templates

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Usage

Run the server:
```bash
npm start
```

Or for development:
```bash
npm run dev
```

## MCP Configuration

Add the following to your MCP configuration file (e.g., `mcp.json`):

```json
{
  "mcpServers": {
    "tts-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@activebook/tts-mcp-server"
      ],
      "env": {
        "GOOGLE_API_KEY": "{your-google-api-key}", // required, change to your own key
        "GOOGLE_NAME_MODEL": "gemini-2.0-flash", // optional
        "GOOGLE_TTS_MODEL": "gemini-2.5-flash-preview-tts", // optional
        "GOOGLE_VOICE": "kore" // optional
      }
    }
  }
}
```

## Tools

### google_tts_generate

Description: Generate TTS audio from text content

**Parameters:**

- content: string (The text content to convert to speech) [required]
- directory: string (Directory to save the audio file (Default: current directory)) [optional]
- voice: string (Voice to use for TTS (Default: Kore)) [optional]
- style: string (Speech style - either a template name like 'news_tone' or custom style text) [optional]

**Returns:** Path to the saved audio file

### get_google_tts_voices

Description: Get list of available TTS voices

**Parameters:**

- count: number (Number of voices to return (0 for all)) [optional]

### get_voice_styles

Description: Get list of predefined speech style templates

**Parameters:**

- detail: boolean (Whether to show voice style detail (Default: false)) [optional]
**Returns:** JSON object containing available speech style templates with descriptions and style prompts

## Prompts

Access voice style prompt templates directly:

### Available Prompts
- `news_anchor` - Formal, clear news-reporting style
- `professional_presenter` - Confident business presentation style
- `bedtime_storyteller` - Gentle, soothing storytelling voice
- `motivational_speaker` - Energetic, inspiring delivery
- `podcast_host` - Engaging conversational style
- `documentary_narrator` - Calm, authoritative narration
- `mysterious_narrator` - Deep, suspenseful voice
- `humorous_comedian` - Light-hearted, comedic tone
- `calm_meditation_guide` - Soothing meditation voice
- `dramatic_performer` - Expressive theatrical style
- And 6 more styles...

### Usage
```json
{
  "method": "prompts/get",
  "params": {
    "name": "news_anchor"
  }
}
```

**Returns:** Style prompt text ready for TTS generation

## Resources

Access voice style metadata via URI patterns:

### Voice Style Templates
- **URI Pattern:** `tts://voice-styles/{style_name}`
- **Example:** `tts://voice-styles/news_anchor`
- **Content:** JSON with style description and prompt

### Usage
```json
{
  "method": "resources/read",
  "params": {
    "uri": "tts://voice-styles/bedtime_storyteller"
  }
}
```

**Returns:** Voice style metadata in JSON format


