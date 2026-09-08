import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DeepgramClient } from '@deepgram/sdk';

const FEMALE_NAMES = new Set([
  'sara',
  'sarah',
  'jessica',
  'emma',
  'olivia',
  'ava',
  'sophia',
  'isabella',
  'mia',
  'charlotte',
  'amelia',
  'harper',
  'evelyn',
  'abigail',
  'emily',
  'ella',
  'avery',
  'sofia',
  'camila',
  'aria',
  'scarlett',
  'victoria',
  'madison',
  'luna',
  'grace',
  'chloe',
  'penelope',
  'layla',
  'riley',
  'zoey',
  'nora',
  'lily',
  'eleanor',
  'hannah',
  'lillian',
  'addison',
  'aubrey',
  'ellie',
  'stella',
  'natalie',
  'zoe',
  'leah',
  'hazel',
  'violet',
  'aurora',
  'savannah',
  'audrey',
  'brooklyn',
  'bella',
  'claire',
  'skylar',
  'lucy',
  'paisley',
  'anna',
  'caroline',
  'katherine',
  'elizabeth',
  'mary',
  'jane',
  'susan',
  'karen',
  'lisa',
  'nancy',
  'betty',
  'margaret',
  'sandra',
  'ashley',
  'kimberly',
  'deborah',
  'jennifer',
  'patricia',
  'linda',
  'barbara',
  'helen',
  'amy',
  'brenda',
  'pamela',
  'catherine',
  'nicole',
  'rachel',
  'amanda',
  'melissa',
  'rebecca',
  'michelle',
  'stephanie',
  'crystal',
  'kathleen',
  'joan',
  'janet',
  'donna',
  'carol',
  'denise',
  'tammy',
  'laura',
  'teresa',
]);

export interface DeepgramTranscriptEvent {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

interface SttConnection {
  sessionId: string;
  conn: any;
  audioQueue: Buffer[];
  isSocketOpen: boolean;
  onTranscript: (event: DeepgramTranscriptEvent) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

@Injectable()
export class DeepgramService implements OnModuleDestroy {
  private readonly logger = new Logger(DeepgramService.name);
  private deepgramClient: DeepgramClient | null = null;
  private connections = new Map<string, SttConnection>();

  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (apiKey) {
      try {
        this.deepgramClient = new DeepgramClient({ apiKey });
      } catch (err) {
        this.logger.error(
          `Failed to create DeepgramClient: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.warn('DEEPGRAM_API_KEY not set — STT and TTS disabled');
    }
  }

  get isConfigured(): boolean {
    return this.deepgramClient !== null;
  }

  async createSttConnection(
    clientId: string,
    sessionId: string,
    onTranscript: (event: DeepgramTranscriptEvent) => void,
    onError: (error: Error) => void,
    onClose: () => void,
  ): Promise<boolean> {
    if (!this.deepgramClient) {
      onError(new Error('Deepgram not configured'));
      return false;
    }

    if (this.connections.has(clientId)) {
      this.logger.warn(
        `Connection already exists for client ${clientId}, closing first`,
      );
      this.closeSttConnection(clientId);
    }

    try {
      const conn = await (
        this.deepgramClient as any
      ).listen.v2.createConnection({
        model: 'flux-general-en',
        eager_eot_threshold: 0.5,
        eot_threshold: 0.8,
        eot_timeout_ms: 1500,
      });

      const state: SttConnection = {
        sessionId,
        conn,
        audioQueue: [],
        isSocketOpen: false,
        onTranscript,
        onError,
        onClose,
      };

      this.connections.set(clientId, state);

      conn.on('open', () => {
        this.logger.log(
          `Deepgram Flux v2 WebSocket opened for client ${clientId}, session ${sessionId}`,
        );
        state.isSocketOpen = true;
        const queue = state.audioQueue;
        state.audioQueue = [];
        for (const chunk of queue) {
          try {
            conn.sendMedia(chunk);
          } catch {
            /* socket is now open, sendMedia should work */
          }
        }
      });

      conn.on('message', (message: any) => {
        if (message.type === 'TurnInfo') {
          const turnInfo = message as {
            event: string;
            transcript: string;
            words?: Array<{ word: string; confidence: number }>;
            end_of_turn_confidence: number;
          };

          const isEndOfTurn = turnInfo.event === 'EndOfTurn';
          const isEagerEndOfTurn = turnInfo.event === 'EagerEndOfTurn';
          const isUpdate = turnInfo.event === 'Update';

          if (isEndOfTurn || isEagerEndOfTurn || isUpdate) {
            const words = turnInfo.words || [];
            const avgConfidence =
              words.length > 0
                ? words.reduce((sum, w) => sum + w.confidence, 0) / words.length
                : 0;

            state.onTranscript({
              transcript: turnInfo.transcript,
              isFinal: isEndOfTurn || isEagerEndOfTurn,
              confidence:
                isEndOfTurn || isEagerEndOfTurn
                  ? avgConfidence
                  : avgConfidence * 0.6,
            });
          }
        } else if (message.type === 'Connected') {
          this.logger.debug(
            `Deepgram Flux connected for client ${clientId}: ${JSON.stringify(message)}`,
          );
        } else if (message.type === 'FatalError') {
          this.logger.error(
            `Deepgram Flux fatal error for client ${clientId}: ${JSON.stringify(message)}`,
          );
          state.onError(
            new Error(message.description || 'Deepgram Flux fatal error'),
          );
        }
      });

      conn.on('close', (event: any) => {
        this.logger.log(
          `Deepgram Flux connection closed for client ${clientId}: code=${event?.code || 'unknown'}, will auto-reconnect`,
        );
        state.isSocketOpen = false;
      });

      conn.on('error', (error: Error) => {
        this.logger.error(
          `Deepgram Flux connection error for client ${clientId}: ${error.message}`,
        );
        state.onError(error);
      });

      await conn.connect();
      await conn.waitForOpen();

      this.logger.log(
        `Deepgram Flux v2 STT ready for client ${clientId}, session ${sessionId}`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to create Deepgram Flux connection for ${clientId}: ${(err as Error).message}`,
      );
      onError(err as Error);
      return false;
    }
  }

  private static readonly MAX_QUEUE_SIZE = 50;
  private static readonly MAX_QUEUE_BYTES = 2 * 1024 * 1024; // ~2MB

  sendAudio(clientId: string, audioBuffer: Buffer): void {
    const state = this.connections.get(clientId);
    if (!state) return;

    if (state.isSocketOpen) {
      try {
        state.conn.sendMedia(audioBuffer);
      } catch {
        /* socket is open, sendMedia should work */
      }
    } else {
      // ADV-0004: bound queue to avoid unbounded memory growth when socket never opens
      if (state.audioQueue.length >= DeepgramService.MAX_QUEUE_SIZE) {
        this.logger.warn(
          `Audio queue full for ${clientId} (${state.audioQueue.length}), dropping oldest chunk`,
        );
        state.audioQueue.shift();
      }
      const queuedBytes = state.audioQueue.reduce((s, b) => s + b.length, 0);
      if (queuedBytes + audioBuffer.length > DeepgramService.MAX_QUEUE_BYTES) {
        this.logger.warn(`Audio queue bytes exceeded for ${clientId}, dropping chunk`);
        return;
      }
      state.audioQueue = [...state.audioQueue, audioBuffer];
    }
  }

  closeSttConnection(clientId: string): void {
    const state = this.connections.get(clientId);
    if (!state) return;

    try {
      state.conn.close();
    } catch (err) {
      this.logger.warn(
        `Error closing Deepgram connection for ${clientId}: ${(err as Error).message}`,
      );
    }
    this.connections.delete(clientId);
    this.logger.log(`Deepgram Flux connection closed for client ${clientId}`);
  }

  private guessVoiceModel(name: string): string {
    const first = name.split(' ')[0].toLowerCase();
    return FEMALE_NAMES.has(first) ? 'aura-2-thalia-en' : 'aura-2-orion-en';
  }

  private addPauses(text: string): string {
    return text.replace(/([.!?]+\s)/g, '$1... ').replace(/,(\s)/g, ', ');
  }

  async generateTtsBase64(
    text: string,
    interviewerName?: string,
  ): Promise<string | null> {
    if (!this.deepgramClient) return null;

    try {
      const withPauses = this.addPauses(text);
      const model = interviewerName
        ? this.guessVoiceModel(interviewerName)
        : 'aura-2-thalia-en';
      const binaryResponse = await (
        this.deepgramClient as any
      ).speak.v1.audio.generate({
        text: withPauses,
        model,
        encoding: 'linear16',
        sample_rate: 48000,
        container: 'wav',
        speed: 1.03,
      });

      const arrayBuffer = await binaryResponse.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    } catch (err) {
      this.logger.error(`TTS generation failed: ${(err as Error).message}`);
      return null;
    }
  }

  onModuleDestroy() {
    for (const clientId of this.connections.keys()) {
      this.closeSttConnection(clientId);
    }
  }
}
