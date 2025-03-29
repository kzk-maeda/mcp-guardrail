#!/usr/bin/env node
import { runServer } from './server.js';

// ----- 1. Configuration Management -----

/**
 * Server configuration interface
 */
export interface ServerConfig {
  allowedCommands: string[];
}

/**
 * Parse command line arguments and return configuration object
 */
// List of commands allowed by default
const DEFAULT_ALLOWED_COMMANDS = [
  'git',
  'ls', 
  'mkdir',
  'cd',
  'npm',
  'npx',
  'python'
];

export function parseArgs(): ServerConfig {
  const args = process.argv.slice(2);
  const config: ServerConfig = {
    allowedCommands: [...DEFAULT_ALLOWED_COMMANDS]
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      throw new Error(`Invalid argument: ${arg}`);
    }

    const key = arg.slice(2);
    if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
      throw new Error(`No value for argument: ${arg}`);
    }

    const value = args[++i];
    
    switch (key) {
      case 'allowed-commands':
        config.allowedCommands = value ? value.split(',').map(cmd => cmd.trim()) : [...DEFAULT_ALLOWED_COMMANDS];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: ServerConfig): void {
  // No specific validation needed, but keeping the function for future extensions
}

/**
 * Check if a Bash command is authorized
 */
export function isCommandAuthorized(command: string, config: ServerConfig): boolean {
  // Extract the main command (first word)
  const mainCommand = command.trim().split(/\s+/)[0];
  
  // Check if the main command is in the allowed list
  return config.allowedCommands.includes(mainCommand);
}

// Execute main process
runServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
