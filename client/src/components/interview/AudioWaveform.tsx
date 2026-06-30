import { useEffect, useRef } from 'react'

interface AudioWaveformProps {
  stream: MediaStream | null
  isActive: boolean
}

export default function AudioWaveform({ stream, isActive }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!stream || !isActive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const audioCtx = new AudioContext()
    audioContextRef.current = audioCtx
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 64
    analyserRef.current = analyser
    const source = audioCtx.createMediaStreamSource(stream)
    sourceRef.current = source
    source.connect(analyser)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)
      if (!canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barCount = 32
      const step = Math.floor(bufferLength / barCount)
      const barWidth = canvas.width / barCount
      const gap = 2

      for (let i = 0; i < barCount; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j]
        }
        const avg = sum / step
        const percent = avg / 255
        const barHeight = Math.max(2, percent * canvas.height)

        const x = i * barWidth + gap / 2
        const y = canvas.height - barHeight

        const alpha = 0.3 + percent * 0.7
        ctx.fillStyle = `rgba(15, 110, 86, ${alpha})`
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth - gap, barHeight, [2, 2, 0, 0])
        ctx.fill()
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      source.disconnect()
      audioCtx.close()
    }
  }, [stream, isActive])

  if (!isActive) return null

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={40}
      className="w-full h-10 rounded-md"
    />
  )
}
