import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }
  return 'https://rapido-backend-v1zf.onrender.com';
};

const SOCKET_URL = getSocketUrl();

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
