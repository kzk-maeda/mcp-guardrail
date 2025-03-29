import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import path from 'path';

import { 
  ServerConfig, 
  parseArgs, 
  validateConfig, 
  isCommandAuthorized,
  isPathAuthorized
} from './index.js';

// ----- Type Definitions -----

/**
 * Command execution result type definition
 */
interface CommandResult {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

// Wrap exec in a Promise
const execAsync = promisify(exec);

// ----- File Path Security -----

/**
 * Extract file paths from a command
 * This is a simple implementation and may need enhancement for complex commands
 */
function extractFilePaths(command: string): string[] {
  const paths: string[] = [];
  const tokens = command.split(/\s+/);
  
  // Skip the first token (the command itself)
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Skip option flags
    if (token.startsWith('-')) continue;
    
    // Skip redirections and their targets
    if (token === '>' || token === '>>' || token === '<') {
      i++; // Skip the next token too
      continue;
    }
    
    // Skip pipe symbol
    if (token === '|') continue;
    
    // If it doesn't look like an option, consider it a potential file path
    if (!token.startsWith('-') && token.length > 0 && !token.match(/^[<>|]/)) {
      // Remove any quotes
      const cleanToken = token.replace(/^["']|["']$/g, '');
      paths.push(cleanToken);
    }
  }
  
  return paths;
}

/**
 * Check if a command is trying to access unauthorized paths
 */
function checkPathSecurity(command: string, config: ServerConfig): { 
  authorized: boolean; 
  unauthorizedPaths: string[] 
} {
  // If no path restrictions set, allow all
  if (config.allowedPaths.length === 0) {
    return { authorized: true, unauthorizedPaths: [] };
  }
  
  // Extract potential file paths from the command
  const paths = extractFilePaths(command);
  
  // Check each path against allowed paths
  const unauthorizedPaths: string[] = [];
  
  for (const p of paths) {
    if (!isPathAuthorized(p, config)) {
      unauthorizedPaths.push(p);
    }
  }
  
  return {
    authorized: unauthorizedPaths.length === 0,
    unauthorizedPaths
  };
}

// ----- Command Execution Utilities -----

/**
 * Execute a Bash command
 */
async function executeCommand(command: string, timeout: number = 30000): Promise<CommandResult> {
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command, { timeout });
    const executionTime = Date.now() - startTime;
    
    console.error(`Command execution completed: ${command}, execution time: ${executionTime}ms`);
    
    const content = [];
    if (stdout) {
      content.push({ type: "text", text: stdout });
    }
    if (stderr) {
      content.push({ type: "text", text: `stderr: ${stderr}` });
    }
    
    return {
      content,
      isError: false
    };
  } catch (error: any) {
    console.error(`Command execution error: ${command}`, error);
    
    // Timeout error
    if (error.code === 'ETIMEDOUT' || error.killed) {
      return {
        content: [{ type: "text", text: `Error: Command execution timed out (${timeout}ms)` }],
        isError: true
      };
    }
    
    // Other errors
    return {
      content: [{ 
        type: "text", 
        text: `Error: ${error.message}\n${error.stderr || ''}` 
      }],
      isError: true
    };
  }
}

// ----- MCP Server Implementation -----

/**
 * Create an MCP server
 */
function createServer(): Server {
  return new Server(
    {
      name: "mcp-server/guardrail",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );
}

/**
 * Set up a handler for listing resources
 */
function setupListResourcesHandler(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { "success": true };
  });
}

/**
 * Set up a handler for listing tools
 */
function setupListToolsHandler(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "Bash",
          description: "Execute the specified command",
          inputSchema: {
            type: "object",
            properties: {
              command: { 
                type: "string",
                description: "Command to execute" 
              },
              timeout: { 
                type: "number", 
                description: "Optional timeout (milliseconds, max 600000)" 
              }
            },
            required: ["command"]
          }
        }
      ]
    };
  });
}

/**
 * Set up a handler for tool calls
 */
function setupCallToolHandler(server: Server, config: ServerConfig): void {
  // Define input schema for Bash commands
  const BashInputSchema = z.object({
    command: z.string(),
    timeout: z.number().optional()
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case "Bash": {
        try {
          // Validate input parameters
          const params = BashInputSchema.parse(request.params.arguments);
          
          // Check if the command is allowed
          if (!isCommandAuthorized(params.command, config)) {
            console.error(`Warning: Unauthorized Bash command execution requested: ${params.command}`);
            
            // Display list of allowed commands
            return {
              result: {
                content: [{ 
                  type: "text", 
                  text: `Error: The specified command is not allowed: ${params.command}\n` +
                        `Allowed commands: ${config.allowedCommands.join(', ')}` 
                }],
                isError: true
              }
            };
          }
          
          // Check for file path security
          const pathCheck = checkPathSecurity(params.command, config);
          if (!pathCheck.authorized) {
            console.error(`Warning: Command attempts to access unauthorized paths: ${pathCheck.unauthorizedPaths.join(', ')}`);
            
            return {
              result: {
                content: [{ 
                  type: "text", 
                  text: `Error: Command attempts to access unauthorized paths:\n` +
                        `${pathCheck.unauthorizedPaths.join('\n')}\n\n` +
                        `Allowed paths: ${config.allowedPaths.length > 0 ? config.allowedPaths.join(', ') : '(none specified)'}` 
                }],
                isError: true
              }
            };
          }
          
          // Execute the allowed command
          console.error(`Executing command: ${params.command}`);
          const commandResult = await executeCommand(
            params.command,
            params.timeout || 30000
          );
          
          return {
            result: commandResult
          };
        } catch (error) {
          console.error('Bash command validation error:', error);
          throw error;
        }
      }
      
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });
}

// ----- Server Launch Process -----

/**
 * Initialize and launch the server
 */
export async function runServer(): Promise<void> {
  let config: ServerConfig;
  
  try {
    // 1. Parse and validate configuration
    config = parseArgs();
    validateConfig(config);
    
    // 2. Display initial settings
    console.error(`Initializing MCP Guardrail server`);
    console.error(`Allowed commands: ${config.allowedCommands.join(', ')}`);
    if (config.allowedPaths.length > 0) {
      console.error(`Allowed paths: ${config.allowedPaths.join(', ')}`);
    } else {
      console.error(`No path restrictions configured`);
    }
    
    // 3. Create the server
    const server = createServer();
    
    // 4. Set up each handler
    setupListResourcesHandler(server);
    setupListToolsHandler(server);
    setupCallToolHandler(server, config);
    
    // 5. Establish server connection
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Server started successfully');
  } catch (error: unknown) {
    // Error handling
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error occurred:', error);
    }
    process.exit(1);
  }
}
