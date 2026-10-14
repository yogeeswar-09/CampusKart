import { FirestorePermissionError } from './errors';

type EventMap = {
  'permission-error': (error: FirestorePermissionError) => void;
};

class ErrorEmitter {
  private listeners: { [K in keyof EventMap]?: EventMap[K][] } = {};

  on<K extends keyof EventMap>(event: K, callback: EventMap[K]) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(callback);
  }

  off<K extends keyof EventMap>(event: K, callback: EventMap[K]) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter(l => l !== callback);
  }

  emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>) {
    if (!this.listeners[event]) return;
    this.listeners[event]!.forEach(l => (l as any)(...args));
  }
}

export const errorEmitter = new ErrorEmitter();
