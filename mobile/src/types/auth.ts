export type UserRole = 'ADMIN' | 'CREATOR' | 'CONSUMER';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  age?: number;
  authProvider?: 'LOCAL' | 'GOOGLE' | 'FACEBOOK';
  avatarUrl?: string;
  creatorProfileId?: string;
  isVerified?: boolean;
}

export interface ActorItem {
  id: string;
  userId?: string;
  name: string;
  stageName: string;
  bio?: string;
  avatarUrl: string;
  avatarPublicId?: string;
  bannerUrl?: string;
  bannerPublicId?: string;
  nationality?: string;
  isVerified: boolean;
  videosCount?: number;
  followersCount?: number;
  playlistsCount?: number;
  isFollowing?: boolean;
  createdAt?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  isPrivate: boolean;
  itemsCount: number;
  videos?: {
    id: string;
    title: string;
    thumbnailUrl: string;
    duration: string;
  }[];
  createdAt?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  durationSeconds?: number;
  views: number | string;
  viewsCount?: number;
  likesCount: number;
  thumbnailUrl: string;
  thumbnailPublicId?: string;
  videoUrl?: string;
  cloudinaryPublicId?: string;
  hlsMasterUrl: string;
  category: string;
  tags?: string[];
  isNew: boolean;
  isFollowersOnly?: boolean;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  creatorAvatar?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  actorFollowersCount?: number;
  isFollowingActor?: boolean;
  commentsCount?: number;
  createdAt?: string;
}

export interface CommentItem {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  likes: number;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthState {
  isLoading: boolean;
  userToken: string | null;
  user: UserProfile | null;
}

export interface AuthContextType extends AuthState {
  signIn: (token: string, user: UserProfile) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser?: (updated: Partial<UserProfile>) => void;
  switchRoleDebug?: (newRole: UserRole) => void;
}
