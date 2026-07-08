// EngagementAPI — iOS EngagementAPI.swift karşılığı (spec §3.4): puanlama, yorum, beğeni,
// karşılaştırma yorumları. REST öncelikli, uca-özgü ajax fallback.
//
// Fallback matrisi (spec §3.4):
//  - rating status/vote, add review, blog like, add blog comment: HERHANGİ hatada ajax.
//  - reviews GET, blog comments GET: fallback YOK.
//  - compare comments GET: herhangi hatada ajax.
//  - compare comment POST: YALNIZCA 404'te ajax; diğer hatalar yeniden fırlatılır.
//
// Nonce açık parametre olarak geçirilir (authStore sağlar). Transport §2.7 (performEngagementAjax):
// `{success, data}` çözer, data'yı döndürür.

import type {
  BlogComment,
  BlogCommentResponse,
  BlogLikeResponse,
  CarRatingStatusResponse,
  CarRatingVoteResponse,
  CarReview,
  CarReviewResponse,
  CompareComment,
  CompareCommentResponse,
  CompareCommentsPayload,
} from '../models';
import { performEngagementAjax } from './ajax';
import { ApiError, getJson, postJson } from './http';

interface ReviewsListResponse {
  reviews: CarReview[];
}
interface BlogCommentsListResponse {
  comments: BlogComment[];
}

export class EngagementAPI {
  // ── Araç puanlama (§3.4 #23, #24) ────────────────────────────────────────────────

  /** #23: GET cars/{carId}/rating; herhangi hatada ajax otomenzil_car_rating_status. */
  async fetchCarRating(carId: string, nonce: string): Promise<CarRatingStatusResponse> {
    try {
      return await getJson<CarRatingStatusResponse>(`cars/${carId}/rating`, { store: false });
    } catch {
      return performEngagementAjax<CarRatingStatusResponse>('otomenzil_car_rating_status', {
        nonce,
        carId,
      });
    }
  }

  /** #24: POST cars/{carId}/rating/vote {rating}; herhangi hatada ajax (rating stringify). */
  async voteCarRating(carId: string, rating: number, nonce: string): Promise<CarRatingVoteResponse> {
    try {
      return await postJson<CarRatingVoteResponse>(`cars/${carId}/rating/vote`, { rating });
    } catch {
      return performEngagementAjax<CarRatingVoteResponse>('otomenzil_car_rating_vote', {
        nonce,
        carId,
        rating: String(rating),
      });
    }
  }

  // ── Araç yorumları (§3.4 #25, #26) ───────────────────────────────────────────────

  /** #25: GET cars/{slug}/reviews. Fallback yok. */
  async fetchCarReviews(slug: string): Promise<CarReview[]> {
    const response = await getJson<ReviewsListResponse>(`cars/${slug}/reviews`, { store: false });
    return response.reviews;
  }

  /** #26: POST cars/{carId}/reviews {comment, parentId?}; herhangi hatada ajax. */
  async addCarReview(
    carId: string,
    comment: string,
    nonce: string,
    parentId?: string
  ): Promise<CarReview> {
    try {
      const body = parentId !== undefined ? { comment, parentId } : { comment };
      const payload = await postJson<CarReviewResponse>(`cars/${carId}/reviews`, body);
      return payload.review;
    } catch {
      const fields: Record<string, string> = { nonce, carId, comment };
      if (parentId !== undefined && parentId.length > 0) fields.parentId = parentId;
      const payload = await performEngagementAjax<CarReviewResponse>('otomenzil_add_car_review', fields);
      return payload.review;
    }
  }

  // ── Blog yorumları / beğeni (§3.4 #27, #28, #29) ──────────────────────────────────

  /** #27: GET blogs/{slug}/comments. Fallback yok. */
  async fetchBlogComments(slug: string): Promise<BlogComment[]> {
    const response = await getJson<BlogCommentsListResponse>(`blogs/${slug}/comments`, {
      store: false,
    });
    return response.comments;
  }

  /** #28: POST blogs/{blogId}/like {}; herhangi hatada ajax. */
  async likeBlog(blogId: string, nonce: string): Promise<BlogLikeResponse> {
    try {
      return await postJson<BlogLikeResponse>(`blogs/${blogId}/like`, {});
    } catch {
      return performEngagementAjax<BlogLikeResponse>('otomenzil_blog_like', { nonce, blogId });
    }
  }

  /** #29: POST blogs/{blogId}/comments {text, parentId?}; herhangi hatada ajax. */
  async addBlogComment(
    blogId: string,
    text: string,
    nonce: string,
    parentId?: string
  ): Promise<BlogComment> {
    try {
      const body = parentId !== undefined ? { text, parentId } : { text };
      const payload = await postJson<BlogCommentResponse>(`blogs/${blogId}/comments`, body);
      return payload.comment;
    } catch {
      // iOS: blog yorumunda parentId varsa (boş olsa bile) eklenir — araç yorumundan farkı bu.
      const fields: Record<string, string> = { nonce, blogId, text };
      if (parentId !== undefined) fields.parentId = parentId;
      const payload = await performEngagementAjax<BlogCommentResponse>(
        'otomenzil_add_blog_comment',
        fields
      );
      return payload.comment;
    }
  }

  // ── Karşılaştırma yorumları (§3.4 #30, #31) ───────────────────────────────────────

  /** #30: GET compare/comments?carIds=a,b,c; herhangi hatada ajax (carIds JSON-stringify). */
  async fetchCompareComments(carIds: string[], nonce: string): Promise<CompareCommentsPayload> {
    const ids = carIds.join(',');
    try {
      return await getJson<CompareCommentsPayload>(
        `compare/comments?carIds=${encodeURIComponent(ids)}`,
        { store: false }
      );
    } catch {
      return performEngagementAjax<CompareCommentsPayload>('otomenzil_get_compare_comments', {
        nonce,
        carIds: JSON.stringify(carIds),
      });
    }
  }

  /** #31: POST compare/comments; YALNIZCA 404'te ajax, diğer hatalar yeniden fırlatılır. */
  async addCompareComment(
    carIds: string[],
    text: string,
    nonce: string,
    parentId?: string,
    preferredCarId?: string
  ): Promise<CompareComment> {
    const body: Record<string, unknown> = { carIds, text };
    if (parentId !== undefined) body.parentId = parentId;
    if (preferredCarId !== undefined) body.preferredCarId = preferredCarId;

    try {
      const payload = await postJson<CompareCommentResponse>('compare/comments', body);
      return payload.comment;
    } catch (err) {
      if (!(err instanceof ApiError && err.kind === 'badStatus' && err.status === 404)) {
        throw err;
      }
      // REST henüz sunucuda yok — ajax yedek.
    }

    const fields: Record<string, string> = { nonce, carIds: JSON.stringify(carIds), text };
    if (parentId !== undefined && parentId.length > 0) fields.parentId = parentId;
    if (preferredCarId !== undefined && preferredCarId.length > 0) fields.preferredCarId = preferredCarId;
    const payload = await performEngagementAjax<CompareCommentResponse>(
      'otomenzil_add_compare_comment',
      fields
    );
    return payload.comment;
  }
}

/** Uygulama genelinde paylaşılan tekil engagement istemcisi. */
export const engagementApi = new EngagementAPI();
