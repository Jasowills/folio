import api from './api'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResult {
  message: {
    content: string
  }
}

export const AiService = {
  async chat(messages: ChatMessage[]): Promise<ChatResult> {
    const { data } = await api.post('/ai/chat', { messages })
    return data
  },

  async rewrite(text: string): Promise<string[]> {
    const result = await this.chat([
      { role: 'system', content: 'You are a resume writing expert. Rewrite the following text to be more impactful. Return exactly 3 variations separated by "|||".' },
      { role: 'user', content: text },
    ])
    return (result.message?.content || '').split('|||').map(s => s.trim()).filter(Boolean).slice(0, 3)
  },

  async improve(text: string): Promise<string[]> {
    const result = await this.chat([
      { role: 'system', content: 'You are a resume writing expert. Polish the following text to be more professional. Return exactly 3 variations separated by "|||".' },
      { role: 'user', content: text },
    ])
    return (result.message?.content || '').split('|||').map(s => s.trim()).filter(Boolean).slice(0, 3)
  },
}
