// BlogArchiveView saf filtre yardımcıları (spec 03 §2.1).
//
// Kategori chip listesi hardcoded (iOS birebir). Arama: title/excerpt içerir (tr duyarsız).
// Kategori filtresi: "all" hepsi, aksi car.category eşit. UI'dan bağımsız test.

import type { BlogPost } from '../../models/blog';
import { containsCaseInsensitiveTr } from '../../utils/turkishText';

/** Hardcoded kategori chip id'leri (spec §2.1). "all" etiketi UI'da "Tümü". */
export const BLOG_CATEGORY_CHIPS: string[] = [
  'all',
  'Rehber',
  'Teknoloji',
  'İnceleme',
  'Şarj İstasyonları',
  'Sektör',
];

/** Chip etiketi — "all" → "Tümü", aksi kategori adı. */
export function blogChipLabel(chip: string): string {
  return chip === 'all' ? 'Tümü' : chip;
}

/**
 * Blogları kategori + arama sorgusuna göre süz (spec §2.1). Kategori "all" → hepsi; aksi
 * category eşit. Arama title/excerpt içinde (tr duyarsız). Boş sorgu → yalnızca kategori.
 */
export function filterBlogs(
  blogs: BlogPost[],
  categoryFilter: string,
  searchQuery: string,
): BlogPost[] {
  const query = searchQuery.trim();
  return blogs.filter((blog) => {
    if (categoryFilter !== 'all' && blog.category !== categoryFilter) return false;
    if (query.length === 0) return true;
    return (
      containsCaseInsensitiveTr(blog.title, query) ||
      containsCaseInsensitiveTr(blog.excerpt ?? '', query)
    );
  });
}
