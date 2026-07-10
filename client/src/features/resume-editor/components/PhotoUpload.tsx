import { useState, useRef, useCallback, useEffect } from 'react'

interface PhotoUploadProps {
  currentPhotoUrl?: string
  onPhotoUploaded: (url: string) => void
  onCancel: () => void
}

export default function PhotoUpload({ currentPhotoUrl, onPhotoUploaded, onCancel }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be under 2MB')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!preview) return

    setIsUploading(true)
    setError(null)

    try {
      // If we have crop data, apply it
      if (canvasRef.current && imgRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx && imgRef.current.complete) {
          const img = imgRef.current
          const size = Math.min(img.naturalWidth, img.naturalHeight)
          const sx = (img.naturalWidth - size) / 2
          const sy = (img.naturalHeight - size) / 2

          canvas.width = 400
          canvas.height = 400
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)

          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9)
          })

          const formData = new FormData()
          formData.append('file', blob, 'photo.jpg')

          const response = await fetch('/api/upload/photo', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          })

          if (!response.ok) throw new Error('Upload failed')
          const { url } = await response.json()
          onPhotoUploaded(url)
        }
      } else {
        // Direct upload without crop
        const response = await fetch(preview)
        const blob = await response.blob()
        const formData = new FormData()
        formData.append('file', blob, 'photo.jpg')

        const uploadResponse = await fetch('/api/upload/photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        })

        if (!uploadResponse.ok) throw new Error('Upload failed')
        const { url } = await uploadResponse.json()
        onPhotoUploaded(url)
      }
    } catch (err) {
      setError('Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
  }, [preview, onPhotoUploaded])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Upload Profile Photo</h3>

        {error && (
          <div className="text-red-500 text-sm mb-4">{error}</div>
        )}

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-gray-400"
            >
              Click to select photo
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  ref={imgRef}
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Zoom</label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>

          {preview && (
            <>
              <button
                onClick={() => {
                  setPreview(null)
                  setCrop({ x: 0, y: 0 })
                  setZoom(1)
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Change Photo
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
