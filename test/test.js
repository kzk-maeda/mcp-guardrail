#!/usr/bin/env node

// Test script that simulates a simple MCP client
// Can be executed with npm test

import { spawn } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Create a temporary path configuration file for testing
function createTempPathConfig() {
  const tempDir = os.tmpdir();
  const configPath = path.join(tempDir, 'path-config-test.json');
  
  // Create a configuration that allows only tmp directory
  const config = {
    allowedPaths: [tempDir]
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

// Main function
async function runTest() {
  console.log('Starting test...');
  
  // Create temporary path configuration file
  const pathConfigFile = createTempPathConfig();
  console.log(`Created temporary path config file: ${pathConfigFile}`);
  
  // Start the server process with path restrictions
  const serverProcess = spawn('node', [
    'dist/index.js', 
    '--allowed-commands', 'git,ls,node,echo,cat',
    '--path-config', pathConfigFile
  ]);
  console.log('Server started...');
  
  // Display server's standard error output in the log
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data.toString().trim()}`);
  });
  
  // Create readline interface to communicate with the server using standard I/O
  const rl = readline.createInterface({
    input: serverProcess.stdout,
    terminal: false
  });
  
  // Wait a bit for the server to start up
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Test 1: Execute an allowed command
    console.log('\n--- Test 1: Execute an allowed command ---');
    const request1 = {
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'Bash',
        arguments: {
          command: 'echo "Hello World"'
        }
      }
    };
    
    // Send the request to the server
    serverProcess.stdin.write(JSON.stringify(request1) + '\n');
    
    // Wait for the response
    const response1 = await new Promise((resolve) => {
      rl.once('line', (line) => {
        try {
          const response = JSON.parse(line);
          resolve(response);
        } catch (error) {
          console.error('Failed to parse response:', error);
          resolve(null);
        }
      });
    });
    
    console.log('Command execution result:', JSON.stringify(response1, null, 2));
    
    // Test 2: Execute a disallowed command
    console.log('\n--- Test 2: Execute a disallowed command (should be rejected) ---');
    const request2 = {
      jsonrpc: '2.0',
      id: '2',
      method: 'tools/call',
      params: {
        name: 'Bash',
        arguments: {
          command: 'rm -rf /'
        }
      }
    };
    
    // Send the request to the server
    serverProcess.stdin.write(JSON.stringify(request2) + '\n');
    
    // Wait for the response
    const response2 = await new Promise((resolve) => {
      rl.once('line', (line) => {
        try {
          const response = JSON.parse(line);
          resolve(response);
        } catch (error) {
          console.error('Failed to parse response:', error);
          resolve(null);
        }
      });
    });
    
    console.log('Rejected command result:', JSON.stringify(response2, null, 2));
    
    // Test 3: Access allowed path
    console.log('\n--- Test 3: Access allowed path (should be accepted) ---');
    const tempFile = path.join(os.tmpdir(), 'test-file.txt');
    
    // Create a temporary file
    fs.writeFileSync(tempFile, 'Test content');
    
    const request3 = {
      jsonrpc: '2.0',
      id: '3',
      method: 'tools/call',
      params: {
        name: 'Bash',
        arguments: {
          command: `cat ${tempFile}`
        }
      }
    };
    
    // Send the request to the server
    serverProcess.stdin.write(JSON.stringify(request3) + '\n');
    
    // Wait for the response
    const response3 = await new Promise((resolve) => {
      rl.once('line', (line) => {
        try {
          const response = JSON.parse(line);
          resolve(response);
        } catch (error) {
          console.error('Failed to parse response:', error);
          resolve(null);
        }
      });
    });
    
    console.log('Access allowed path result:', JSON.stringify(response3, null, 2));
    
    // Test 4: Access disallowed path
    console.log('\n--- Test 4: Access disallowed path (should be rejected) ---');
    const request4 = {
      jsonrpc: '2.0',
      id: '4',
      method: 'tools/call',
      params: {
        name: 'Bash',
        arguments: {
          command: 'cat /etc/passwd'
        }
      }
    };
    
    // Send the request to the server
    serverProcess.stdin.write(JSON.stringify(request4) + '\n');
    
    // Wait for the response
    const response4 = await new Promise((resolve) => {
      rl.once('line', (line) => {
        try {
          const response = JSON.parse(line);
          resolve(response);
        } catch (error) {
          console.error('Failed to parse response:', error);
          resolve(null);
        }
      });
    });
    
    console.log('Access disallowed path result:', JSON.stringify(response4, null, 2));
    
    // Clean up temporary file
    fs.unlinkSync(tempFile);
    fs.unlinkSync(pathConfigFile);
    
    // Clean up after tests are complete
    serverProcess.kill();
    console.log('\nTest completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error occurred during test execution:', error);
    // Try to clean up temporary files
    try {
      fs.unlinkSync(pathConfigFile);
    } catch (e) {}
    serverProcess.kill();
    process.exit(1);
  }
}

// Execute the test
runTest();
