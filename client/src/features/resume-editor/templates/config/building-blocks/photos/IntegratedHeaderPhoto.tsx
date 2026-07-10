import type { PhotoHandlerProps } from './types'

export default function IntegratedHeaderPhoto({ photoUrl, size = 80, className = '' }: PhotoHandlerProps) {
  return (
    <img
      src={photoUrl}
      alt="Profile"
      className={`rounded-full object-cover border-4 border-white shadow-md ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}
