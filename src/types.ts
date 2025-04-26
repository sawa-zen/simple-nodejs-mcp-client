import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface MCPServerConfig {
  command: string
  args: string[]
  env: Record<string, string>
}

export type MCPServerConfigs = Record<string, MCPServerConfig>

export interface Config {
  claudeApiKey: string
  mcpServers: MCPServerConfigs
}

export type Transports = Record<string, StdioClientTransport>
