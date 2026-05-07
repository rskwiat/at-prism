export interface Upload {
  id: string;
  userDid: string;
  userHandle: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  isPublic: boolean;
  isListed: boolean;
  blueskyPostUri: string | null;
  createdAt: string;
  likeCount: number;
  hasLiked: boolean;
}

export interface User {
  did: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  cursor: string | null;
}

export interface ApiError {
  error: string;
  message: string;
}