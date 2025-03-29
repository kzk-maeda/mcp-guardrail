# MCP Guardrail Server

*Read this in other languages: [日本語](README.ja.md)*

MCP Guardrail Server is a secure MCP (Model Context Protocol) server that executes only pre-authorized commands. It can be used in high-security environments to provide AI assistants with limited command execution capabilities.

## Features

- Executes only commands included in the allowlist
- Restricts file access to pre-authorized paths only
- Command execution timeout functionality

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npm start -- [--allowed-commands <comma-separated-list>] [--path-config <path-to-config-file>]
```

### Options

- `--allowed-commands`: Comma-separated list of allowed Bash commands (optional, default: `git,ls,mkdir,cd,npm,npx,python`)
- `--path-config`: Path to a JSON configuration file specifying allowed file paths (optional)

## Examples

```bash
# Run in development mode
npm run dev

# Start server (using default allowed commands)
npm start

# Start with custom command list
npm start -- --allowed-commands git,ls,node

# Start with path restrictions
npm start -- --path-config ./path-config.json
```

## Path Configuration

To restrict file access to specific directories, create a configuration file based on the sample:

```bash
# Copy the sample configuration file
cp path-config.sample.json path-config.json

# Edit the configuration file to match your needs
nano path-config.json
```

The path configuration file should have this format:

```json
{
  "allowedPaths": [
    "/tmp",
    "/Users/username/Documents/project",
    "/var/log",
    "C:\\Users\\username\\Documents\\project",
    "C:\\Windows\\Temp"
  ]
}
```

Include paths for both Windows and macOS as needed for your environment.

## Configuration with Claude Desktop

To use this MCP server with Claude Desktop, add the following entry to your Claude Desktop configuration file (typically `~/.config/Claude Desktop/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "guardrail": {
      "command": "node",
      "args": [
        "/absolute/path/to/dist/index.js",
        "--allowed-commands",
        "git,ls,node,echo", // Add your allowed commands here
        "--path-config",
        "/absolute/path/to/path-config.json" // Add your path config file
      ],
      "env": {}
    }
  }
}
```

## Connectivity Test

To verify that the server is working correctly, run:

```bash
npm test
```

This will run the following tests:

- Executing an allowed command
- Attempting to execute an unauthorized command (which should be rejected)
- Accessing a file in an allowed path (should be permitted)
- Attempting to access a file in a restricted path (which should be rejected)

## Security Notes

- Only allow commands that are absolutely necessary
- Do not allow potentially dangerous commands (such as rm -rf)
- Restrict file access to only the paths that are needed
- Be especially careful with paths that contain sensitive data or system files

## License

MIT
