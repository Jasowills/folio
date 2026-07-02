import { Socket } from 'socket.io-client'

let preConnectedSocket: Socket | null = null

export function getPreConnectedSocket(): Socket | null {
  return preConnectedSocket
}

export function setPreConnectedSocket(socket: Socket | null): void {
  preConnectedSocket = socket
}
