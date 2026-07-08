import { describe, it, expect } from '@jest/globals';

import { BLOG_CATEGORY_CHIPS, blogChipLabel, filterBlogs } from '../blogArchiveFilter';
import { makeBlog } from '../__fixtures__/blogs';

const blogs = [
  makeBlog({ id: '1', title: 'Togg T10X İncelemesi', category: 'İnceleme', excerpt: 'Yerli EV' }),
  makeBlog({ id: '2', title: 'Şarj İstasyonu Rehberi', category: 'Şarj İstasyonları' }),
  makeBlog({ id: '3', title: 'Batarya Teknolojisi', category: 'Teknoloji', excerpt: 'LFP vs NMC' }),
];

describe('blogChipLabel', () => {
  it('maps "all" to "Tümü" and keeps others', () => {
    expect(blogChipLabel('all')).toBe('Tümü');
    expect(blogChipLabel('Rehber')).toBe('Rehber');
  });
});

describe('BLOG_CATEGORY_CHIPS', () => {
  it('matches the iOS hardcoded chip list', () => {
    expect(BLOG_CATEGORY_CHIPS).toEqual([
      'all',
      'Rehber',
      'Teknoloji',
      'İnceleme',
      'Şarj İstasyonları',
      'Sektör',
    ]);
  });
});

describe('filterBlogs', () => {
  it('returns all when category=all and query empty', () => {
    expect(filterBlogs(blogs, 'all', '')).toHaveLength(3);
  });

  it('filters by category', () => {
    expect(filterBlogs(blogs, 'Teknoloji', '').map((b) => b.id)).toEqual(['3']);
  });

  it('searches title and excerpt (tr case-insensitive)', () => {
    expect(filterBlogs(blogs, 'all', 'togg').map((b) => b.id)).toEqual(['1']);
    expect(filterBlogs(blogs, 'all', 'lfp').map((b) => b.id)).toEqual(['3']);
  });

  it('combines category and query', () => {
    expect(filterBlogs(blogs, 'İnceleme', 'yerli').map((b) => b.id)).toEqual(['1']);
    expect(filterBlogs(blogs, 'Teknoloji', 'togg')).toHaveLength(0);
  });
});
