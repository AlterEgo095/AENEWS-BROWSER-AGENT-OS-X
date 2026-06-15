'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Bot,
  Target,
  Settings,
  X,
} from 'lucide-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useNotificationStore, type AppNotification, type NotificationType } from '@/store/notification-store';
import { formatDistanceToNow } from 'date-fns';

// ─── Helpers ────────────────────────────────────────────────────────
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'mission':
      return <Target className="h-4 w-4 text-blue-400" />;
    case 'agent':
      return <Bot className="h-4 w-4 text-purple-400" />;
    case 'system':
      return <Settings className="h-4 w-4 text-cyan-400" />;
    default:
      return <Info className="h-4 w-4 text-sky-400" />;
  }
}

function getNotificationBorderColor(type: NotificationType) {
  switch (type) {
    case 'error':
      return 'border-l-red-400';
    case 'warning':
      return 'border-l-amber-400';
    case 'success':
      return 'border-l-emerald-400';
    case 'mission':
      return 'border-l-blue-400';
    case 'agent':
      return 'border-l-purple-400';
    case 'system':
      return 'border-l-cyan-400';
    default:
      return 'border-l-sky-400';
  }
}

// ─── Notification Item ──────────────────────────────────────────────
function NotificationItem({
  notification,
  onSelect,
}: {
  notification: AppNotification;
  onSelect: (n: AppNotification) => void;
}) {
  return (
    <button
      onClick={() => onSelect(notification)}
      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors border-l-2 ${getNotificationBorderColor(notification.type)} ${
        notification.read
          ? 'bg-transparent hover:bg-primary/5'
          : 'bg-primary/5 hover:bg-primary/10'
      }`}
    >
      <span className="mt-0.5 flex-shrink-0">{getNotificationIcon(notification.type)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${notification.read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
            {notification.title}
          </span>
          {!notification.read && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}

// ─── Notification Panel ─────────────────────────────────────────────
export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { subscribe, unsubscribe } = useWebSocket();
  const { notifications, addNotification, markAsRead, markAllAsRead, unreadCount } =
    useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef<((event: any) => void) | null>(null);

  const count = unreadCount();

  // Subscribe to system:notification WebSocket events
  useEffect(() => {
    const handler = (event: { type: string; payload: Record<string, unknown>; timestamp: string }) => {
      const payload = event.payload || {};
      addNotification({
        type: (payload.notificationType as NotificationType) || 'info',
        title: (payload.title as string) || 'System Notification',
        message: (payload.message as string) || 'A new event occurred',
        timestamp: event.timestamp || new Date().toISOString(),
        link: payload.link as string | undefined,
        meta: payload.meta as Record<string, unknown> | undefined,
      });
    };

    handlerRef.current = handler;
    subscribe('system:notification', handler);

    // Also listen for mission and agent events to generate notifications
    const missionHandler = (event: { type: string; payload: Record<string, unknown>; timestamp: string }) => {
      const payload = event.payload || {};
      const state = payload.state as string | undefined;
      const name = payload.name as string | undefined;
      if (state && name) {
        addNotification({
          type: state === 'FAILED' ? 'error' : state === 'COMPLETED' ? 'success' : 'mission',
          title: `Mission ${state.toLowerCase()}`,
          message: `"${name}" transitioned to ${state}`,
          timestamp: event.timestamp || new Date().toISOString(),
          link: '/missions',
        });
      }
    };
    subscribe('mission:state-changed', missionHandler);

    const collaborationHandler = (event: { type: string; payload: Record<string, unknown>; timestamp: string }) => {
      const payload = event.payload || {};
      addNotification({
        type: 'system',
        title: 'Collaboration Update',
        message: (payload.description as string) || 'A collaboration event occurred',
        timestamp: event.timestamp || new Date().toISOString(),
        link: '/orchestration',
      });
    };
    subscribe('orchestration:collaboration', collaborationHandler);

    return () => {
      if (handlerRef.current) unsubscribe('system:notification', handlerRef.current);
      unsubscribe('mission:state-changed', missionHandler);
      unsubscribe('orchestration:collaboration', collaborationHandler);
    };
  }, [subscribe, unsubscribe, addNotification]);

  // Handle notification click — mark read and navigate
  const handleNotificationSelect = useCallback(
    (n: AppNotification) => {
      markAsRead(n.id);
      if (n.link) {
        onClose();
        router.push(n.link);
      }
    },
    [markAsRead, onClose, router]
  );

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Use a small delay so the opening click doesn't close it immediately
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  const recentNotifications = notifications.slice(0, 10);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-card shadow-xl shadow-black/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
          {count > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {count > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notification List */}
      {recentNotifications.length > 0 ? (
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {recentNotifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onSelect={handleNotificationSelect} />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground/60">Real-time alerts will appear here</p>
        </div>
      )}

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <p className="text-center text-[11px] text-muted-foreground">
            Showing {recentNotifications.length} of {notifications.length} notifications
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Badge Component (used in header) ───────────────────────────────
export function NotificationBadge() {
  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}
