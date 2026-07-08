// İçerik ekranı test sabitleri — BlogPost fabrikası (jest testMatch __tests__ tarar; burası hariç).

import type { BlogPost } from '../../../models/blog';

export function makeBlog(overrides: Partial<BlogPost> & Pick<BlogPost, 'id' | 'title'>): BlogPost {
  return {
    ...overrides,
  } as BlogPost;
}
