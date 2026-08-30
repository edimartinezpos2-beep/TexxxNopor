export enum UserRole {
  ADMIN = 'ADMIN',
  CREATOR = 'CREATOR',
  CONSUMER = 'CONSUMER',
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  creatorId?: string;
}

export interface Actor {
  id: string;
  name: string;
  stageName: string;
  bio?: string;
  avatarUrl: string;
  avatarPublicId?: string;
  nationality?: string;
  isVerified: boolean;
  videosCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface VideoModel {
  id: string;
  title: string;
  description: string;
  duration: string;
  durationSeconds?: number;
  views: number;
  likesCount: number;
  thumbnailUrl: string;
  thumbnailPublicId?: string;
  videoUrl: string;
  cloudinaryPublicId?: string;
  hlsMasterUrl?: string;
  category: string;
  isNew: boolean;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  creatorAvatar?: string;
  isLiked?: boolean;
  commentsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format?: string;
  bytes?: number;
  duration?: number;
  width?: number;
  height?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
