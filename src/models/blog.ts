// Blog modelleri — BlogPost.swift birebir.

export interface BlogPost {
  id: string;
  title: string;
  excerpt?: string;
  category?: string;
  author?: string;
  authorSlug?: string;
  image?: string;
  readTimeMin?: number;
  date?: string; // görüntüleme metni, parse edilmez
  content?: string; // HTML
  tags?: string[];
  likes?: number;
  views?: number;
  userLiked?: boolean;
  reportReliability?: string;
  reportSource?: string;
  reportUpdated?: string;
  reportModel?: string;
  relatedCarIds?: string[];
  commentCount?: number;
}

export interface BlogListResponse {
  blogs: BlogPost[];
  count: number;
}
