import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { Tool } from '@modelcontextprotocol/sdk/types'
import type { MCPServerConfig } from './types.js'

export class MCPClient {
  private _client: Client
  private _mcpServerConfig: MCPServerConfig
  private _version: string = '0.1.0'
  private _transport: StdioClientTransport
  private _tools: Tool[] = []
  get tools() { return this._tools }

  constructor(serverName: string, mcpServerConfig: MCPServerConfig) {
    this._mcpServerConfig = mcpServerConfig
    this._transport = new StdioClientTransport(this._mcpServerConfig)
    this._client = new Client({
      name: serverName,
      version: this._version
    }, {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {}
      }
    })
  }

  startMcpServers = async () => {
    // Get and set tools from MCP server
    await this._client.connect(this._transport)
    const listToolsResponse = await this._client.listTools()
    const newTools = listToolsResponse.tools
    this._tools.push(...newTools)
  }

  useTool = async (toolName: string, inputs: Record<string, unknown>) => {
    const toolUseResponse = await this._client.callTool({ name: toolName, arguments: inputs })
    if (toolUseResponse.error) {
      throw new Error(`Failed to call tool: ${toolName} ${JSON.stringify(toolUseResponse.error)}`)
    }
    return toolUseResponse
  }

  dispose = async () => {
    this._transport.close()
    await this._client.close()
  }
}
