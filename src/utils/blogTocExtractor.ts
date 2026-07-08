// İçindekiler (TOC) çıkarıcı — BlogTocExtractor.swift birebir.
// HTML tespiti → HTML yolu, değilse Markdown yolu. Başlık id slug'ı web
// `addHeadingIdsToHtml` ile eşleşir (tr_TR aksan-katlamalı).

import { foldDiacritics } from './turkishText';

export interface BlogTocItem {
  id: string;
  level: number;
  text: string;
}

// Swift `range(of:options:.regularExpression)` — .caseInsensitive YOK: büyük/küçük duyarlı.
const HTML_DETECT = /<(?:p|h[1-6]|table|figure|div|ul|ol|blockquote)\b/;

// Swift CharacterSet.newlines: LF, VT, FF, CR, NEL(U+0085), LS(U+2028), PS(U+2029).
const NEWLINES = new RegExp('[\\n\\r\\u000b\\u000c\\u0085\\u2028\\u2029]');

function isHtmlContent(content: string): boolean {
  return HTML_DETECT.test(content);
}

/**
 * Başlık id slug'ı: aksan-katla (lowercase dahil) → [^a-z0-9\s-] sil →
 * boşluk → "-" → baş/son "-" kırp; boşsa "baslik"; tekrarlar → base-2, base-3, …
 */
function uniqueHeadingId(text: string, used: Set<string>): string {
  const base = foldDiacritics(text)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');

  let candidate = base.length === 0 ? 'baslik' : base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function extractFromMarkdown(content: string): BlogTocItem[] {
  const items: BlogTocItem[] = [];
  const used = new Set<string>();

  for (const line of content.split(NEWLINES)) {
    const trimmed = line.trim();
    let level: number | null = null;
    let text = '';

    if (trimmed.startsWith('#### ')) {
      level = 4;
      text = trimmed.slice(5).trim();
    } else if (trimmed.startsWith('### ')) {
      level = 3;
      text = trimmed.slice(4).trim();
    } else if (trimmed.startsWith('## ')) {
      level = 2;
      text = trimmed.slice(3).trim();
    } else if (trimmed.startsWith('# ')) {
      level = 1;
      text = trimmed.slice(2).trim();
    }

    if (level != null && text.length > 0) {
      const id = uniqueHeadingId(text, used);
      items.push({ id, level, text });
    }
  }

  return items;
}

function extractFromHtml(html: string): BlogTocItem[] {
  const items: BlogTocItem[] = [];
  const used = new Set<string>();
  const regex = /<h([1-4])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    if (!(level >= 1 && level <= 4)) continue;
    const text = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length === 0) continue;
    const id = uniqueHeadingId(text, used);
    items.push({ id, level, text });
  }

  return items;
}

function extract(content: string): BlogTocItem[] {
  return isHtmlContent(content) ? extractFromHtml(content) : extractFromMarkdown(content);
}

/**
 * TOC bağlantıları için başlıklara sabit id enjekte eder (web addHeadingIdsToHtml eşleşir).
 * Regex tüm doküman üzerinde; eşleşmeler TERSTEN dolaşılır, item'larla sondan eşlenir.
 * NOT (parite): ÖZNİTELİKSİZ başlıklar ("<h2>") atlanır (Swift'te attrs grubu NSNotFound
 * → guard fail), ancak item indeksi yine de azalır — hizalama kayabilir.
 */
function injectHeadingIds(html: string, items: BlogTocItem[]): string {
  if (items.length === 0) return html;

  const regex = /<h([1-4])(\s[^>]*)?>/gi;
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    matches.push(m);
  }
  if (matches.length === 0) return html;

  let result = html;
  let itemIndex = items.length - 1;

  for (let i = matches.length - 1; i >= 0; i--) {
    if (itemIndex < 0) break;
    const match = matches[i];
    const attrs = match[2];

    // Öznitelik grubu eşleşmediyse (ör. "<h2>") atla — item indeksi yine azalır.
    if (attrs === undefined) {
      itemIndex -= 1;
      continue;
    }
    if (attrs.includes('id=')) {
      itemIndex -= 1;
      continue;
    }

    const level = match[1];
    const cleanedAttrs = attrs.replace(/\sid=(["'])[^"']*\1/g, '');
    const replacement = `<h${level}${cleanedAttrs} id="${items[itemIndex].id}">`;
    result =
      result.slice(0, match.index) + replacement + result.slice(match.index + match[0].length);

    itemIndex -= 1;
  }

  return result;
}

export const BlogTocExtractor = {
  extract,
  injectHeadingIds,
};
