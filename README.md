# MCP Guardrail Server

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

## Security Notes

- Only allow commands that are absolutely necessary
- Do not allow potentially dangerous commands (such as rm -rf)

## License

MIT
