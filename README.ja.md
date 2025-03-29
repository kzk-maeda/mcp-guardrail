# MCP Guardrail Server

MCP Guardrailサーバーは、事前に許可されたコマンドのみを実行するための安全なMCP（Model Context Protocol）サーバーです。セキュリティ要件が高い環境で、AIアシスタントに限定的なコマンド実行機能を提供するために使用できます。

## 特徴

- 許可リストに含まれているコマンドのみを実行
- コマンド実行のタイムアウト機能

## インストール

```bash
npm install
npm run build
```

## 使用方法

```bash
npm start -- [--allowed-commands <comma-separated-list>]
```

### オプション

- `--allowed-commands`: カンマ区切りの許可されたBashコマンドリスト（オプション、デフォルト: `git,ls,mkdir,cd,npm,npx,python`）

## 使用例

```bash
# 開発用に実行
npm run dev

# サーバーを起動（デフォルトの許可コマンドを使用）
npm start

# カスタムコマンドリストで起動
npm start -- --allowed-commands git,ls,node
```

## Claude Desktopでの設定

このMCPサーバーをClaude Desktopで使用するには、Claude Desktopの設定ファイル（通常は`~/.config/Claude Desktop/claude_desktop_config.json`）に以下のエントリを追加してください：

```json
{
  "mcpServers": {
    "guardrail": {
      "command": "node",
      "args": [
        "/絶対パス/to/dist/index.js",
        "--allowed-commands",
        "git,ls,node,echo" // ここに許可するコマンドを追加
      ],
      "env": {}
    }
  }
}
```

## 接続テスト

サーバーが正しく動作しているか確認するには、以下を実行してください：

```bash
npm test
```

これにより、以下のテストが実行されます：

- 許可されたコマンドの実行
- 許可されていないコマンドの実行（拒否されるはず）

## セキュリティの注意点

- コマンドリストには本当に必要なコマンドのみを許可してください
- 危険な可能性のあるコマンド（rm -rf など）は許可しないでください

## ライセンス

MIT
