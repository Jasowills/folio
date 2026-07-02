import { useEffect, useRef, useCallback, useState } from 'react'

interface ProctoringEvent {
  type: 'gaze_offscreen' | 'multiple_faces' | 'tab_switch' | 'window_blur' | 'long_silence' | 'second_voice' | 'large_paste' | 'fast_typing_burst'
  severity: 'low' | 'medium' | 'high'
  duration: number | null
  metadata?: Record<string, unknown>
}

interface UseCameraProctoringOptions {
  enabled: boolean
  onEvent: (event: ProctoringEvent) => void
}

export function useCameraProctoring({ enabled, onEvent }: UseCameraProctoringOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [faceDetectorReady, setFaceDetectorReady] = useState(false)
  const [numFaces, setNumFaces] = useState(0)
  const animFrameRef = useRef<number>(undefined)
  const lastFaceCountRef = useRef(0)
  const faceDetectorRef = useRef<any>(null)

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setNumFaces(0)
    faceDetectorRef.current = null
  }, [])

  useEffect(() => {
    if (!enabled) {
      stopCamera()
      return
    }

    async function init() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm',
        )

        let delegate: 'GPU' | 'CPU' = 'GPU'
        try {
          faceDetectorRef.current = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate,
            },
            runningMode: 'VIDEO',
            numFaces: 3,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          })
        } catch (gpuErr) {
          console.warn('[CameraProctoring] GPU delegate failed, falling back to CPU:', gpuErr)
          delegate = 'CPU'
          faceDetectorRef.current = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate,
            },
            runningMode: 'VIDEO',
            numFaces: 3,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          })
        }
        setFaceDetectorReady(true)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 320, height: 240 },
        })
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const detector = faceDetectorRef.current

        function detect() {
          const video = videoRef.current
          if (!detector || !video || video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(detect)
            return
          }
          const now = performance.now()
          const result = detector.detectForVideo(video, now)
          const count = result.faceLandmarks?.length || 0
          setNumFaces(count)

          if (count === 0 && lastFaceCountRef.current > 0) {
            onEvent({
              type: 'gaze_offscreen',
              severity: 'low',
              duration: null,
              metadata: { timestamp: Date.now() },
            })
          }
          if (count > 1) {
            onEvent({
              type: 'multiple_faces',
              severity: 'high',
              duration: null,
              metadata: { count, timestamp: Date.now() },
            })
          }
          lastFaceCountRef.current = count
          animFrameRef.current = requestAnimationFrame(detect)
        }
        animFrameRef.current = requestAnimationFrame(detect)
      } catch (err) {
        console.error('[CameraProctoring] Face detection init failed:', err)
        setFaceDetectorReady(false)
      }
    }

    init()

    return () => {
      stopCamera()
    }
  }, [enabled, onEvent, stopCamera])

  return {
    faceDetectorReady,
    numFaces,
    videoRef,
  }
}
