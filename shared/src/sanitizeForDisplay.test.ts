import { describe, expect, it } from 'vitest';
import { sanitizeForDisplay } from './index.js';

describe('sanitizeForDisplay (datamodel.md Consolidated view sanitization)', () => {
  it.fails('strips C0 control characters and ESC (0x1B)', () => {
    expect(sanitizeForDisplay('a\x00b\x07c\x1bd')).toBe('abcd');
    // Newlines/tabs/CR are C0 too; phrases are single-line, so they go.
    expect(sanitizeForDisplay('a\tb\nc\rd')).toBe('abcd');
  });

  it.fails('strips C1 control characters (0x80–0x9F)', () => {
    expect(sanitizeForDisplay('a\x80b\x9fc')).toBe('abc');
  });

  it.fails('removes bidi override characters (U+202A–202E, U+2066–2069)', () => {
    expect(sanitizeForDisplay('a‪b‮c⁦d⁩e')).toBe('abcde');
  });

  it.fails('removes zero-width characters (U+200B–200D, U+FEFF)', () => {
    expect(sanitizeForDisplay('a​b‌c‍d﻿e')).toBe('abcde');
  });

  it.fails('leaves ordinary text, punctuation, and emoji unchanged', () => {
    expect(sanitizeForDisplay('A crocodile at the dentist!')).toBe(
      'A crocodile at the dentist!',
    );
    expect(sanitizeForDisplay('déjà vu — "quote" (99%) \u{1F40A}\u{1F9B7}')).toBe(
      'déjà vu — "quote" (99%) \u{1F40A}\u{1F9B7}',
    );
  });

  it.fails('is idempotent', () => {
    const raw = 'a\x1b‮b​c\td';
    const once = sanitizeForDisplay(raw);
    expect(sanitizeForDisplay(once)).toBe(once);
    expect(once).toBe('abcd');
  });
});
