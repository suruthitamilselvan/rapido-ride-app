import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'https://rapido-backend-v1zf.onrender.com';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to Rapido Real-Time Engine:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Rapido Real-Time Engine');
    });
  }
  return socket;
}
