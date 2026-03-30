import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  BackendNotification,
  apiGetNotifications,
  apiGetUnreadCount,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
} from '@/lib/api';

// Derive the socket root URL from the API base (strip trailing /api)
const SOCKET_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
).replace(/\/api\/?$/, '');

interface NotificationContextType {
  notifications: BackendNotification[];
  unreadCount: number;
  isLoading: boolean;
  markOneRead: (id: string | number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notifs, countData] = await Promise.all([
        apiGetNotifications(),
        apiGetUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(countData.count);
    } catch (err) {
      console.error('[notifications] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      // Logout — clear state and disconnect socket
      setNotifications([]);
      setUnreadCount(0);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Fetch initial data via REST (backend does NOT push on connect)
    fetchAll();

    // Connect Socket.IO with JWT from localStorage
    const token = localStorage.getItem('mel_token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('notification:new', (notification: BackendNotification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast(notification.title, { description: notification.message });
    });

    // Server sends this after any read action — sync count from truth
    socket.on('notification:unread-count', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] connect error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchAll]);

  const markOneRead = useCallback(
    async (id: string | number) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (String(n.id) === String(id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await apiMarkNotificationRead(id);
        // Server will emit notification:unread-count; we've already updated optimistically
      } catch (err) {
        console.error('[notifications] markOneRead error:', err);
        fetchAll(); // revert to server truth
      }
    },
    [fetchAll]
  );

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await apiMarkAllNotificationsRead();
    } catch (err) {
      console.error('[notifications] markAllRead error:', err);
      fetchAll(); // revert to server truth
    }
  }, [fetchAll]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, isLoading, markOneRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
