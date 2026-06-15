/**
 * Tests for the Zustand notification store.
 * Focuses on: state transitions, unread counting, and the 50-item cap.
 */

import { useNotificationStore } from '@/store/notification-store';
import type { AppNotification } from '@/store/notification-store';

// Helper to build a notification payload (omits auto-generated id and read)
function makeNotification(overrides: Partial<Omit<AppNotification, 'id' | 'read'>> = {}) {
  return {
    type: 'info' as const,
    title: 'Test notification',
    message: 'Something happened',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  // Reset Zustand store between tests
  useNotificationStore.setState({ notifications: [] });
});

// ─── Initial state ─────────────────────────────────────────────────
describe('initial state', () => {
  it('starts with empty notifications', () => {
    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(0);
  });

  it('unreadCount is 0 initially', () => {
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
});

// ─── addNotification ───────────────────────────────────────────────
describe('addNotification', () => {
  it('adds a notification to the store', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Test notification');
  });

  it('marks new notification as unread by default', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    const { notifications } = useNotificationStore.getState();
    expect(notifications[0].read).toBe(false);
  });

  it('auto-generates an id', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    const { notifications } = useNotificationStore.getState();
    expect(notifications[0].id).toBeTruthy();
    expect(notifications[0].id).toMatch(/^notif-/);
  });

  it('prepends (newest first)', () => {
    useNotificationStore.getState().addNotification(makeNotification({ title: 'First' }));
    useNotificationStore.getState().addNotification(makeNotification({ title: 'Second' }));
    const { notifications } = useNotificationStore.getState();
    expect(notifications[0].title).toBe('Second');
    expect(notifications[1].title).toBe('First');
  });

  it('caps notifications at 50', () => {
    for (let i = 0; i < 55; i++) {
      useNotificationStore.getState().addNotification(makeNotification({ title: `Notif ${i}` }));
    }
    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(50);
  });

  it('keeps the 50 most recent notifications', () => {
    for (let i = 0; i < 55; i++) {
      useNotificationStore.getState().addNotification(makeNotification({ title: `Notif ${i}` }));
    }
    const { notifications } = useNotificationStore.getState();
    // Newest is "Notif 54", oldest kept should be "Notif 5"
    expect(notifications[0].title).toBe('Notif 54');
    expect(notifications[49].title).toBe('Notif 5');
  });
});

// ─── markAsRead ────────────────────────────────────────────────────
describe('markAsRead', () => {
  it('marks a specific notification as read', () => {
    useNotificationStore.getState().addNotification(makeNotification({ title: 'A' }));
    useNotificationStore.getState().addNotification(makeNotification({ title: 'B' }));

    const idA = useNotificationStore.getState().notifications.find((n) => n.title === 'A')!.id;
    useNotificationStore.getState().markAsRead(idA);

    const { notifications } = useNotificationStore.getState();
    const a = notifications.find((n) => n.title === 'A')!;
    const b = notifications.find((n) => n.title === 'B')!;
    expect(a.read).toBe(true);
    expect(b.read).toBe(false);
  });

  it('does not change other notifications', () => {
    useNotificationStore.getState().addNotification(makeNotification({ title: 'X' }));
    useNotificationStore.getState().addNotification(makeNotification({ title: 'Y' }));

    const idX = useNotificationStore.getState().notifications.find((n) => n.title === 'X')!.id;
    useNotificationStore.getState().markAsRead(idX);

    const y = useNotificationStore.getState().notifications.find((n) => n.title === 'Y')!;
    expect(y.read).toBe(false);
  });
});

// ─── markAllAsRead ─────────────────────────────────────────────────
describe('markAllAsRead', () => {
  it('marks all notifications as read', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());

    useNotificationStore.getState().markAllAsRead();

    const { notifications } = useNotificationStore.getState();
    expect(notifications.every((n) => n.read)).toBe(true);
  });

  it('updates unreadCount to 0', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());

    useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
});

// ─── clearAll ──────────────────────────────────────────────────────
describe('clearAll', () => {
  it('empties the store', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().addNotification(makeNotification());

    useNotificationStore.getState().clearAll();

    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(0);
  });

  it('resets unreadCount to 0', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
});

// ─── unreadCount ───────────────────────────────────────────────────
describe('unreadCount', () => {
  it('returns correct count with mixed read/unread', () => {
    useNotificationStore.getState().addNotification(makeNotification({ title: 'A' }));
    useNotificationStore.getState().addNotification(makeNotification({ title: 'B' }));
    useNotificationStore.getState().addNotification(makeNotification({ title: 'C' }));

    // All 3 unread
    expect(useNotificationStore.getState().unreadCount()).toBe(3);

    // Mark one as read
    const idA = useNotificationStore.getState().notifications.find((n) => n.title === 'A')!.id;
    useNotificationStore.getState().markAsRead(idA);
    expect(useNotificationStore.getState().unreadCount()).toBe(2);
  });

  it('returns 0 when all are read', () => {
    useNotificationStore.getState().addNotification(makeNotification());
    useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
});
