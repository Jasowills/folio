import { useState, useEffect, useRef, useCallback } from 'react'
import { IconClipboard, IconX, IconBug } from '@tabler/icons-react'
import type { TranscriptEvent, CodeResult } from '../../hooks/useInterviewSocket'

interface DebugPanelProps {
  isConnected: boolean
  isRecording: boolean
  isAvatarSpeaking: boolean
  isThinking: boolean
  isPaused: boolean
  greetingDone: boolean
  bargeInIndicator: boolean
  turnState: string
  transcripts: TranscriptEvent[]
  currentInterim: string
  interviewerResponse: { text: string; audio: string | null; questionIndex: number } | null
  codeResult: CodeResult | null
  isCodeRunning: boolean
  error: string | null
  aiResponseTime: number | null
  elapsed: number
  pausesUsed: number
  pauseTimer: number
  cameraEnabled: boolean
  sessionId: string | undefined
  session: unknown
}

interface LogEntry {
  timestamp: string
  level: 'log' | 'warn' | 'error'
  message: string
}

function useDebugLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsRef = useRef<LogEntry[]>([])

  useEffect(() => {
    const originalLog = console.log.bind(console)
    const originalWarn = console.warn.bind(console)
    const originalError = console.error.bind(console)

    const addLog = (level: LogEntry['level'], args: unknown[]) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString().slice(11, 23),
        level,
        message: args
          .map((a) => {
            if (a instanceof Error) return a.stack || a.message
            if (typeof a === 'object') {
              try { return JSON.stringify(a) } catch { return String(a) }
            }
            return String(a)
          })
          .join(' '),
      }
      logsRef.current = [...logsRef.current, entry]
      if (logsRef.current.length > 500) {
        logsRef.current = logsRef.current.slice(-500)
      }
      setLogs(logsRef.current)
    }

    console.log = (...args: unknown[]) => { addLog('log', args); originalLog(...args) }
    console.warn = (...args: unknown[]) => { addLog('warn', args); originalWarn(...args) }
    console.error = (...args: unknown[]) => { addLog('error', args); originalError(...args) }

    return () => {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
    }
  }, [])

  return logs
}

export default function DebugPanel(props: DebugPanelProps) {
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<'logs' | 'state' | 'audit'>('logs')
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logs = useDebugLogs()
  const initSnapshotRef = useRef<string | null>(null)

  const {
    isConnected, isRecording, isAvatarSpeaking, isThinking, isPaused,
    greetingDone, bargeInIndicator, turnState,
    transcripts, currentInterim, interviewerResponse,
    codeResult, isCodeRunning, error, aiResponseTime,
    elapsed, pausesUsed, pauseTimer, cameraEnabled,
    sessionId, session,
  } = props

  const isUserSpeaking = isRecording && !isAvatarSpeaking && !isThinking && !isPaused
  const hasFinishedSpeaking = isRecording && !isUserSpeaking && !isAvatarSpeaking

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const stateSnapshot = useCallback(() => ({
    isConnected,
    isRecording,
    isAvatarSpeaking,
    isThinking,
    isPaused,
    greetingDone,
    bargeInIndicator,
    turnState,
    isUserSpeaking: isRecording && !isAvatarSpeaking && !isThinking && !isPaused,
    currentInterim,
    interviewerResponse: interviewerResponse
      ? { text: interviewerResponse.text.slice(0, 200), audioPresent: !!interviewerResponse.audio, questionIndex: interviewerResponse.questionIndex }
      : null,
    codeResult: codeResult
      ? { run: { code: codeResult.run.code, stdout: codeResult.run.stdout?.slice(0, 200) } }
      : null,
    isCodeRunning,
    error,
    aiResponseTime,
    elapsed,
    pausesUsed,
    pauseTimer,
    cameraEnabled,
    sessionId,
    sessionStatus: (session as { status?: string })?.status || null,
  }), [
    isConnected, isRecording, isAvatarSpeaking, isThinking, isPaused,
    greetingDone, bargeInIndicator, turnState, currentInterim,
    interviewerResponse, codeResult, isCodeRunning, error, aiResponseTime,
    elapsed, pausesUsed, pauseTimer, cameraEnabled, sessionId, session,
  ])

  if (!initSnapshotRef.current) {
    initSnapshotRef.current = JSON.stringify(stateSnapshot(), null, 2)
  }

  const formatTranscripts = transcripts.map((t, i) =>
    `[${i + 1}] ${t.speaker}: ${t.text}${t.isFinal ? '' : ' (interim)'}${t.confidence !== undefined ? ` (conf: ${(t.confidence * 100).toFixed(0)}%)` : ''}`
  ).join('\n')

  const handleCopy = async () => {
    const parts: string[] = [
      '═══════════════════════════════════',
      '          FOLIO DEBUG REPORT',
      '═══════════════════════════════════',
      '',
      '── INIT SNAPSHOT ──',
      initSnapshotRef.current || '(not captured)',
      '',
      '── CURRENT STATE ──',
      JSON.stringify(stateSnapshot(), null, 2),
      '',
      '── TRANSCRIPTS ──',
      formatTranscripts || '(none)',
      '',
      '── LOGS ──',
      logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n') || '(none)',
      '',
      '═══════════════════════════════════',
    ]
    try {
      await navigator.clipboard.writeText(parts.join('\n'))
    } catch {
      const ta = document.createElement('textarea')
      ta.value = parts.join('\n')
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-16 right-3 z-40 p-2 rounded-full bg-white/5 text-white/20 hover:text-white/60 hover:bg-white/10 transition-colors cursor-pointer"
        title="Debug (Ctrl+Shift+D)"
      >
        <IconBug className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="fixed inset-y-4 right-4 z-50 w-[420px] bg-[#1C1C1A] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={{ fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace" }}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 h-9 bg-[#252522] border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-teal uppercase tracking-wider">Debug</span>
          <span className="text-[10px] text-white/20">{logs.length} logs</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy debug report"
          >
            <IconClipboard className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-white/5">
        {(['logs', 'state', 'audit'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer ${
              tab === t ? 'text-teal border-b-2 border-teal' : 'text-white/30 hover:text-white/50'
            }`}
          >
            {t === 'logs' ? `Logs (${logs.length})` : t === 'state' ? 'State' : `Audit (${transcripts.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto text-[11px] leading-relaxed">
        {tab === 'logs' && (
          <div className="p-2 space-y-0.5">
            {logs.length === 0 && (
              <span className="text-white/20 p-2 block">No logs captured yet.</span>
            )}
            {logs.map((entry, i) => (
              <div
                key={i}
                className={`px-2 py-0.5 rounded ${
                  entry.level === 'error'
                    ? 'text-red-400 bg-red-500/5'
                    : entry.level === 'warn'
                    ? 'text-amber-400 bg-amber-500/5'
                    : 'text-white/70'
                }`}
              >
                <span className="text-white/20 mr-2 select-none">{entry.timestamp}</span>
                {entry.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {tab === 'state' && (
          <div className="p-3 space-y-2">
            {/* Speaking indicator */}
            <div className={`px-2 py-1.5 rounded text-[11px] font-semibold flex items-center gap-2 ${
              isUserSpeaking
                ? 'text-green-300 bg-green-500/15 border border-green-500/30'
                : hasFinishedSpeaking
                ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                : 'text-white/20 bg-white/5'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isUserSpeaking ? 'bg-green-400 animate-pulse' : hasFinishedSpeaking ? 'bg-amber-400' : 'bg-white/20'
              }`} />
              {isUserSpeaking ? 'You are speaking...' : hasFinishedSpeaking ? 'You finished speaking' : 'Not speaking'}
            </div>

            {/* AI response time */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-white/40">AI Response:</span>
              <span className={`font-mono font-semibold ${aiResponseTime !== null && aiResponseTime < 3000 ? 'text-green-400' : aiResponseTime !== null && aiResponseTime < 8000 ? 'text-amber-400' : aiResponseTime !== null ? 'text-red-400' : 'text-white/30'}`}>
                {aiResponseTime !== null ? `${aiResponseTime}ms` : '—'}
              </span>
            </div>

            <div className={`px-2 py-1 rounded text-[10px] ${
              isConnected ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
            }`}>Socket: {isConnected ? 'CONNECTED' : 'DISCONNECTED'}</div>

            <div className="grid grid-cols-2 gap-1.5">
              <StateBadge label="Recording" value={isRecording} />
              <StateBadge label="Avatar Speaking" value={isAvatarSpeaking} />
              <StateBadge label="Thinking" value={isThinking} />
              <StateBadge label="Paused" value={isPaused} />
              <StateBadge label="Greeting Done" value={greetingDone} />
              <StateBadge label="Barge-in" value={bargeInIndicator} />
              <StateBadge label="Camera" value={cameraEnabled} />
              <StateBadge label="Code Running" value={isCodeRunning} />
            </div>

            <div className="text-white/40 text-[10px]">Turn State: <span className="text-white/80">{turnState}</span></div>
            <div className="text-white/40 text-[10px]">Elapsed: <span className="text-white/80">{elapsed}s</span></div>
            <div className="text-white/40 text-[10px]">Pauses Used: <span className="text-white/80">{pausesUsed} / 2</span></div>
            <div className="text-white/40 text-[10px]">Pause Timer: <span className="text-white/80">{pauseTimer}s</span></div>
            <div className="text-white/40 text-[10px]">Session ID: <span className="text-white/60 truncate block">{sessionId}</span></div>
            <div className="text-white/40 text-[10px]">Session Status: <span className="text-white/80">{(session as { status?: string })?.status || 'n/a'}</span></div>

            {error && (
              <div className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                Error: {error}
              </div>
            )}

            {currentInterim && (
              <div className="text-xs text-amber-400/70 bg-amber-500/5 px-2 py-1 rounded">
                Interim: "{currentInterim}"
              </div>
            )}

            <details>
              <summary className="text-white/40 text-[10px] cursor-pointer hover:text-white/60">Raw state JSON</summary>
              <pre className="mt-1 text-[9px] text-white/30 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                {JSON.stringify(stateSnapshot(), null, 2)}
              </pre>
            </details>
          </div>
        )}

        {tab === 'audit' && (
          <div className="p-2 space-y-1">
            {transcripts.length === 0 && (
              <span className="text-white/20 p-2 block">No transcript events yet.</span>
            )}
            {transcripts.map((t, i) => (
              <div
                key={i}
                className={`px-2 py-1 rounded ${
                  t.speaker === 'interviewer' ? 'bg-teal/5 border-l-2 border-teal' : 'bg-white/5 border-l-2 border-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-white/40">{t.speaker}</span>
                  {t.isFinal === false && <span className="text-[9px] text-amber-400/60">interim</span>}
                  {t.confidence !== undefined && (
                    <span className="text-[9px] text-white/20">conf: {(t.confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
                <div className="text-[11px] text-white/70 mt-0.5">{t.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with init snapshot info */}
      <div className="shrink-0 h-6 flex items-center px-3 bg-[#252522] border-t border-white/5">
        <span className="text-[9px] text-white/20">
          Init captured · {logs.length} log entries
        </span>
      </div>
    </div>
  )
}

function StateBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={`px-2 py-1 rounded text-[10px] ${
      value ? 'text-green-400 bg-green-500/10' : 'text-white/20 bg-white/5'
    }`}>
      {label}: {value ? 'true' : 'false'}
    </div>
  )
}
