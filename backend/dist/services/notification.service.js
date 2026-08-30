"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const app_1 = require("../app");
// Memoria compartida de notificaciones rápidas en caso de fallbacks
const inMemoryNotifications = [];
class NotificationService {
    /**
     * Crear y despachar una nueva notificación en tiempo real
     */
    static async notify({ recipientId, actorId, type, title, message, senderName, senderAvatar, videoId, videoTitle, videoThumb, commentText, }) {
        // No notificarse a uno mismo
        if (recipientId === actorId)
            return null;
        const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const nowIso = new Date().toISOString();
        const notifItem = {
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
        if (inMemoryNotifications.length > 500)
            inMemoryNotifications.pop();
        try {
            if (app_1.prisma.notification) {
                await app_1.prisma.notification.create({
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
        }
        catch (e) {
            console.warn('⚠️ [NotificationService] Fallback a memoria:', e.message);
        }
        console.log(`🔔 [Notificación Creada] ${title}: "${message}" para usuario/actor ${recipientId}`);
        return notifItem;
    }
    /**
     * Obtener notificaciones para un usuario o actor
     */
    static async getForUser(userId) {
        let list = [];
        try {
            if (app_1.prisma.notification) {
                const dbNotifs = await app_1.prisma.notification.findMany({
                    where: { recipientId: userId },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                });
                list = dbNotifs.map((n) => ({
                    ...n,
                    createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
                }));
            }
        }
        catch (_) {
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
    static async markAsRead(notificationId, userId) {
        const mem = inMemoryNotifications.find((n) => n.id === notificationId && n.recipientId === userId);
        if (mem)
            mem.read = true;
        try {
            if (app_1.prisma.notification) {
                await app_1.prisma.notification.updateMany({
                    where: { id: notificationId, recipientId: userId },
                    data: { read: true },
                });
            }
        }
        catch (_) { }
        return true;
    }
    /**
     * Marcar todas las notificaciones como leídas
     */
    static async markAllAsRead(userId) {
        inMemoryNotifications.forEach((n) => {
            if (n.recipientId === userId)
                n.read = true;
        });
        try {
            if (app_1.prisma.notification) {
                await app_1.prisma.notification.updateMany({
                    where: { recipientId: userId },
                    data: { read: true },
                });
            }
        }
        catch (_) { }
        return true;
    }
}
exports.NotificationService = NotificationService;
