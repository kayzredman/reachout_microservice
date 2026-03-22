// Shared types and interfaces for FaithReach microservices

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'admin' | 'manager';
  subscriptionTier: 'starter' | 'creator' | 'ministry-pro';
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAccount {
  id: string;
  userId: string;
  platform: 'facebook' | 'instagram' | 'x' | 'youtube' | 'linkedin';
  accessToken: string;
  refreshToken?: string;
  accountUsername: string;
  connectedAt: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: string;
  publishedAt?: string;
  seriesId?: string;
  theme?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostPlatform {
  id: string;
  postId: string;
  platformAccountId: string;
  formattedContent: string;
  status: 'pending' | 'published' | 'failed';
  platformPostId?: string;
  previewUrl?: string;
  errorMessage?: string;
}

export interface Series {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface Analytics {
  id: string;
  postPlatformId: string;
  engagementRate: number;
  reach: number;
  followerGrowth: number;
  clickThroughRate: number;
  collectedAt: string;
}

export interface AIContentSuggestion {
  id: string;
  postId: string;
  suggestionType: 'caption' | 'hashtags' | 'rewrite' | 'prediction';
  suggestionContent: string;
  createdAt: string;
}
