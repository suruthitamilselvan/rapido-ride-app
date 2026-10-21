import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://rapido-backend-v1zf.onrender.com'
    : 'http://localhost:5000');

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
