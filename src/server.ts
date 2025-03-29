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

import { 
  ServerConfig, 
  parseArgs, 
  validateConfig, 
  isCommandAuthorized
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
