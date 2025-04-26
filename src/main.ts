import readline from 'readline'
import fs from 'fs'
import type { Config } from './types.js'
import { AnthropicClient } from './AnthropicClient.js'

// Load configuration file
const config: Config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))

// Start anthropic client
const anthropicClient = new AnthropicClient({ apiKey: config.claudeApiKey, mcpServerConfigs: config.mcpServers })
await anthropicClient.setUp()
anthropicClient.on('recive_assistant_message', ({ message }) => { console.log(`Claude: ${message}`) })
anthropicClient.on('tool_use', ({ input }) => { console.log(`Tool use: ${JSON.stringify(input)}`) })
anthropicClient.on('end_turn', () => { promptUser() })

// Start interactive interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
function promptUser() {
  rl.question('You: ', async (input) => {
    anthropicClient.pushMessages({ role: 'user', content: input })
    anthropicClient.sendMessages()
  })
}

// Cleanup process
const cleanup = async () => {
  rl.close()
  if (process.stdin.isTTY) process.stdin.setRawMode(false)
  await anthropicClient.dispose()
  process.exit(0)
}
process.on('SIGINT', async() => { await cleanup() })
process.on('SIGTERM', async() => { await cleanup() })

// Start chat
promptUser()
