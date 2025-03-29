#!/usr/bin/env node
import { runServer } from './server.js';
import fs from 'fs';
import path from 'path';

// ----- 1. Configuration Management -----

/**
 * Server configuration interface
 */
export interface ServerConfig {
  allowedCommands: string[];
  allowedPaths: string[];
  pathConfigFile: string | null;
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

// Default empty allowed paths list
const DEFAULT_ALLOWED_PATHS: string[] = [];

export function parseArgs(): ServerConfig {
  const args = process.argv.slice(2);
  const config: ServerConfig = {
    allowedCommands: [...DEFAULT_ALLOWED_COMMANDS],
    allowedPaths: [...DEFAULT_ALLOWED_PATHS],
    pathConfigFile: null
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
      case 'path-config':
        config.pathConfigFile = value;
        try {
          // Load allowed paths from config file
          if (fs.existsSync(value)) {
            const fileContent = fs.readFileSync(value, 'utf8');
            const pathConfig = JSON.parse(fileContent);
            if (Array.isArray(pathConfig.allowedPaths)) {
              config.allowedPaths = pathConfig.allowedPaths;
            }
          }
        } catch (error) {
          console.error(`Error loading path config file: ${error instanceof Error ? error.message : String(error)}`);
        }
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

/**
 * Check if a file path is authorized
 */
export function isPathAuthorized(filePath: string, config: ServerConfig): boolean {
  // Normalize the path to handle different OS formats
  const normalizedPath = path.normalize(filePath);
  
  // Check if the path is in the allowed list (either exact match or subdirectory)
  return config.allowedPaths.some(allowedPath => {
    const normalizedAllowedPath = path.normalize(allowedPath);
    return normalizedPath === normalizedAllowedPath || 
           normalizedPath.startsWith(normalizedAllowedPath + path.sep);
  });
}

// Execute main process
runServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
