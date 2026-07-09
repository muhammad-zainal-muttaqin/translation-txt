/**
 * Output hardening for model translations.
 *
 * Models sometimes leak their own planning/reasoning into the translated text
 * ("let me check the original...", "to save tokens I'll cut this", "final
 * output below", stray <think> blocks, "Here is the translation:" preambles).
 * None of that belongs in a translation. This module removes the safe,
 * unambiguous cases (cleanup) and flags the degenerate cases (detection) so the
 * pipeline can retry or warn the user instead of silently shipping the junk.
 */

// Reasoning-tag wrappers that some models / gateways inline into `content`
// (DeepSeek-reasoner keeps them in a separate field, but not every gateway does).
const REASONING_BLOCK_PATTERNS: RegExp[] = [
  /<think>[\s\S]*?<\/think>/gi,
  /<thinking>[\s\S]*?<\/thinking>/gi,
  /<reasoning>[\s\S]*?<\/reasoning>/gi,
  /◁think▷[\s\S]*?◁\/think▷/gi, // ◁think▷ … ◁/think▷
  /\[thinking\][\s\S]*?\[\/thinking\]/gi,
];

// Conversational preambles a model adds before the actual translation.
const PREAMBLE_PATTERNS: RegExp[] = [
  /^\s*(?:sure|certainly|of course|okay|ok|alright)[,!.]?\s*(?:here(?:'s| is)?)[^\n:]*:\s*\n+/i,
  /^\s*here(?:'s| is)[^\n:]*translation[^\n:]*:\s*\n+/i,
  /^\s*(?:berikut|ini(?:lah)?)[^\n:]*(?:terjemahan|hasil)[^\n:]*:\s*\n+/i,
  /^\s*(?:translation|terjemahan)\s*:\s*\n+/i,
];

const STRUCTURED_OR_MARKDOWN = new Set(['md', 'markdown', 'json', 'xml', 'yaml', 'yml']);

/** Remove paired reasoning-tag blocks. Safe: these are never translation content. */
export function stripReasoningArtifacts(text: string): string {
  let out = text;
  for (const re of REASONING_BLOCK_PATTERNS) out = out.replace(re, '');
  return out;
}

/** Remove a single leading conversational preamble line. */
export function stripPreamble(text: string): string {
  let out = text;
  for (const re of PREAMBLE_PATTERNS) out = out.replace(re, '');
  return out;
}

/**
 * If the ENTIRE output is wrapped in one plain code fence the model added as a
 * container, unwrap it. Skipped for Markdown/structured formats where a whole
 * fenced block can be legitimate content.
 */
function stripWrappingFence(text: string, format?: string): string {
  if (format && STRUCTURED_OR_MARKDOWN.has(format)) return text;
  const t = text.trim();
  const m = t.match(/^```([^\n]*)\n([\s\S]*?)\n```$/);
  if (!m) return text;
  const lang = m[1].trim().toLowerCase();
  if (lang === '' || lang === 'text' || lang === 'plaintext' || lang === 'txt') {
    return m[2];
  }
  return text;
}

/** Full cleanup pass applied to every chunk response before it is stored. */
export function sanitizeTranslationOutput(raw: string, format?: string): string {
  let out = stripReasoningArtifacts(raw);
  out = stripPreamble(out);
  out = stripWrappingFence(out, format);
  return out.trim();
}

// --- Meta-commentary detection --------------------------------------------

export interface MetaCommentaryResult {
  flagged: boolean;
  markers: string[];
}

// CRITICAL markers essentially never occur in translated prose; one hit is
// enough to flag the output as the model narrating the task.
const CRITICAL_MARKERS: { re: RegExp; label: string }[] = [
  { re: /\bto save tokens?\b/i, label: 'to save tokens' },
  { re: /menghemat token/i, label: 'menghemat token' },
  { re: /\btoken (?:limit|budget)\b/i, label: 'token limit' },
  { re: /\bas an? (?:ai|language model)\b/i, label: 'as an AI' },
  { re: /\bsebagai (?:sebuah )?ai\b/i, label: 'sebagai AI' },
  { re: /\b(?:large )?language model\b/i, label: 'language model' },
  { re: /\bfor compliance\b/i, label: 'for compliance' },
  { re: /demi kepatuhan/i, label: 'demi kepatuhan' },
  { re: /\b(?:final output|output final|output lengkap)\b/i, label: 'final output' },
  { re: /karena keterbatasan/i, label: 'karena keterbatasan' },
  { re: /\bi (?:cannot|can't|am unable to|'m unable to) (?:translate|assist|help|continue|comply)/i, label: 'refusal' },
  { re: /\bi apologi[sz]e\b/i, label: 'apology' },
  { re: /\bmaaf(?:kan)?[, ]+(?:kalau|jika|ya)\b/i, label: 'maaf kalau' },
];

// SUSPICIOUS markers can appear in genuine dialogue, so two are required
// (or one SUSPICIOUS plus one CRITICAL) before flagging.
const SUSPICIOUS_MARKERS: { re: RegExp; label: string }[] = [
  { re: /\bi(?:'| wi)?ll (?:translate|write|continue|rewrite|now)/i, label: "I'll translate/write" },
  { re: /\bi will (?:translate|write|continue|rewrite|make|create|now)/i, label: 'I will translate/write' },
  { re: /saya akan (?:menerjemahkan|menulis|melanjutkan|membuat|menyatukan|menampilkan|memastikan)/i, label: 'saya akan menerjemahkan' },
  { re: /\blet me (?:check|write|continue|rewrite|explain)/i, label: 'let me check' },
  { re: /mari (?:kita )?(?:lanjut|lanjutkan|periksa)/i, label: 'mari kita periksa' },
  { re: /\bthe original text\b/i, label: 'the original text' },
  { re: /teks asli/i, label: 'teks asli' },
];

/**
 * Decide whether a chunk's output reads as the model talking about the task
 * rather than translating it. Weighted so a single unambiguous marker flags,
 * while ambiguous phrases need corroboration.
 */
export function detectMetaCommentary(text: string): MetaCommentaryResult {
  const markers: string[] = [];
  let weight = 0;

  for (const { re, label } of CRITICAL_MARKERS) {
    if (re.test(text)) {
      markers.push(label);
      weight += 2;
    }
  }
  for (const { re, label } of SUSPICIOUS_MARKERS) {
    if (re.test(text)) {
      markers.push(label);
      weight += 1;
    }
  }

  return { flagged: weight >= 2, markers };
}
