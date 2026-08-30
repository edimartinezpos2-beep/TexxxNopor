import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Bell,
  X,
  UserPlus,
  Heart,
  MessageSquare,
  CheckCheck,
  ChevronRight,
  Film,
  Sparkles,
  Check,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, NotificationItem } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectVideo?: (video: any) => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  onSelectVideo,
  onViewActor,
}) => {
  const { colors, isDark } = useTheme();
  const { userToken, user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'NEW_FOLLOWER' | 'NEW_LIKE' | 'NEW_COMMENT'>('ALL');

  const loadNotifications = useCallback(async () => {
    if (!userToken) return;
    try {
      const res = await api.notifications.getNotifications(userToken);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.log('Error loading notifications:', err);
    }
  }, [userToken]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadNotifications().finally(() => setLoading(false));
    }
  }, [visible, loadNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.read || !userToken) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await api.notifications.markAsRead(userToken, item.id);
  };

  const handleMarkAllAsRead = async () => {
    if (!userToken) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await api.notifications.markAllAsRead(userToken);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'ALL') return true;
    return n.type === selectedFilter;
  });

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Justo ahora';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `Hace ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `Hace ${diffDays} d`;
      return date.toLocaleDateString();
    } catch (_) {
      return 'Reciente';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerTitleRow}>
            <View style={styles.bellIconBox}>
              <Bell size={18} color="#FF2D55" fill="#FF2D55" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notificaciones</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadgePill}>
                    <Text style={styles.unreadBadgeText}>{unreadCount} nuevas</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Seguidores, likes y comentarios en tiempo real
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[styles.markAllBtn, { borderColor: colors.border }]}
                onPress={handleMarkAllAsRead}
                activeOpacity={0.7}
              >
                <CheckCheck size={14} color={colors.primary} />
                <Text style={[styles.markAllBtnText, { color: colors.primary }]}>Leídas</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtros de Categorías */}
        <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'NEW_FOLLOWER', label: 'Seguidores 👤' },
            { id: 'NEW_LIKE', label: 'Me Gusta ❤️' },
            { id: 'NEW_COMMENT', label: 'Comentarios 💬' },
          ].map((tab) => {
            const isSelected = selectedFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterPill,
                  { borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && { backgroundColor: colors.primaryGlow },
                ]}
                onPress={() => setSelectedFilter(tab.id as any)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                    isSelected && { fontWeight: 'bold' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista de Notificaciones */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <Bell size={42} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No tienes notificaciones aún</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Cuando un usuario comience a seguirte, le dé me gusta a tus videos o deje un comentario, lo verás reflejado aquí inmediatamente.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 14, gap: 10 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
            renderItem={({ item }) => {
              const isUnread = !item.read;

              return (
                <TouchableOpacity
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: isUnread ? (isDark ? '#20161C' : '#FFF0F3') : colors.surfaceCard,
                      borderColor: isUnread ? '#FF2D55' : colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    handleMarkAsRead(item);
                    if (item.type === 'NEW_FOLLOWER' && onViewActor) {
                      onClose();
                      onViewActor(item.actorId, item.senderName);
                    } else if ((item.type === 'NEW_LIKE' || item.type === 'NEW_COMMENT') && onSelectVideo && item.videoId) {
                      onClose();
                      onSelectVideo({
                        id: item.videoId,
                        title: item.videoTitle || 'Video',
                        thumbnailUrl: item.videoThumb,
                      });
                    }
                  }}
                >
                  {/* Icono / Avatar */}
                  <View style={styles.avatarContainer}>
                    <Image
                      source={{
                        uri:
                          item.senderAvatar ||
                          item.videoThumb ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
                      }}
                      style={styles.senderAvatar}
                    />
                    {/* Badge pequeño con tipo de interacción */}
                    <View
                      style={[
                        styles.typeBadgeSmall,
                        item.type === 'NEW_FOLLOWER'
                          ? { backgroundColor: '#007AFF' }
                          : item.type === 'NEW_LIKE'
                          ? { backgroundColor: '#FF2D55' }
                          : { backgroundColor: '#30D158' },
                      ]}
                    >
                      {item.type === 'NEW_FOLLOWER' ? (
                        <UserPlus size={10} color="#FFFFFF" />
                      ) : item.type === 'NEW_LIKE' ? (
                        <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
                      ) : (
                        <MessageSquare size={10} color="#FFFFFF" fill="#FFFFFF" />
                      )}
                    </View>
                  </View>

                  {/* Contenido de la Notificación */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.notifTime, { color: colors.textMuted }]}>{formatTimeAgo(item.createdAt)}</Text>
                    </View>

                    <Text style={[styles.notifMessage, { color: isUnread ? colors.textPrimary : colors.textSecondary }]} numberOfLines={2}>
                      {item.message}
                    </Text>

                    {/* Previsualización del comentario si existe */}
                    {item.commentText && (
                      <View style={[styles.commentQuoteBox, { backgroundColor: isDark ? '#141418' : '#F0F0F5', borderColor: colors.border }]}>
                        <Text style={[styles.commentQuoteText, { color: colors.textSecondary }]} numberOfLines={1}>
                          "{item.commentText}"
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Miniatura de video si aplica */}
                  {item.videoThumb ? (
                    <Image source={{ uri: item.videoThumb }} style={styles.videoMiniThumb} />
                  ) : (
                    <ChevronRight size={16} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bellIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  unreadBadgePill: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 36,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  typeBadgeSmall: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  notifTime: {
    fontSize: 10,
  },
  notifMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  commentQuoteBox: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  commentQuoteText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  videoMiniThumb: {
    width: 46,
    height: 46,
    borderRadius: 8,
  },
});
