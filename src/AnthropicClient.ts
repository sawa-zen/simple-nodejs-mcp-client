import Anthropic from '@anthropic-ai/sdk'
import { MessageParam, TextBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources'
import EventEmitter from 'eventemitter3'
import type { ChatMessage, MCPServerConfigs } from './types.js'
import { MCPClient } from './MCPClient.js'
import { convertMCPToolToAnthropicTool } from './utils.js'

interface Props {
  apiKey: string
  systemPropmt?: string
  mcpServerConfigs?: MCPServerConfigs
}

interface EventTypes {
  recive_assistant_message: {
    message: string
  }
  tool_use: {
    input: Record<string, unknown>
  }
  receive_tool_result: {
    result: Record<string, unknown>
  }
  end_turn: void
}

export class AnthropicClient extends EventEmitter<EventTypes> {
  private _anthropic: Anthropic
  private _mcpClients: MCPClient[] = []
  private _messageParams: MessageParam[] = []
  private _model: string = 'claude-3-5-haiku-latest'
  private _systemPrompt: string = 'You are a helpful assistant.'
  private _maxTokens: number = 1000

  constructor({ apiKey, systemPropmt, mcpServerConfigs }: Props) {
    super()
    this._anthropic = new Anthropic({ apiKey })
    this._systemPrompt = systemPropmt || this._systemPrompt
    Object.entries(mcpServerConfigs || {}).forEach(([serverName, serverConfig]) => {
      const mcpClient = new MCPClient(serverName, serverConfig)
      this._mcpClients.push(mcpClient)
    })
  }

  setUp = async () => {
    await Promise.all(this._mcpClients.map(mcpClient => mcpClient.startMcpServers()))
  }

  pushMessages = (message: ChatMessage) => {
    this._messageParams.push(message)
  }

  sendMessages = async () => {
    const response = await this._anthropic.messages.create({
      model: this._model,
      max_tokens: this._maxTokens,
      messages: this._messageParams,
      tools: this._mcpClients.map(mcpClient => mcpClient.tools.map(convertMCPToolToAnthropicTool)).flat(),
      system: this._systemPrompt,
    })

    const contents = response.content || []
    contents.forEach((content) => {
      switch (content.type) {
        case 'text': this._textBlock(content); break
        case 'tool_use': this._toolUseBlock(content); break
      }
    })

    if (response.stop_reason === 'end_turn') {
      this.emit('end_turn')
    }
  }

  private _textBlock = (content: TextBlock) => {
    const message = content.text
    this._messageParams.push({ role: 'assistant', content: message })
    this.emit('recive_assistant_message', { message })
  }

  private _toolUseBlock = async (content: ToolUseBlock) => {
    // Find the MCP client that has the tool
    const mcpClient = this._mcpClients.find(client => client.tools.some(tool => tool.name === content.name))
    if (!mcpClient) {
      throw new Error(`Tool ${content.name} not found in any MCP client`)
    }

    this._messageParams.push({
      role: 'assistant',
      content: [{
        type: 'tool_use',
        id: content.id,
        input: content.input,
        name: content.name,
      }]
    })
    this.emit('tool_use', { input: content.input })

    // Execute tool
    const response = await mcpClient.useTool(content.name, content.input as Record<string, unknown> || {})
    const toolResponse = JSON.stringify(response)
    this._messageParams.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: content.id,
        content: toolResponse,
      }]
    })
    this.emit('receive_tool_result', { result: toolResponse })

    // Send tool result to Claude
    this.sendMessages()
  }

  dispose = async () => {
    await Promise.all(this._mcpClients.map(mcpClient => mcpClient.dispose()))
    this._messageParams = []
  }
}
