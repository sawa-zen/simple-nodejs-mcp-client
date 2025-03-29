import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface MCPServer {
  command: string
  args: string[]
  env: Record<string, string>
}

export type MCPServers = Record<string, MCPServer>

export interface Config {
  claudeApiKey: string
  mcpServers: MCPServers
}

export type Transports = Record<string, StdioClientTransport>
