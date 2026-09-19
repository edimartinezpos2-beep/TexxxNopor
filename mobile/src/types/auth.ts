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
  stageName?: string;
  isVip?: boolean;
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
  isShort?: boolean;
  aspectRatio?: string;
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

export interface LiveStreamItem {
  id: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  title: string;
  category: string;
  viewersCount: number;
  likesCount?: number;
  streamUrl: string;
  startedAt: string;
  streamThumbnail?: string;
  goalText?: string;
  goalPercent?: number;
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
  isSuspended?: boolean;
  suspensionReason?: string | null;
  kycStatus?: string;
  isVip?: boolean;
  avatarUrl?: string | null;
  activityCount?: number;
  createdAt: string;
}

export interface KycItem {
  id: string;
  userId: string;
  documentType: string;
  documentNumber: string;
  fullName: string;
  birthDate?: string | null;
  frontDocumentUrl: string;
  backDocumentUrl?: string | null;
  selfieWithDocUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    avatarUrl?: string | null;
  };
}

export interface ReportItem {
  id: string;
  reason: string;
  description: string;
  evidenceUrl?: string | null;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes?: string | null;
  createdAt: string;
  reporterEmail: string;
  reporter?: { id: string; email: string; username: string };
  targetUser?: { id: string; email: string; username: string; isSuspended: boolean };
  video?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    status: string;
    actor?: { name: string; stageName: string };
  };
}

export interface AuditLogItem {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  admin?: { id: string; email: string; username: string; avatarUrl?: string };
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
