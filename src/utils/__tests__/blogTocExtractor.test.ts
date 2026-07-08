import { describe, it, expect } from '@jest/globals';
import { BlogTocExtractor } from '../blogTocExtractor';

describe('BlogTocExtractor.extract — Markdown', () => {
  it('başlık seviyelerini ve tr-katlamalı slug id çıkarır', () => {
    const items = BlogTocExtractor.extract(
      '# Başlık Bir\nnormal metin\n## Alt Başlık\n### Üç Nokta',
    );
    // Türkçe noktasız "ı" slug'da [a-z0-9] filtresine takılıp düşer (web ile birebir):
    // "Başlık" → "baslık" → "baslk".
    expect(items).toEqual([
      { id: 'baslk-bir', level: 1, text: 'Başlık Bir' },
      { id: 'alt-baslk', level: 2, text: 'Alt Başlık' },
      { id: 'uc-nokta', level: 3, text: 'Üç Nokta' },
    ]);
  });

  it('tekrarlanan başlıklar için -2, -3 son eki', () => {
    const items = BlogTocExtractor.extract('# Test\n## Test\n### Test');
    expect(items.map((i) => i.id)).toEqual(['test', 'test-2', 'test-3']);
  });
});

describe('BlogTocExtractor.extract — HTML', () => {
  it('h1-h4 arası başlıkları, iç etiketleri sıyırarak çıkarır', () => {
    const html =
      '<p>giriş</p><h2>İçindekiler</h2><h3><strong>Alt</strong> Bölüm</h3><h5>atla</h5>';
    const items = BlogTocExtractor.extract(html);
    expect(items).toEqual([
      { id: 'icindekiler', level: 2, text: 'İçindekiler' },
      { id: 'alt-bolum', level: 3, text: 'Alt Bölüm' },
    ]);
  });
});

describe('BlogTocExtractor.injectHeadingIds', () => {
  it('öznitelikli başlığa id enjekte eder, özniteliksizi atlar', () => {
    const html = '<h2 class="a">First</h2><h3>Second</h3>';
    const items = BlogTocExtractor.extract(html);
    const injected = BlogTocExtractor.injectHeadingIds(html, items);
    expect(injected).toBe('<h2 class="a" id="first">First</h2><h3>Second</h3>');
  });

  it('zaten id içeren başlığı değiştirmez', () => {
    const html = '<h2 id="var">Bir</h2>';
    const items = BlogTocExtractor.extract(html);
    expect(BlogTocExtractor.injectHeadingIds(html, items)).toBe(html);
  });

  it('boş item listesinde HTML aynen döner', () => {
    const html = '<h2 class="a">Bir</h2>';
    expect(BlogTocExtractor.injectHeadingIds(html, [])).toBe(html);
  });
});