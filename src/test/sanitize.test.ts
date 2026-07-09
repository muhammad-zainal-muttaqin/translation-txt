import { describe, it, expect } from 'vitest';
import {
  sanitizeTranslationOutput,
  stripReasoningArtifacts,
  detectMetaCommentary,
} from '../lib/sanitize';

describe('stripReasoningArtifacts', () => {
  it('removes paired <think> blocks', () => {
    const input = '<think>let me plan this</think>Hello world.';
    expect(stripReasoningArtifacts(input)).toBe('Hello world.');
  });

  it('removes <thinking> and <reasoning> variants', () => {
    expect(stripReasoningArtifacts('<thinking>x</thinking>A')).toBe('A');
    expect(stripReasoningArtifacts('<reasoning>y</reasoning>B')).toBe('B');
  });

  it('leaves ordinary text untouched', () => {
    expect(stripReasoningArtifacts('The knight thought about it.')).toBe(
      'The knight thought about it.'
    );
  });
});

describe('sanitizeTranslationOutput', () => {
  it('strips an English preamble', () => {
    const input = 'Here is the translation:\nHello world.';
    expect(sanitizeTranslationOutput(input)).toBe('Hello world.');
  });

  it('strips an Indonesian preamble', () => {
    const input = 'Berikut terjemahannya:\nHalo dunia.';
    expect(sanitizeTranslationOutput(input)).toBe('Halo dunia.');
  });

  it('unwraps a bare code fence for plain text', () => {
    const input = '```\nHalo dunia.\n```';
    expect(sanitizeTranslationOutput(input, 'txt')).toBe('Halo dunia.');
  });

  it('does NOT unwrap fences for markdown (could be real content)', () => {
    const input = '```\ncode block\n```';
    expect(sanitizeTranslationOutput(input, 'md')).toBe('```\ncode block\n```');
  });

  it('preserves normal multi-line prose exactly', () => {
    const input = 'Line one.\nLine two.\nLine three.';
    expect(sanitizeTranslationOutput(input, 'txt')).toBe(input);
  });
});

describe('detectMetaCommentary', () => {
  it('flags the real leaked commentary example', () => {
    const leaked = `UNTUK MENGHEMAT TOKEN, SAYA POTONG. TAPI INI HANYA SEBAGAI CONTOH. Sebenarnya teks asli memiliki banyak bagian setelah ini? Mari kita periksa. Saya akan menulis ulang di bawah ini sebagai output final.`;
    const result = detectMetaCommentary(leaked);
    expect(result.flagged).toBe(true);
    expect(result.markers.length).toBeGreaterThan(0);
  });

  it('flags a single critical marker (refusal / AI self-reference)', () => {
    expect(detectMetaCommentary('As an AI language model, I cannot translate this.').flagged).toBe(true);
    expect(detectMetaCommentary('Untuk menghemat token, saya ringkas bagian ini.').flagged).toBe(true);
  });

  it('does NOT flag ordinary translated prose', () => {
    const prose = `The rain fell all night. She zipped up her jacket and stepped outside, thinking about what tomorrow would bring.`;
    expect(detectMetaCommentary(prose).flagged).toBe(false);
  });

  it('does NOT flag a lone ambiguous phrase in dialogue', () => {
    // "let me check" alone is suspicious but not enough on its own.
    expect(detectMetaCommentary('"Let me check the door," she whispered.').flagged).toBe(false);
  });

  it('flags when two suspicious phrases co-occur', () => {
    const text = 'I will write the rest now. Let me continue with the original text.';
    expect(detectMetaCommentary(text).flagged).toBe(true);
  });
});
