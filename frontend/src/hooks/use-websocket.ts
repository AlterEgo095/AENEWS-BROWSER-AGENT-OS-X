'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';

interface WebSocketEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

type EventHandler = (event: WebSocketEvent) => void;

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const { token } = useAuthStore();

  useEffect(() => {
    // Determine the Socket.IO path — use the Caddy gateway with XTransformPort
    const socketUrl = window.location.origin;
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: {
        XTransformPort: '3000',
      },
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Authenticate if we have a token
      if (token) {
        socket.emit('authenticate', { token });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('authenticated', () => {
      // Server acknowledged authentication
    });

    socket.on('event', (data: WebSocketEvent) => {
      setLastEvent(data);
      // Notify all subscribed handlers for this event type
      const handlers = handlersRef.current.get(data.type);
      if (handlers) {
        handlers.forEach((handler) => handler(data));
      }
      // Also notify wildcard handlers
      const wildcardHandlers = handlersRef.current.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach((handler) => handler(data));
      }
    });

    socket.on('mission:updated', (data: WebSocketEvent) => {
      const event = { ...data, type: 'mission:updated', timestamp: new Date().toISOString() };
      setLastEvent(event);
      const handlers = handlersRef.current.get('mission:updated');
      if (handlers) handlers.forEach((handler) => handler(event));
    });

    socket.on('mission:progress', (data: WebSocketEvent) => {
      const event = { ...data, type: 'mission:progress', timestamp: new Date().toISOString() };
      setLastEvent(event);
      const handlers = handlersRef.current.get('mission:progress');
      if (handlers) handlers.forEach((handler) => handler(event));
    });

    socket.on('mission:state-changed', (data: WebSocketEvent) => {
      const event = { ...data, type: 'mission:state-changed', timestamp: new Date().toISOString() };
      setLastEvent(event);
      const handlers = handlersRef.current.get('mission:state-changed');
      if (handlers) handlers.forEach((handler) => handler(event));
    });

    // Orchestration events
    socket.on('orchestration:collaboration', (data: WebSocketEvent) => {
      const event = { ...data, type: 'orchestration:collaboration', timestamp: new Date().toISOString() };
      setLastEvent(event);
      const handlers = handlersRef.current.get('orchestration:collaboration');
      if (handlers) handlers.forEach((handler) => handler(event));
      // Also notify wildcard handlers
      const wildcardHandlers = handlersRef.current.get('*');
      if (wildcardHandlers) wildcardHandlers.forEach((handler) => handler(event));
    });

    socket.on('orchestration:coordination', (data: WebSocketEvent) => {
      const event = { ...data, type: 'orchestration:coordination', timestamp: new Date().toISOString() };
      setLastEvent(event);
      const handlers = handlersRef.current.get('orchestration:coordination');
      if (handlers) handlers.forEach((handler) => handler(event));
      // Also notify wildcard handlers
      const wildcardHandlers = handlersRef.current.get('*');
      if (wildcardHandlers) wildcardHandlers.forEach((handler) => handler(event));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const subscribe = useCallback((eventType: string, handler: EventHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);
  }, []);

  const unsubscribe = useCallback((eventType: string, handler: EventHandler) => {
    const handlers = handlersRef.current.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        handlersRef.current.delete(eventType);
      }
    }
  }, []);

  const emit = useCallback((eventType: string, payload: Record<string, unknown>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventType, payload);
    }
  }, []);

  return {
    connected,
    lastEvent,
    subscribe,
    unsubscribe,
    emit,
  };
}
