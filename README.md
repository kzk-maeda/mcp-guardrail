# MCP Guardrail Server

*Read this in other languages: [日本語](README.ja.md)*

MCP Guardrail Server is a secure MCP (Model Context Protocol) server that executes only pre-authorized commands. It can be used in high-security environments to provide AI assistants with limited command execution capabilities.

## Features

- Executes only commands included in the allowlist
- Command execution timeout functionality

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npm start -- [--allowed-commands <comma-separated-list>]
```

### Options

- `--allowed-commands`: Comma-separated list of allowed Bash commands (optional, default: `git,ls,mkdir,cd,npm,npx,python`)

## Examples

```bash
# Run in development mode
npm run dev

# Start server (using default allowed commands)
npm start

# Start with custom command list
npm start -- --allowed-commands git,ls,node
```

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
        "git,ls,node,echo" // Add your allowed commands here
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

## Security Notes

- Only allow commands that are absolutely necessary
- Do not allow potentially dangerous commands (such as rm -rf)

## License

MIT
