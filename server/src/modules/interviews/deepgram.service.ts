import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { DeepgramClient } from '@deepgram/sdk'

export interface DeepgramSttConnection {
  socket: any
  sessionId: string
}

export interface DeepgramTranscriptEvent {
  transcript: string
  isFinal: boolean
  confidence: number
}

@Injectable()
export class DeepgramService implements OnModuleDestroy {
  private readonly logger = new Logger(DeepgramService.name)
  private client: DeepgramClient | null = null
  private activeConnections = new Map<string, DeepgramSttConnection>()

  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (apiKey) {
      this.client = new DeepgramClient(apiKey as any)
      this.logger.log('Deepgram client initialized')
    } else {
      this.logger.warn('DEEPGRAM_API_KEY not set — STT/TTS disabled')
    }
  }

  get isConfigured(): boolean {
    return this.client !== null
  }

  async createSttConnection(
    clientId: string,
    sessionId: string,
    onTranscript: (event: DeepgramTranscriptEvent) => void,
    onError: (error: Error) => void,
    onClose: () => void,
  ): Promise<DeepgramSttConnection | null> {
    if (!this.client) return null

    try {
      const socket = await (this.client as any).listen.v1.connect({
        model: 'nova-2',
        encoding: 'linear16',
        sample_rate: 16000,
        interim_results: 'true',
        smart_format: 'true',
        punctuate: 'true',
        utterance_end_ms: '1000',
        vad_events: 'true',
        endpointing: '200',
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      })

      const conn: DeepgramSttConnection = { socket, sessionId }
      this.activeConnections.set(clientId, conn)

      socket.on('message', (message: any) => {
        if (message?.type === 'Results') {
          const transcript = message?.channel?.alternatives?.[0]?.transcript?.trim()
          if (transcript && transcript.length > 0) {
            onTranscript({
              transcript,
              isFinal: message.is_final === true || message.speech_final === true,
              confidence: message.channel.alternatives[0].confidence || 0,
            })
          }
        }
      })

      socket.on('error', (err: Error) => {
        this.logger.error(`Deepgram STT error for client ${clientId}: ${err.message}`)
        onError(err)
      })

      socket.on('close', () => {
        this.logger.log(`Deepgram STT closed for client ${clientId}`)
        this.activeConnections.delete(clientId)
        onClose()
      })

      socket.connect()
      return conn
    } catch (err) {
      this.logger.error(`Failed to create Deepgram STT connection: ${(err as Error).message}`)
      return null
    }
  }

  sendAudio(clientId: string, audioBuffer: Buffer): void {
    const conn = this.activeConnections.get(clientId)
    if (!conn) {
      this.logger.warn(`No active Deepgram connection for client ${clientId}`)
      return
    }
    try {
      conn.socket.sendMedia(audioBuffer)
    } catch (err) {
      this.logger.error(`Failed to send audio to Deepgram: ${(err as Error).message}`)
    }
  }

  closeSttConnection(clientId: string): void {
    const conn = this.activeConnections.get(clientId)
    if (conn) {
      try {
        conn.socket.sendCloseStream({ type: 'CloseStream' })
        conn.socket.close()
      } catch {
        // ignore
      }
      this.activeConnections.delete(clientId)
    }
  }

  async generateTtsBase64(text: string): Promise<string | null> {
    if (!this.client) return null

    try {
      const response = await (this.client as any).speak.v1.audio.generate({
        text,
        model: 'aura-asteria-en',
        encoding: 'linear16',
        sample_rate: 16000,
        container: 'wav',
      })

      const arrayBuffer = await response.data.arrayBuffer()
      return Buffer.from(arrayBuffer).toString('base64')
    } catch (err) {
      this.logger.error(`TTS generation failed: ${(err as Error).message}`)
      return null
    }
  }

  onModuleDestroy() {
    for (const clientId of this.activeConnections.keys()) {
      this.closeSttConnection(clientId)
    }
  }
}
