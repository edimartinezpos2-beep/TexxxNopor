import { prisma } from '../app';

export type NotificationType = 'NEW_FOLLOWER' | 'NEW_LIKE' | 'NEW_COMMENT';

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  senderName?: string;
  senderAvatar?: string;
  videoId?: string;
  videoTitle?: string;
  videoThumb?: string;
  commentText?: string;
  createdAt: string;
}

// Memoria compartida de notificaciones rápidas en caso de fallbacks
const inMemoryNotifications: NotificationItem[] = [];

export class NotificationService {
  /**
   * Crear y despachar una nueva notificación en tiempo real
   */
  static async notify({
    recipientId,
    actorId,
    type,
    title,
    message,
    senderName,
    senderAvatar,
    videoId,
    videoTitle,
    videoThumb,
    commentText,
  }: {
    recipientId: string;
    actorId?: string;
    type: NotificationType;
    title: string;
    message: string;
    senderName?: string;
    senderAvatar?: string;
    videoId?: string;
    videoTitle?: string;
    videoThumb?: string;
    commentText?: string;
  }) {
    // No notificarse a uno mismo
    if (recipientId === actorId) return null;

    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const notifItem: NotificationItem = {
      id,
      recipientId,
      actorId,
      type,
      title,
      message,
      read: false,
      senderName,
      senderAvatar,
      videoId,
      videoTitle,
      videoThumb,
      commentText,
      createdAt: nowIso,
    };

    inMemoryNotifications.unshift(notifItem);
    if (inMemoryNotifications.length > 500) inMemoryNotifications.pop();

    try {
      if ((prisma as any).notification) {
        await (prisma as any).notification.create({
          data: {
            id,
            recipientId,
            actorId,
            type,
            title,
            message,
            read: false,
            senderName,
            senderAvatar,
            videoId,
            videoTitle,
            videoThumb,
            commentText,
          },
        });
      }
    } catch (e: any) {
      console.warn('⚠️ [NotificationService] Fallback a memoria:', e.message);
    }

    console.log(`🔔 [Notificación Creada] ${title}: "${message}" para usuario/actor ${recipientId}`);
    return notifItem;
  }

  /**
   * Obtener notificaciones para un usuario o actor
   */
  static async getForUser(userId: string): Promise<{ unreadCount: number; notifications: NotificationItem[] }> {
    let list: NotificationItem[] = [];

    try {
      if ((prisma as any).notification) {
        const dbNotifs = await (prisma as any).notification.findMany({
          where: { recipientId: userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        list = dbNotifs.map((n: any) => ({
          ...n,
          createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
        }));
      }
    } catch (_) {
      // Usar memoria
    }

    if (list.length === 0) {
      list = inMemoryNotifications.filter((n) => n.recipientId === userId);
    }

    const unreadCount = list.filter((n) => !n.read).length;
    return { unreadCount, notifications: list };
  }

  /**
   * Marcar notificación específica como leída
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const mem = inMemoryNotifications.find((n) => n.id === notificationId && n.recipientId === userId);
    if (mem) mem.read = true;

    try {
      if ((prisma as any).notification) {
        await (prisma as any).notification.updateMany({
          where: { id: notificationId, recipientId: userId },
          data: { read: true },
        });
      }
    } catch (_) {}

    return true;
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    inMemoryNotifications.forEach((n) => {
      if (n.recipientId === userId) n.read = true;
    });

    try {
      if ((prisma as any).notification) {
        await (prisma as any).notification.updateMany({
          where: { recipientId: userId },
          data: { read: true },
        });
      }
    } catch (_) {}

    return true;
  }
}
