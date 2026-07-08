import { describe, it, expect } from '@jest/globals';

import {
  buildHtmlDocument,
  buildProseCss,
  darkHtmlColors,
  lightHtmlColors,
  parseBridgeMessage,
  reloadSignature,
} from '../htmlContentTemplate';

describe('buildProseCss — tema renkleri', () => {
  it('dark modda dark palet renklerini gömer', () => {
    const css = buildProseCss(true, 'article');
    expect(css).toContain(`color:${darkHtmlColors.text}`);
    expect(css).toContain(`color:${darkHtmlColors.heading}`);
    expect(css).toContain(darkHtmlColors.link);
    expect(css).toContain(darkHtmlColors.theadBg);
  });

  it('light modda light palet renklerini gömer', () => {
    const css = buildProseCss(false, 'article');
    expect(css).toContain(`color:${lightHtmlColors.text}`);
    expect(css).toContain(lightHtmlColors.link);
    expect(css).toContain(lightHtmlColors.theadBg);
  });

  it('article h2 kutulu (4px sol kenarlık, radius); legal h2 alt-kenarlık', () => {
    const article = buildProseCss(false, 'article');
    const legal = buildProseCss(false, 'legal');
    expect(article).toContain('font-size:1.25rem');
    expect(article).toContain('border-left:4px solid');
    expect(article).toContain('border-radius:0 1rem 1rem 0');
    expect(legal).toContain('font-size:1.05rem');
    expect(legal).not.toContain('border-radius:0 1rem 1rem 0');
  });

  it('legal blockquote gradient arka planı kullanır', () => {
    const legal = buildProseCss(true, 'legal');
    expect(legal).toContain('linear-gradient(90deg');
    expect(legal).toContain(darkHtmlColors.legalBlockquoteGradientStart);
  });

  it('başlıklar scroll-margin-top:96px içerir (anchor kaydırma için)', () => {
    expect(buildProseCss(false, 'article')).toContain('scroll-margin-top:96px');
  });

  it('li::marker link rengiyle boyanır', () => {
    expect(buildProseCss(false, 'article')).toContain(`li::marker{color:${lightHtmlColors.link}`);
  });
});

describe('buildHtmlDocument', () => {
  it('table\'ları yatay kaydırılabilir sarar', () => {
    const doc = buildHtmlDocument({
      html: '<table><tr><td>a</td></tr></table>',
      isDark: false,
      proseStyle: 'article',
    });
    expect(doc).toContain('<div class="table-wrap"><table>');
    expect(doc).toContain('</table></div>');
  });

  it('viewport meta ve DOCTYPE içerir', () => {
    const doc = buildHtmlDocument({ html: '<p>x</p>', isDark: true, proseStyle: 'legal' });
    expect(doc.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(doc).toContain('name="viewport"');
    expect(doc).toContain('<p>x</p>');
  });
});

describe('reloadSignature', () => {
  it('isDark/proseStyle/html değişince imza değişir', () => {
    const a = reloadSignature('<p>a</p>', false, 'article');
    expect(reloadSignature('<p>a</p>', true, 'article')).not.toBe(a);
    expect(reloadSignature('<p>a</p>', false, 'legal')).not.toBe(a);
    expect(reloadSignature('<p>b</p>', false, 'article')).not.toBe(a);
    expect(reloadSignature('<p>a</p>', false, 'article')).toBe(a);
  });
});

describe('parseBridgeMessage', () => {
  it('height mesajını çözer', () => {
    expect(parseBridgeMessage(JSON.stringify({ type: 'height', height: 512 }))).toEqual({
      type: 'height',
      height: 512,
    });
  });

  it('heading mesajını çözer (found)', () => {
    expect(
      parseBridgeMessage(JSON.stringify({ type: 'heading', id: 'x', offset: 240, found: true })),
    ).toEqual({ type: 'heading', id: 'x', offset: 240, found: true });
  });

  it('found alanı yoksa false olur', () => {
    const msg = parseBridgeMessage(JSON.stringify({ type: 'heading', id: 'x', offset: 0 }));
    expect(msg).toEqual({ type: 'heading', id: 'x', offset: 0, found: false });
  });

  it('geçersiz JSON / eksik alan → null', () => {
    expect(parseBridgeMessage('not json')).toBeNull();
    expect(parseBridgeMessage(JSON.stringify({ type: 'height' }))).toBeNull();
    expect(parseBridgeMessage(JSON.stringify({ type: 'other', height: 1 }))).toBeNull();
    expect(parseBridgeMessage(JSON.stringify({ type: 'height', height: 'x' }))).toBeNull();
    expect(parseBridgeMessage(JSON.stringify(null))).toBeNull();
  });
});
