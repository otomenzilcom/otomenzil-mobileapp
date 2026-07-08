import { describe, it, expect } from '@jest/globals';

import {
  normalizeSlug,
  isSlugValid,
  profilePreviewPath,
  profileUrl,
} from '../accountSlug';

describe('normalizeSlug', () => {
  it('lowercases and replaces disallowed chars with a single hyphen', () => {
    expect(normalizeSlug('Örnek Kullanıcı')).toBe('rnek-kullan-c');
    expect(normalizeSlug('Ali_Veli')).toBe('ali-veli');
    expect(normalizeSlug('a@@@b')).toBe('a-b');
  });

  it('collapses repeated hyphens and trims leading/trailing hyphens', () => {
    expect(normalizeSlug('--a--b--')).toBe('a-b');
    expect(normalizeSlug('  spaced  ')).toBe('spaced');
    expect(normalizeSlug('---')).toBe('');
  });

  it('keeps digits and existing hyphens', () => {
    expect(normalizeSlug('user-123')).toBe('user-123');
  });
});

describe('isSlugValid', () => {
  it('requires at least 3 chars after normalization', () => {
    expect(isSlugValid('ab')).toBe(false);
    expect(isSlugValid('a-b')).toBe(true);
    expect(isSlugValid('  a  ')).toBe(false);
    expect(isSlugValid('---')).toBe(false);
    expect(isSlugValid('abc')).toBe(true);
  });
});

describe('profilePreviewPath', () => {
  it('wraps the slug in /uye/<slug>/', () => {
    expect(profilePreviewPath('ornek')).toBe('/uye/ornek/');
  });

  it('falls back to a placeholder when empty', () => {
    expect(profilePreviewPath('')).toBe('/uye/kullanici-adin/');
    expect(profilePreviewPath('', 'kullanici-adi')).toBe('/uye/kullanici-adi/');
  });
});

describe('profileUrl', () => {
  it('builds the absolute profile url', () => {
    expect(profileUrl('https://www.otomenzil.com', 'ornek')).toBe(
      'https://www.otomenzil.com/uye/ornek/',
    );
  });
});
