import type { Tool as AnthropicTool } from '@anthropic-ai/sdk/resources'
import type { Tool as MCPTool } from '@modelcontextprotocol/sdk/types'

export const convertMCPToolToAnthropicTool = (tool: MCPTool): AnthropicTool => {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: tool.inputSchema.properties,
      required: tool.inputSchema.required,
    }
  }
}
