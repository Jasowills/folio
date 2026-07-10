import type { PhotoHandlerProps } from './types'

export default function CirclePhoto({ photoUrl, size = 64, className = '' }: PhotoHandlerProps) {
  return (
    <img
      src={photoUrl}
      alt="Profile"
      className={`rounded-full object-cover ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}
