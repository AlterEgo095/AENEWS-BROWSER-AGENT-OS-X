import { create } from 'zustand';

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'mission' | 'agent' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  meta?: Record<string, unknown>;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newNotification: AppNotification = {
      ...notification,
      id,
      read: false,
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
}));
