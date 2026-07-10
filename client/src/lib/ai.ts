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

  async chatStream(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onDone: () => void,
    onError?: (err: Error) => void,
  ): Promise<void> {
    const baseUrl = api.defaults.baseURL || ''
    const token = localStorage.getItem('accessToken') || ''

    const url = `${baseUrl}/ai/chat/stream`
    console.log('[ai:stream] fetching', url)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    })

    console.log('[ai:stream] response', res.status, res.headers.get('content-type'))

    if (!res.ok) {
      console.error('[ai:stream] error status', res.status)
      onError?.(new Error(`Stream error: ${res.status}`))
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      console.error('[ai:stream] no reader')
      onError?.(new Error('No stream reader'))
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let chunkCount = 0
    let tokenCount = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunkCount++
        const raw = decoder.decode(value, { stream: true })
        buffer += raw
        if (chunkCount <= 3) console.log(`[ai:stream] chunk ${chunkCount}:`, raw.slice(0, 200))

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            console.log(`[ai:stream] done: ${chunkCount} chunks, ${tokenCount} tokens`)
            onDone()
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              console.error('[ai:stream] server error', parsed.error)
              onError?.(new Error(parsed.error))
              return
            }
            if (parsed.token) {
              tokenCount++
              onToken(parsed.token)
            }
          } catch (e) {
            console.warn('[ai:stream] parse error', data.slice(0, 100))
          }
        }
      }
      onDone()
    } catch (e) {
      onError?.(e as Error)
    }
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
