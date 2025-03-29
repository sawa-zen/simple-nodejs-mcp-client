import Anthropic from '@anthropic-ai/sdk'
import { TextBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources'
import EventEmitter from 'eventemitter3'
import type { ChatMessage, MCPServers } from './types.js'
import { MCPClient } from './MCPClient.js'
import { convertMCPToolToAnthropicTool } from './utils.js'

interface Props {
  apiKey: string
  systemPropmt?: string
}

interface EventTypes {
  recive_assistant_message: {
    message: string
  }
  end_turn: void
}

export class AnthropicClient extends EventEmitter<EventTypes> {
  private _anthropic: Anthropic
  private _mcpClient: MCPClient
  private _messages: ChatMessage[] = []
  private _model: string = 'claude-3-5-haiku-latest'
  private _systemPrompt: string = 'You are a helpful assistant.'
  private _maxTokens: number = 1000

  constructor({ apiKey, systemPropmt }: Props) {
    super()
    this._anthropic = new Anthropic({ apiKey })
    this._mcpClient = new MCPClient()
    this._systemPrompt = systemPropmt || this._systemPrompt
  }

  setupTools = async (mcpServers: MCPServers) => {
    await this._mcpClient.startMcpServers(mcpServers)
  }

  pushMessages = (message: ChatMessage) => {
    this._messages.push(message)
  }

  sendMessages = async () => {
    const response = await this._anthropic.messages.create({
      model: this._model,
      max_tokens: this._maxTokens,
      messages: this._messages,
      tools: this._mcpClient.tools.map(convertMCPToolToAnthropicTool),
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
    this._messages.push({ role: 'assistant', content: message })
    this.emit('recive_assistant_message', { message })
  }

  private _toolUseBlock = async (content: ToolUseBlock) => {
    // Declare tool usage
    const message = `Using tool: ${content.name}\nInput: ${JSON.stringify(content.input)}`
    this._messages.push({ role: 'assistant', content: message })
    this.emit('recive_assistant_message', { message })

    // Execute tool
    const response = await this._mcpClient.useTool(content.name, content.input as Record<string, unknown> || {})
    const toolResponse = `Tool result: ${JSON.stringify(response)}`
    this._messages.push({ role: 'assistant', content: toolResponse })

    // Send tool result to Claude
    this.sendMessages()
  }

  dispose = async () => {
    await this._mcpClient.dispose()
    this._messages = []
  }
}
