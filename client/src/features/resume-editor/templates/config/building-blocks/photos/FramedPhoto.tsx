import type { PhotoHandlerProps } from './types'

export default function FramedPhoto({ photoUrl, size = 64, className = '' }: PhotoHandlerProps) {
  return (
    <img
      src={photoUrl}
      alt="Profile"
      className={`object-cover border-2 border-current ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '4px',
      }}
    />
  )
}
