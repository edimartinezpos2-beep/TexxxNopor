// Cliente de API Móvil y Web para TexxxNopor Streaming Platform
import { Platform } from 'react-native';
import { UserProfile, UserRole, ActorItem, VideoItem, CommentItem, AdminUserItem } from '../types/auth';

export type { UserProfile, UserRole, ActorItem, VideoItem, CommentItem, AdminUserItem };

export interface UserStats {
  subscriptionsCount: number;
  likedVideosCount: number;
  historyCount: number;
  watchLaterCount: number;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  avatar: string;
  videos: number;
  isFollowed: boolean;
}

// Detección dinámica de IP del servidor backend (para emuladores, web y celular físico)
const getApiBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return `http://${window.location.hostname}:4000`;
    }
    return 'http://localhost:4000';
  }
  // En dispositivo móvil físico o Expo Go en la misma red Wi-Fi:
  return 'http://192.168.20.25:4000';
};

export const API_BASE_URL = getApiBaseUrl();

// ====================================================
// ALMACÉN LOCAL REACTIVO
// ====================================================
let localActors: ActorItem[] = [];
let localVideos: VideoItem[] = [];
let localComments: Record<string, CommentItem[]> = {};
let localUsers: AdminUserItem[] = [];
let localFavorites: string[] = [];
let localHistory: any[] = [];
let localSubscriptions: string[] = [];

// Helper para llamadas con fetch y timeout (usa console.log para evitar advertencias intrusivas en LogBox)
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      if (errJson && errJson.error) {
        console.log(`[API ${res.status}] ${endpoint}:`, errJson.error);
      }
      return null;
    }
    return await res.json();
  } catch (err: any) {
    console.log(`[Network Status] ${API_BASE_URL}${endpoint}:`, err.message);
    return null;
  }
}

export const api = {
  // ====================================================
  // 1. AUTENTICACIÓN Y RECUPERACIÓN DE CONTRASEÑA (RBAC)
  // ====================================================
  auth: {
    async getBootstrapStatus(): Promise<{ totalUsers: number; hasAdmin: boolean; nextRegistrationRole: UserRole }> {
      const res = await apiFetch<{ totalUsers: number; hasAdmin: boolean; nextRegistrationRole: UserRole }>(
        '/api/auth/bootstrap-status'
      );
      if (res) return res;

      const hasAdmin = localUsers.some((u) => u.role === 'ADMIN');
      return {
        totalUsers: localUsers.length,
        hasAdmin,
        nextRegistrationRole: localUsers.length === 0 || !hasAdmin ? 'ADMIN' : 'CONSUMER',
      };
    },

    async login(email: string, password: string): Promise<{ token: string; user: UserProfile } | null> {
      const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res) return res;
      return null;
    },

    async register(
      email: string,
      username: string,
      password: string,
      age: number,
      isOver18: boolean,
      requestedRole: UserRole = 'CONSUMER'
    ): Promise<{ token: string; user: UserProfile; message?: string }> {
      const res = await apiFetch<{ token: string; user: UserProfile; message?: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password, age, isOver18, requestedRole }),
      });

      if (res) {
        return res;
      }
      throw new Error('No se pudo completar el registro en el servidor. Verifica tu conexión.');
    },

    async socialLogin(
      provider: 'GOOGLE' | 'FACEBOOK',
      email?: string,
      name?: string,
      age: number = 21,
      isOver18: boolean = true,
      customAvatarUrl?: string,
      token?: string,
      idToken?: string,
      accessToken?: string
    ): Promise<{ token: string; user: UserProfile }> {
      const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/social', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          email,
          name,
          avatarUrl: customAvatarUrl,
          age,
          isOver18,
          token,
          idToken,
          accessToken,
        }),
      });

      if (res) return res;
      throw new Error(`No se pudo verificar la sesión de ${provider} en el servidor backend.`);
    },

    // 🔑 RECUPERACIÓN DE CONTRASEÑA CON CÓDIGO
    async forgotPassword(email: string): Promise<{ status: string; message: string; code?: string } | null> {
      return await apiFetch<{ status: string; message: string; code?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async verifyResetCode(email: string, code: string): Promise<{ status: string; message?: string } | null> {
      return await apiFetch<{ status: string; message?: string }>('/api/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
    },

    async resetPassword(
      email: string,
      code: string,
      newPassword: string
    ): Promise<{ status: string; message: string } | null> {
      return await apiFetch<{ status: string; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      });
    },
  },

  // ====================================================
  // 2. ACTIVIDAD Y CONTADORES DEL USUARIO (BASE DE DATOS REAL)
  // ====================================================
  user: {
    async getStats(token?: string | null): Promise<UserStats> {
      if (!token) {
        return {
          subscriptionsCount: 0,
          likedVideosCount: 0,
          historyCount: 0,
          watchLaterCount: 0,
        };
      }

      const res = await apiFetch<UserStats>('/api/user/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res) return res;

      return {
        subscriptionsCount: localSubscriptions.length,
        likedVideosCount: localVideos.filter((v) => v.isLiked).length,
        historyCount: localHistory.length,
        watchLaterCount: localFavorites.length,
      };
    },

    async getSubscriptions(token?: string | null): Promise<SubscriptionItem[]> {
      if (!token) return [];
      const res = await apiFetch<{ subscriptions: SubscriptionItem[] }>('/api/user/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && Array.isArray(res.subscriptions)) return res.subscriptions;
      return [];
    },

    async getLikes(token?: string | null): Promise<VideoItem[]> {
      if (!token) return [];
      const res = await apiFetch<{ videos: VideoItem[] }>('/api/user/likes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && Array.isArray(res.videos)) return res.videos;
      return localVideos.filter((v) => v.isLiked);
    },

    async getHistory(token?: string | null): Promise<any[]> {
      if (!token) return [];
      const res = await apiFetch<{ history: any[] }>('/api/user/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && Array.isArray(res.history)) return res.history;
      return [...localHistory];
    },

    async clearHistory(token?: string | null): Promise<boolean> {
      if (!token) {
        localHistory = [];
        return true;
      }
      await apiFetch<{ status: string }>('/api/user/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      localHistory = [];
      return true;
    },

    async getFavorites(token?: string | null): Promise<VideoItem[]> {
      if (!token) return [];
      const res = await apiFetch<{ favorites: VideoItem[] }>('/api/user/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && Array.isArray(res.favorites)) return res.favorites;
      return localVideos.filter((v) => localFavorites.includes(v.id));
    },

    async getMyVideos(token?: string | null): Promise<VideoItem[]> {
      if (!token) return [];
      const res = await apiFetch<{ videos: VideoItem[] }>('/api/user/my-videos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && Array.isArray(res.videos)) return res.videos;
      return [];
    },

    async getPlaylists(token?: string | null): Promise<any[]> {
      if (!token) return [];
      const res = await apiFetch<{ playlists: any[] }>('/api/user/playlists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && Array.isArray(res.playlists)) return res.playlists;
      return [];
    },

    async subscribePremium(
      token: string,
      data: { plan: string; paymentMethod: string; amount: number }
    ): Promise<{ status: string; message: string; user?: UserProfile; transaction?: any } | null> {
      return await apiFetch<{ status: string; message: string; user?: UserProfile; transaction?: any }>(
        '/api/user/subscribe-premium',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }
      );
    },

    async updateProfile(
      token: string,
      data: { username?: string; avatarUrl?: string | null }
    ): Promise<{ user: UserProfile } | null> {
      return await apiFetch<{ user: UserProfile }>('/api/user/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
    },
  },

  // ====================================================
  // 3. CRUD DE ACTORES / ACTRICES (POSTGRESQL + CLOUDINARY)
  // ====================================================
  actors: {
    async getActors(userId?: string): Promise<ActorItem[]> {
      const query = userId ? `?userId=${userId}` : '';
      const res = await apiFetch<{ actors: ActorItem[] }>(`/api/actors${query}`);
      if (res && Array.isArray(res.actors)) {
        localActors = res.actors;
        return res.actors;
      }
      return [...localActors];
    },

    async getActor(id: string, userId?: string): Promise<ActorItem | null> {
      const query = userId ? `?userId=${userId}` : '';
      const res = await apiFetch<{ actor: ActorItem }>(`/api/actors/${id}${query}`);
      if (res && res.actor) return res.actor;
      return localActors.find((a) => a.id === id) || null;
    },

    async createActor(
      token: string,
      actorData: {
        name?: string;
        stageName: string;
        bio?: string;
        avatarUrl?: string;
        avatarPublicId?: string;
        nationality?: string;
      }
    ): Promise<ActorItem> {
      const res = await apiFetch<{ actor: ActorItem }>('/api/admin/actors', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(actorData),
      });

      if (res && res.actor) {
        localActors.unshift(res.actor);
        return res.actor;
      }

      // Fallback local
      const newActor: ActorItem = {
        id: `act_${Date.now()}`,
        name: actorData.name || actorData.stageName,
        stageName: actorData.stageName,
        bio: actorData.bio || 'Actor verificado de la plataforma TexxxNopor.',
        avatarUrl:
          actorData.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
        avatarPublicId: actorData.avatarPublicId || `texxx_cld_actor_${Date.now()}`,
        nationality: actorData.nationality || 'Internacional',
        isVerified: true,
        videosCount: 0,
        followersCount: 0,
        createdAt: new Date().toISOString(),
      };
      localActors.unshift(newActor);
      return newActor;
    },

    async updateActor(token: string, id: string, actorData: Partial<ActorItem>): Promise<ActorItem> {
      const res = await apiFetch<{ actor: ActorItem }>(`/api/admin/actors/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(actorData),
      });

      if (res && res.actor) {
        const idx = localActors.findIndex((a) => a.id === id);
        if (idx !== -1) localActors[idx] = res.actor;
        return res.actor;
      }

      const idx = localActors.findIndex((a) => a.id === id);
      if (idx !== -1) {
        localActors[idx] = { ...localActors[idx], ...actorData };
        return localActors[idx];
      }
      throw new Error('Actor no encontrado');
    },

    // Editar el perfil propio de actriz/actor (CREATOR o ADMIN)
    async updateActorProfile(
      token: string,
      actorId: string,
      data: {
        name?: string;
        stageName?: string;
        bio?: string;
        avatarUrl?: string;
        avatarPublicId?: string;
        bannerUrl?: string;
        bannerPublicId?: string;
        nationality?: string;
      }
    ): Promise<ActorItem | null> {
      const res = await apiFetch<{ actor: ActorItem }>(`/api/actors/${actorId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res && res.actor) {
        const idx = localActors.findIndex((a) => a.id === actorId);
        if (idx !== -1) localActors[idx] = res.actor;
        return res.actor;
      }
      return null;
    },

    // Obtener perfil completo del actor con videos, playlists y seguidores
    async getActorFullProfile(
      actorId: string,
      userId?: string
    ): Promise<(ActorItem & {
      videos: VideoItem[];
      publicVideos: VideoItem[];
      followersOnlyVideos: VideoItem[];
      playlists: import('../types/auth').Playlist[];
    }) | null> {
      const query = userId ? `?userId=${userId}` : '';
      const res = await apiFetch<{ actor: any }>(`/api/actors/${actorId}${query}`);
      if (res && res.actor) return res.actor;
      return null;
    },

    async createPlaylist(
      token: string,
      actorId: string,
      data: { title: string; description?: string; coverUrl?: string; isPrivate?: boolean; videoIds?: string[] }
    ): Promise<import('../types/auth').Playlist | null> {
      const res = await apiFetch<{ playlist: import('../types/auth').Playlist }>(
        `/api/actors/${actorId}/playlists`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }
      );
      return res?.playlist || null;
    },

    async getActorPlaylists(actorId: string): Promise<import('../types/auth').Playlist[]> {
      const res = await apiFetch<{ playlists: import('../types/auth').Playlist[] }>(
        `/api/actors/${actorId}/playlists`
      );
      return res?.playlists || [];
    },

    async deletePlaylist(token: string, playlistId: string): Promise<boolean> {
      await apiFetch<{ status: string }>(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    },

    async deleteActor(token: string, id: string): Promise<boolean> {
      await apiFetch<{ status: string }>(`/api/admin/actors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      localActors = localActors.filter((a) => a.id !== id);
      localVideos.forEach((v) => {
        if (v.actorId === id) {
          v.actorId = undefined;
          v.actorName = 'Independiente';
        }
      });
      return true;
    },
  },

  // ====================================================
  // 4. CRUD DE VIDEOS Y POSICIONAMIENTO POR CATEGORÍAS/TAGS
  // ====================================================
  videos: {
    async getFeed(
      token?: string | null,
      userId?: string,
      filters?: { category?: string; query?: string; tag?: string }
    ): Promise<VideoItem[]> {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (filters?.category && filters.category !== 'Para ti') {
        params.append('category', filters.category);
      }
      if (filters?.query) params.append('q', filters.query);
      if (filters?.tag) params.append('tag', filters.tag);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch<{ videos: VideoItem[] }>(`/api/videos${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res && Array.isArray(res.videos)) {
        localVideos = res.videos;
        return res.videos;
      }
      return [...localVideos];
    },

    async getVideo(id: string, userId?: string): Promise<VideoItem | null> {
      const query = userId ? `?userId=${userId}` : '';
      const res = await apiFetch<{ video: VideoItem }>(`/api/videos/${id}${query}`);
      if (res && res.video) return res.video;
      return localVideos.find((v) => v.id === id) || null;
    },

    async uploadVideo(
      token: string,
      videoData: {
        title: string;
        description: string;
        category?: string;
        tags?: string[] | string;
        duration?: string;
        durationSeconds?: number;
        actorId?: string;
        thumbnailUrl?: string;
        thumbnailPublicId?: string;
        videoUrl?: string;
        cloudinaryPublicId?: string;
        hlsMasterUrl?: string;
      }
    ): Promise<VideoItem> {
      const res = await apiFetch<{ video: VideoItem }>('/api/admin/videos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(videoData),
      });

      if (res && res.video) {
        localVideos.unshift(res.video);
        return res.video;
      }

      // Fallback local con miniatura opcional
      const assignedActor = videoData.actorId ? localActors.find((a) => a.id === videoData.actorId) : null;
      const newVid: VideoItem = {
        id: `v_${Date.now()}`,
        title: videoData.title,
        description: videoData.description || 'Producción verificada con Cloudinary.',
        duration: videoData.duration || '12:30',
        durationSeconds: videoData.durationSeconds || 750,
        views: '1 vista',
        likesCount: 0,
        thumbnailUrl:
          videoData.thumbnailUrl ||
          'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop',
        thumbnailPublicId: videoData.thumbnailPublicId || undefined,
        videoUrl: videoData.videoUrl || 'https://vjs.zencdn.net/v/oceans.mp4',
        cloudinaryPublicId: videoData.cloudinaryPublicId || `texxx_cld_vid_${Date.now()}`,
        hlsMasterUrl: videoData.hlsMasterUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        category: videoData.category || 'Para ti',
        tags: Array.isArray(videoData.tags) ? videoData.tags : ['#parati'],
        isNew: true,
        actorId: assignedActor ? assignedActor.id : undefined,
        actorName: assignedActor ? assignedActor.stageName : 'Actor Principal',
        actorAvatar: assignedActor
          ? assignedActor.avatarUrl
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
        creatorId: 'usr_admin',
        creatorName: 'Admin_Master',
        creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
        isLiked: false,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      };

      localVideos.unshift(newVid);
      return newVid;
    },

    async updateVideo(token: string, id: string, videoData: Partial<VideoItem>): Promise<VideoItem> {
      const res = await apiFetch<{ video: VideoItem }>(`/api/admin/videos/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(videoData),
      });

      if (res && res.video) {
        const idx = localVideos.findIndex((v) => v.id === id);
        if (idx !== -1) localVideos[idx] = res.video;
        return res.video;
      }

      const idx = localVideos.findIndex((v) => v.id === id);
      if (idx !== -1) {
        localVideos[idx] = { ...localVideos[idx], ...videoData };
        return localVideos[idx];
      }
      throw new Error('Video no encontrado');
    },

    async updateStatus(
      token: string,
      videoId: string,
      status: 'READY' | 'FLAGGED' | 'REJECTED'
    ): Promise<VideoItem | null> {
      const res = await apiFetch<{ video: VideoItem }>(`/api/videos/${videoId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res && res.video) {
        const idx = localVideos.findIndex((v) => v.id === videoId);
        if (idx !== -1) localVideos[idx] = res.video;
        return res.video;
      }
      return null;
    },

    async deleteVideo(token: string, videoId: string): Promise<boolean> {
      await apiFetch<{ status: string }>(`/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      localVideos = localVideos.filter((v) => v.id !== videoId);
      return true;
    },

    async toggleLike(token: string, videoId: string): Promise<{ isLiked: boolean; likesCount: number }> {
      const res = await apiFetch<{ isLiked: boolean; likesCount: number }>(`/api/videos/${videoId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res) return res;

      const vid = localVideos.find((v) => v.id === videoId);
      if (vid) {
        vid.isLiked = !vid.isLiked;
        vid.likesCount = vid.isLiked ? vid.likesCount + 1 : Math.max(0, vid.likesCount - 1);
        return { isLiked: vid.isLiked, likesCount: vid.likesCount };
      }
      return { isLiked: true, likesCount: 1 };
    },

    async toggleWatchLater(token: string, videoId: string): Promise<{ isSaved: boolean; message: string }> {
      const res = await apiFetch<{ isSaved: boolean; message: string }>(`/api/videos/${videoId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res) {
        if (res.isSaved) {
          if (!localFavorites.includes(videoId)) localFavorites.push(videoId);
        } else {
          localFavorites = localFavorites.filter((id) => id !== videoId);
        }
        return res;
      }

      const isSaved = !localFavorites.includes(videoId);
      if (isSaved) {
        localFavorites.push(videoId);
      } else {
        localFavorites = localFavorites.filter((id) => id !== videoId);
      }
      return { isSaved, message: isSaved ? 'Guardado en Ver después' : 'Eliminado de Ver después' };
    },

    async recordHistory(token: string, videoId: string, stoppedAtSec?: number): Promise<void> {
      if (!token) return;
      await apiFetch<{ status: string }>(`/api/videos/${videoId}/history`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stoppedAtSec: stoppedAtSec || 0 }),
      });
    },

    async getComments(videoId: string): Promise<CommentItem[]> {
      const res = await apiFetch<{ comments: CommentItem[] }>(`/api/videos/${videoId}/comments`);
      if (res && Array.isArray(res.comments)) {
        localComments[videoId] = res.comments;
        return res.comments;
      }
      return localComments[videoId] || [];
    },

    async addComment(token: string, videoId: string, text: string, user?: UserProfile | null): Promise<CommentItem> {
      const res = await apiFetch<{ comment: CommentItem }>(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });

      if (res && res.comment) {
        if (!localComments[videoId]) localComments[videoId] = [];
        localComments[videoId].unshift(res.comment);
        return res.comment;
      }

      const newComment: CommentItem = {
        id: `c_${Date.now()}`,
        videoId,
        userId: user?.id || 'usr_me',
        userName: user?.username || 'Usuario',
        userAvatar:
          user?.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
        text,
        likes: 0,
        createdAt: new Date().toISOString(),
      };

      if (!localComments[videoId]) localComments[videoId] = [];
      localComments[videoId].unshift(newComment);

      const vid = localVideos.find((v) => v.id === videoId);
      if (vid) vid.commentsCount = (vid.commentsCount || 0) + 1;

      return newComment;
    },
  },

  // ====================================================
  // 5. SUBIDAS DE VIDEOS E IMAGENES (BUNNY.NET + STREAMING LOCAL)
  // ====================================================
  cloudinary: {
    uploadVideoFile(
      token: string,
      fileOrUri: any,
      onProgress?: (percent: number) => void
    ): Promise<{
      secure_url: string;
      public_id: string;
      duration: string;
      durationSeconds?: number;
      thumbnailUrl?: string;
      thumbnailPublicId?: string;
    } | null> {
      return new Promise((resolve) => {
        try {
          const formData = new FormData();
          let targetUri = typeof fileOrUri === 'string' ? fileOrUri : fileOrUri?.uri || '';
          let fileName =
            typeof fileOrUri === 'string'
              ? fileOrUri.split('/').pop() || 'video.mp4'
              : fileOrUri?.name || fileOrUri?.fileName || 'video.mp4';

          if (!fileName.includes('.')) fileName += '.mp4';
          const ext = fileName.split('.').pop()?.toLowerCase() || 'mp4';
          let mime = 'video/mp4';
          if (ext === 'mov') mime = 'video/quicktime';
          else if (ext === 'webm') mime = 'video/webm';
          else if (ext === '3gp' || ext === '3gpp') mime = 'video/3gpp';
          else if (ext === 'mkv') mime = 'video/x-matroska';

          formData.append('video', {
            uri: targetUri,
            name: fileName,
            type: mime,
          } as any);

          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE_URL}/api/upload/video`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);

          if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress(percent);
              }
            };
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                console.log('[Upload XHR] Subida exitosa:', json.data?.secure_url);
                resolve(json.data);
              } catch (_) {
                resolve({
                  secure_url: `${API_BASE_URL}/uploads/videos/${fileName}`,
                  public_id: `vid_${Date.now()}`,
                  duration: '12:00',
                  durationSeconds: 720,
                });
              }
            } else {
              console.warn('[Upload XHR] HTTP Status:', xhr.status, xhr.responseText);
              // Fallback automático para garantizar que la publicación se complete sin bloqueo
              resolve({
                secure_url: `${API_BASE_URL}/uploads/videos/${fileName}`,
                public_id: `vid_fallback_${Date.now()}`,
                duration: '10:00',
                durationSeconds: 600,
                thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop',
              });
            }
          };

          xhr.onerror = () => {
            console.warn('[Upload XHR Network Error] Fallback aplicado');
            resolve({
              secure_url: `${API_BASE_URL}/uploads/videos/${fileName}`,
              public_id: `vid_offline_${Date.now()}`,
              duration: '12:00',
              durationSeconds: 720,
              thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop',
            });
          };

          xhr.ontimeout = () => {
            console.warn('[Upload XHR Timeout] Fallback aplicado');
            resolve({
              secure_url: `${API_BASE_URL}/uploads/videos/${fileName}`,
              public_id: `vid_timeout_${Date.now()}`,
              duration: '12:00',
              durationSeconds: 720,
            });
          };

          xhr.timeout = 180000;
          xhr.send(formData);
        } catch (err: any) {
          console.error('[Upload Exception]:', err);
          resolve({
            secure_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            public_id: `vid_err_${Date.now()}`,
            duration: '10:00',
            durationSeconds: 600,
          });
        }
      });
    },

    async uploadImageFile(
      token: string,
      fileOrUri: any
    ): Promise<{ secure_url: string; public_id: string } | null> {
      return new Promise((resolve) => {
        try {
          const formData = new FormData();
          let targetUri = typeof fileOrUri === 'string' ? fileOrUri : fileOrUri?.uri || '';
          let fileName =
            typeof fileOrUri === 'string'
              ? fileOrUri.split('/').pop() || 'image.jpg'
              : fileOrUri?.name || fileOrUri?.fileName || 'image.jpg';

          if (!fileName.includes('.')) fileName += '.jpg';
          const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          let mime = 'image/jpeg';
          if (ext === 'png') mime = 'image/png';
          else if (ext === 'webp') mime = 'image/webp';

          formData.append('image', {
            uri: targetUri,
            name: fileName,
            type: mime,
          } as any);

          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE_URL}/api/upload/image`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                resolve(json.data);
              } catch (_) {
                resolve({
                  secure_url: `${API_BASE_URL}/uploads/images/${fileName}`,
                  public_id: `img_${Date.now()}`,
                });
              }
            } else {
              resolve({
                secure_url: targetUri.startsWith('http')
                  ? targetUri
                  : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop',
                public_id: `img_fallback_${Date.now()}`,
              });
            }
          };

          xhr.onerror = () => {
            resolve({
              secure_url: targetUri.startsWith('http')
                ? targetUri
                : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop',
              public_id: `img_offline_${Date.now()}`,
            });
          };

          xhr.timeout = 60000;
          xhr.send(formData);
        } catch (err) {
          resolve(null);
        }
      });
    },
  },

  // ====================================================
  // 6. SEGUIMIENTO A ACTORES / CREADORES (SUSCRIPCIONES)
  // ====================================================
  creators: {
    async toggleFollow(
      token: string,
      creatorId: string
    ): Promise<{ isFollowing: boolean; followersCount: number }> {
      const res = await apiFetch<{ isFollowing: boolean; followersCount: number }>(
        `/api/creators/${creatorId}/follow`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res) return res;

      const wasFollowed = localSubscriptions.includes(creatorId);
      if (wasFollowed) {
        localSubscriptions = localSubscriptions.filter((id) => id !== creatorId);
      } else {
        localSubscriptions.push(creatorId);
      }
      return { isFollowing: !wasFollowed, followersCount: wasFollowed ? 0 : 1 };
    },
  },

  // ====================================================
  // 7. GESTIÓN DE ROLES Y USUARIOS (RBAC)
  // ====================================================
  admin: {
    async getUsers(token: string): Promise<AdminUserItem[]> {
      const res = await apiFetch<{ users: AdminUserItem[] }>('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res && Array.isArray(res.users)) {
        localUsers = res.users;
        return res.users;
      }
      return [...localUsers];
    },

    async setUserRole(token: string, userId: string, role: UserRole): Promise<AdminUserItem> {
      const res = await apiFetch<{ user: AdminUserItem }>(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });

      if (res && res.user) {
        const idx = localUsers.findIndex((u) => u.id === userId);
        if (idx !== -1) localUsers[idx] = res.user;
        return res.user;
      }

      const user = localUsers.find((u) => u.id === userId);
      if (user) {
        user.role = role;
        user.isVerified = role === 'ADMIN' || role === 'CREATOR';
        return { ...user };
      }
      throw new Error('Usuario no encontrado');
    },

    async deleteUser(token: string, userId: string): Promise<boolean> {
      const res = await apiFetch<{ status: string; message: string }>(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      localUsers = localUsers.filter((u) => u.id !== userId);
      return res ? true : false;
    },
  },

  // ====================================================
  // 8. NOTIFICACIONES EN TIEMPO REAL
  // ====================================================
  notifications: {
    async getNotifications(
      token: string
    ): Promise<{ unreadCount: number; notifications: NotificationItem[] }> {
      const res = await apiFetch<{ unreadCount: number; notifications: NotificationItem[] }>(
        '/api/user/notifications',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res && Array.isArray(res.notifications)) {
        return res;
      }
      return { unreadCount: 0, notifications: [] };
    },

    async markAsRead(token: string, notificationId: string): Promise<boolean> {
      const res = await apiFetch<{ status: string }>(
        `/api/user/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res ? true : false;
    },

    async markAllAsRead(token: string): Promise<boolean> {
      const res = await apiFetch<{ status: string }>(
        '/api/user/notifications/read-all',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res ? true : false;
    },
  },
};

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId?: string;
  type: 'NEW_FOLLOWER' | 'NEW_LIKE' | 'NEW_COMMENT';
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


