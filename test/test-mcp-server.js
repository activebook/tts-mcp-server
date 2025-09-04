#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPServerTester {
  constructor() {
    this.serverProcess = null;
    this.messageId = 1;
    this.pendingRequests = new Map();
  }

  async startServer() {
    console.log('🚀 Starting MCP server...\n');

    // Build the server first
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    await new Promise((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
      buildProcess.on('error', reject);
    });

    // Start the server
    this.serverProcess = spawn('node', ['../dist/index.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'test-key', // Use test key if not set
      }
    });

    this.serverProcess.stdout.on('data', (data) => {
      this.handleServerOutput(data);
    });

    this.serverProcess.stderr.on('data', (data) => {
      console.log('📝 Server stderr:', data.toString().trim());
    });

    this.serverProcess.on('close', (code) => {
      console.log(`\n🔴 Server process exited with code ${code}`);
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  handleServerOutput(data) {
    const output = data.toString().trim();
    if (!output) return;

    try {
      const message = JSON.parse(output);
      console.log('📥 Received:', JSON.stringify(message, null, 2));

      if (message.id && this.pendingRequests.has(message.id)) {
        const { description } = this.pendingRequests.get(message.id);
        this.pendingRequests.delete(message.id);
        console.log(`✅ ${description}\n`);
      }
    } catch (error) {
      console.log('📝 Raw output:', output);
    }
  }

  sendMessage(method, params = {}, description = '') {
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method,
      params
    };

    if (description) {
      this.pendingRequests.set(message.id, { description });
    }

    const messageStr = JSON.stringify(message) + '\n';
    console.log(`📤 Sending: ${description || method}`);
    console.log('Message:', JSON.stringify(message, null, 2));

    this.serverProcess.stdin.write(messageStr);
  }

  async runTests() {
    console.log('🧪 Running MCP Server Tests\n');

    // Test 1: Initialize
    this.sendMessage('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      clientInfo: {
        name: 'mcp-server-tester',
        version: '1.0.0'
      }
    }, 'Initialize server');

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));    

    /*
    // Test 2: List tools
    this.sendMessage('tools/list', {}, 'List available tools');

    // Test 3: List resource templates
    this.sendMessage('resources/templates/list', {}, 'List resource templates');

    // Test 4: Call get_voice_styles tool
    this.sendMessage('tools/call', {
      name: 'get_voice_styles',
      arguments: { detail: false }
    }, 'Call get_voice_styles tool');

    // Test 5: Access resource template
    this.sendMessage('resources/read', {
      uri: 'tts://voice-styles/news_anchor'
    }, 'Read voice style resource');

    // Test 6: Test invalid resource
    this.sendMessage('resources/read', {
      uri: 'tts://voice-styles/nonexistent'
    }, 'Test invalid resource (should error)');
    */

    // Test 7: List prompts
    this.sendMessage('prompts/list', {}, 'List available prompts');

    // Wait for prompt list
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 8: Test Prompt
    this.sendMessage('prompts/get', {
      name: 'news_anchor'
    }, 'Test news_anchor prompt');

    // Wait for all responses
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async stop() {
    if (this.serverProcess) {
      console.log('\n🛑 Stopping server...');
      this.serverProcess.kill();
    }
  }
}

// Main execution
async function main() {
  const tester = new MCPServerTester();

  try {
    await tester.startServer();
    await tester.runTests();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await tester.stop();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

main().catch(console.error);
