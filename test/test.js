#!/usr/bin/env node

// Test script that simulates a simple MCP client
// Can be executed with npm test

import { spawn } from 'child_process';
import readline from 'readline';

// Main function
async function runTest() {
  console.log('Starting test...');
  
  // Start the server process
  const serverProcess = spawn('node', ['dist/index.js', '--allowed-commands', 'git,ls,node,echo']);
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
    
    // Clean up after tests are complete
    serverProcess.kill();
    console.log('\nTest completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error occurred during test execution:', error);
    serverProcess.kill();
    process.exit(1);
  }
}

// Execute the test
runTest();
