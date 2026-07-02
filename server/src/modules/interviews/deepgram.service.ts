import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { DeepgramClient } from '@deepgram/sdk'

const FEMALE_NAMES = new Set([
  'sara', 'sarah', 'jessica', 'emma', 'olivia', 'ava', 'sophia', 'isabella',
  'mia', 'charlotte', 'amelia', 'harper', 'evelyn', 'abigail', 'emily',
  'ella', 'avery', 'sofia', 'camila', 'aria', 'scarlett', 'victoria',
  'madison', 'luna', 'grace', 'chloe', 'penelope', 'layla', 'riley',
  'zoey', 'nora', 'lily', 'eleanor', 'hannah', 'lillian', 'addison',
  'aubrey', 'ellie', 'stella', 'natalie', 'zoe', 'leah', 'hazel',
  'violet', 'aurora', 'savannah', 'audrey', 'brooklyn', 'bella', 'claire',
  'skylar', 'lucy', 'paisley', 'anna', 'caroline', 'katherine',
  'elizabeth', 'mary', 'jane', 'susan', 'karen', 'lisa', 'nancy',
  'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'deborah',
  'jennifer', 'patricia', 'linda', 'barbara', 'helen', 'amy',
  'brenda', 'pamela', 'catherine', 'nicole', 'rachel', 'amanda',
  'melissa', 'rebecca', 'michelle', 'stephanie', 'crystal', 'kathleen',
  'joan', 'janet', 'donna', 'carol', 'denise', 'tammy', 'laura', 'teresa',
])

export interface DeepgramTranscriptEvent {
  transcript: string
  isFinal: boolean
  confidence: number
}

interface AudioBufferState {
  chunks: Buffer[]
  baseChunk: Buffer | null
  checkTimer: ReturnType<typeof setInterval> | null
  sessionId: string
  onTranscript: (event: DeepgramTranscriptEvent) => void
  onError: (error: Error) => void
  flushInProgress: boolean
  lastChunkTime: number
}

@Injectable()
export class DeepgramService implements OnModuleDestroy {
  private readonly logger = new Logger(DeepgramService.name)
  private deepgramClient: DeepgramClient | null = null
  private buffers = new Map<string, AudioBufferState>()

  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (apiKey) {
      try {
        this.deepgramClient = new DeepgramClient({ apiKey } as any)
      } catch (err) {
        this.logger.error(`Failed to create DeepgramClient: ${(err as Error).message}`)
      }
    } else {
      this.logger.warn('DEEPGRAM_API_KEY not set — TTS disabled')
    }
  }

  get isConfigured(): boolean {
    return true
  }

  async createSttConnection(
    clientId: string,
    sessionId: string,
    onTranscript: (event: DeepgramTranscriptEvent) => void,
    onError: (error: Error) => void,
    _onClose: () => void,
  ): Promise<boolean> {
    if (this.buffers.has(clientId)) {
      this.logger.warn(`Buffer already exists for client ${clientId}, cleaning up`)
      this.closeSttConnection(clientId)
    }

    const now = Date.now()
    const state: AudioBufferState = {
      chunks: [],
      baseChunk: null,
      checkTimer: null,
      sessionId,
      onTranscript,
      onError,
      flushInProgress: false,
      lastChunkTime: now,
    }

    state.checkTimer = setInterval(() => {
      this.checkFlush(clientId, state)
    }, 500)

    this.buffers.set(clientId, state)
    this.logger.log(`Groq Whisper buffer initialized for client ${clientId}, session ${sessionId}`)
    return true
  }

  sendAudio(clientId: string, audioBuffer: Buffer): void {
    const state = this.buffers.get(clientId)
    if (!state) {
      this.logger.warn(`No buffer for client ${clientId}`)
      return
    }
    this.logger.debug(`[${clientId}] audio chunk received, size=${audioBuffer.length}, firstBytes=${audioBuffer.subarray(0, 8).toString('hex')}`)
    if (!state.baseChunk) {
      state.baseChunk = audioBuffer
      this.logger.debug(`[${clientId}] saved base chunk, size=${audioBuffer.length}`)
    }
    state.chunks.push(audioBuffer)
    state.lastChunkTime = Date.now()
  }

  forceFlush(clientId: string): void {
    const state = this.buffers.get(clientId)
    if (!state || state.flushInProgress || state.chunks.length === 0) return
    this.flushBuffer(clientId, state)
  }

  closeSttConnection(clientId: string): void {
    const state = this.buffers.get(clientId)
    if (!state) return

    if (state.checkTimer) {
      clearInterval(state.checkTimer)
      state.checkTimer = null
    }

    if (state.chunks.length > 0 && !state.flushInProgress) {
      this.flushBufferSync(clientId, state)
    }

    this.buffers.delete(clientId)
    this.logger.log(`Groq Whisper buffer cleaned up for client ${clientId}`)
  }

  private checkFlush(clientId: string, state: AudioBufferState): void {
    if (state.chunks.length === 0 || state.flushInProgress) return

    const silenceDuration = Date.now() - state.lastChunkTime
    const hasEnoughChunks = state.chunks.length >= 3
    const isSilent = silenceDuration >= 3500

    this.logger.debug(`[${clientId}] checkFlush: chunks=${state.chunks.length}, silence=${silenceDuration}ms, enough=${hasEnoughChunks}, silent=${isSilent}`)

    if (hasEnoughChunks || isSilent) {
      this.flushBuffer(clientId, state)
    }
  }

  private async flushBuffer(clientId: string, state: AudioBufferState): Promise<void> {
    state.flushInProgress = true
    this.logger.debug(`[${clientId}] flushBuffer starting, chunks=${state.chunks.length}`)

    try {
      const chunks = state.chunks.splice(0)
      const validChunks = chunks.filter(c => c && c.length > 2048)

      if (validChunks.length === 0) return

      const needsBase = state.baseChunk && !validChunks.includes(state.baseChunk)
      const combined = needsBase
        ? Buffer.concat([state.baseChunk!, ...validChunks])
        : Buffer.concat(validChunks)
      this.logger.debug(`[${clientId}] sending combined audio to Whisper, parts=${validChunks.length}, total=${combined.length}`)

      const text = await this.transcribeChunk(clientId, combined)
      if (text) {
        this.logger.log(`Groq Whisper transcript for ${clientId}: "${text.slice(0, 120)}"`)
        if (text.length > 1) {
          state.onTranscript({
            transcript: text,
            isFinal: true,
            confidence: 1,
          })
        }
      } else {
        this.logger.debug(`[${clientId}] Whisper returned no text`)
      }
    } finally {
      state.flushInProgress = false
      this.logger.debug(`[${clientId}] flushBuffer done`)
    }
  }

  private flushBufferSync(clientId: string, state: AudioBufferState): void {
    if (state.chunks.length === 0) return
    this.flushBuffer(clientId, state)
  }

  private async transcribeChunk(clientId: string, audio: Buffer): Promise<string | null> {
    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) return null

    const firstBytes = audio.subarray(0, 16).toString('hex')
    const ebmlId = audio.subarray(0, 4).toString('hex')

    try {
      const form = new FormData()
      form.append('file', new File([new Uint8Array(audio)], 'audio.webm', { type: 'audio/webm' }))
      form.append('model', 'whisper-large-v3-turbo')
      form.append('response_format', 'json')
      form.append('language', 'en')

      this.logger.debug(`[${clientId}] POST to Groq Whisper: size=${audio.length}, ebml=${ebmlId}, firstBytes=${firstBytes}`)

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: form,
      })

      if (!response.ok) {
        const errText = await response.text()
        this.logger.error(`[${clientId}] Groq Whisper ${response.status}: size=${audio.length}, ebml=${ebmlId}, body=${errText}`)
        return null
      }

      const result = (await response.json()) as { text: string }
      const text = result.text?.trim()
      this.logger.debug(`[${clientId}] Groq Whisper OK: size=${audio.length}, text="${text?.slice(0, 80) || '(empty)'}"`)
      return text || null
    } catch (err) {
      this.logger.error(`[${clientId}] Groq Whisper fetch failed: ${(err as Error).message}`)
      return null
    }
  }

  private guessVoiceModel(name: string): string {
    const first = name.split(' ')[0].toLowerCase()
    return FEMALE_NAMES.has(first) ? 'aura-2-thalia-en' : 'aura-2-orion-en'
  }

  private addPauses(text: string): string {
    return text
      .replace(/([.!?]+\s)/g, '$1... ')
      .replace(/,(\s)/g, ', ')
  }

  async generateTtsBase64(text: string, interviewerName?: string): Promise<string | null> {
    if (!this.deepgramClient) return null

    try {
      const withPauses = this.addPauses(text)
      const model = interviewerName ? this.guessVoiceModel(interviewerName) : 'aura-2-thalia-en'
      const binaryResponse = await (this.deepgramClient as any).speak.v1.audio.generate({
        text: withPauses,
        model,
        encoding: 'linear16',
        sample_rate: 16000,
        container: 'wav',
        speed: 1.03,
      })

      const arrayBuffer = await binaryResponse.arrayBuffer()
      return Buffer.from(arrayBuffer).toString('base64')
    } catch (err) {
      this.logger.error(`TTS generation failed: ${(err as Error).message}`)
      return null
    }
  }

  onModuleDestroy() {
    for (const clientId of this.buffers.keys()) {
      this.closeSttConnection(clientId)
    }
  }
}
