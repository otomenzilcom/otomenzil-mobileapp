// Etkileşim modelleri — EngagementModels.swift birebir (puanlama, yorum, beğeni).

import type { CarDetail } from './car';
import type { BlogPost } from './blog';

export interface FavoritesPayload {
  favorites: string[];
}

export interface CarRatingStats {
  average: number;
  count: number;
  hasVoted?: boolean; // voted = hasVoted ?? false
}

export interface CarRatingStatusResponse {
  average: number;
  count: number;
  hasVoted?: boolean; // voted = hasVoted ?? false
}

export interface CarRatingVoteResponse {
  recorded?: boolean;
  message?: string;
  stats?: CarRatingStats;
}

export interface CarReview {
  id: string;
  userName: string;
  memberSlug?: string;
  rating?: number;
  comment: string;
  date: string;
  carId?: string;
  parentId?: string;
  likes?: number;
}

export interface CarReviewResponse {
  review: CarReview;
}

export interface BlogComment {
  id: string;
  userName: string;
  memberSlug?: string;
  text: string;
  date: string;
  parentId?: string;
  likes?: number;
}

export interface BlogCommentResponse {
  comment: BlogComment;
}

export interface BlogLikeResponse {
  likes: number;
  userLiked: boolean;
}

export interface MessagePayload {
  message?: string;
}

/** Bildirimde tanımlı; detay çekimi aslında düz CarDetail decode ediyor. */
export interface CarDetailResponse {
  car: CarDetail;
  reviews?: CarReview[];
}

/** Bildirimde tanımlı; detay çekimi aslında düz BlogPost decode ediyor. */
export interface BlogDetailResponse {
  blog: BlogPost;
  comments?: BlogComment[];
}

export interface CompareComment {
  id: string;
  userName: string;
  memberSlug?: string;
  text: string;
  date: string;
  parentId?: string;
  likes?: number;
  preferredCarId?: string;
}

export interface CompareCommentsPayload {
  comments: CompareComment[];
  likedCommentIds?: string[];
  compareKey?: string;
}

export interface CompareCommentResponse {
  comment: CompareComment;
}
