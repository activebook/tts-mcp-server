# TTS MCP Server

A Model Context Protocol (MCP) server that provides Text-to-Speech (TTS) functionality using Google TTS API.

## Features

- **google_tts_generate**: Generate audio from text content using specified voice
- **get_google_tts_voices**: Retrieve list of available TTS voices with descriptions from config.yaml

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

- directory: string (Directory to save the audio file (Default: current directory))
- voice: string (Voice to use for TTS (Default: Kore))
- content: string (The text content to convert to speech)

**Returns:** Path to the saved audio file

### get_google_tts_voices

Description: Get list of available TTS voices

**Parameters:**

- count: number (Number of voices to return (0 for all))
