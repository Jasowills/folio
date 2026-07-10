import type { PhotoHandlerProps } from './types'

export default function SquarePhoto({ photoUrl, size = 64, className = '' }: PhotoHandlerProps) {
  return (
    <img
      src={photoUrl}
      alt="Profile"
      className={`object-cover ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}
