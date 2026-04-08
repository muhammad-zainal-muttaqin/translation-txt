import { LINE_ORIENTED_FORMATS, STRUCTURED_FORMATS } from '../types';

export interface PromptConfig {
  sourceLanguage: string;
  targetLanguage: string;
  customInstruction: string;
  useDefaultInstruction: boolean;
}

const DEFAULT_INSTRUCTION = `Translate the following text completely, naturally and accurately.
Maintain the original formatting, tone, and context; preserve line breaks, code fences, timestamps, and structural syntax.
Translate every line into the target language, including dialogue and exclamations inside quote brackets such as 「」, 『』, "", '', （）, or (). Brackets stay; the words inside them must be translated.
Do NOT leave source-language sound effects, interjections, or onomatopoeia (e.g. ああ, んっ, はぁ) untranslated — render them naturally in the target language.
For technical terms, provide appropriate translations while keeping important keywords recognizable.
Keep kinship terms and honorifics in romaji (e.g. onii-chan, -san, -sama). This is the ONLY thing that may stay in the source script's romanization — everything else must be translated.
Do not add commentary or notes.`;

const LANGUAGE_LABELS: Record<string, string> = {
  auto: 'auto-detected',
  en: 'English',
  id: 'Indonesian',
  ja: 'Japanese',
  es: 'Spanish',
  zh: 'Chinese',
  fr: 'French',
  de: 'German',
  ko: 'Korean',
  ru: 'Russian',
  ar: 'Arabic',
  pt: 'Portuguese',
  it: 'Italian',
  nl: 'Dutch',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  pl: 'Polish',
  tr: 'Turkish',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
};

function getLanguageLabel(code: string): string {
  return LANGUAGE_LABELS[code] || code;
}

const FORMAT_RULES: Record<string, string> = {
  txt: `TRANSLATE TEXT FILE - CRITICAL RULES:
- Keep exact line breaks and paragraph spacing
- Preserve any special formatting (bullets, numbers, dashes)
- Translate only readable text, keep symbols unchanged
- Maintain exact character count per line structure where possible
- Do not merge or split paragraphs`,

  csv: `TRANSLATE CSV FILE - CRITICAL RULES:
- Preserve ALL commas, quotes, and delimiters EXACTLY
- Keep header row structure identical
- Translate only cell content, NOT column names (unless specified)
- Maintain exact number of columns and rows
- Preserve empty cells as empty
- Keep any escape characters or special CSV formatting`,

  md: `TRANSLATE MARKDOWN FILE - CRITICAL RULES:
- Keep ALL markdown syntax: #, *, **, _, \`, [], (), etc.
- Preserve exact heading levels and structure
- Keep link URLs unchanged, translate only link text
- Maintain code blocks untranslated (\`\`\`code\`\`\`)
- Keep table structure identical
- Preserve line breaks and spacing exactly`,

  json: `TRANSLATE JSON FILE - CRITICAL RULES:
- Keep ALL JSON syntax: {}, [], "", :, , exactly as is
- Translate only string VALUES, never keys or structure
- Maintain exact indentation and formatting
- Preserve escape characters (\\n, \\t, \\", etc.)
- Keep numeric and boolean values unchanged
- Ensure valid JSON output`,

  log: `TRANSLATE LOG FILE - CRITICAL RULES:
- Keep ALL timestamps and log levels unchanged
- Preserve exact log entry format and structure
- Translate only human-readable message content
- Keep technical identifiers, IPs, codes unchanged
- Maintain chronological order
- Preserve any log formatting patterns`,

  srt: `TRANSLATE SUBRIP SUBTITLE FILE - CRITICAL RULES:
- Keep ALL timestamp formats EXACTLY (00:00:00,000 --> 00:00:00,000)
- Preserve subtitle numbering sequence
- Maintain exact timing and cue structure
- Translate only subtitle text content
- Keep speaker labels if present
- Preserve line breaks within subtitles`,

  vtt: `TRANSLATE WEBVTT SUBTITLE FILE - CRITICAL RULES:
- Keep ALL timestamp formats EXACTLY (00:00:00.000 --> 00:00:00.000)
- Preserve cue timing and WebVTT format
- Maintain exact timing and cue structure
- Translate only subtitle text content
- Keep speaker labels if present
- Preserve line breaks within subtitles
- Keep WEBVTT header if present`,

  xml: `TRANSLATE XML FILE - CRITICAL RULES:
- Keep ALL XML tags unchanged: <tag>, </tag>, <tag/>
- Preserve attributes and values in tags
- Translate only text content between tags
- Maintain exact tag hierarchy and nesting
- Keep CDATA sections format
- Preserve XML declarations and namespaces`,

  yaml: `TRANSLATE YAML FILE - CRITICAL RULES:
- Keep ALL YAML syntax: indentation, dashes, colons
- Preserve exact spacing and structure
- Translate only string values, keep keys unchanged
- Maintain list and dictionary structures
- Keep comments (# lines) in original language or translate if needed
- Preserve multi-line string formats`,

  yml: `TRANSLATE YAML FILE - CRITICAL RULES:
- Keep ALL YAML syntax: indentation, dashes, colons
- Preserve exact spacing and structure
- Translate only string values, keep keys unchanged
- Maintain list and dictionary structures
- Keep comments (# lines) in original language or translate if needed
- Preserve multi-line string formats`,
};

export function buildTranslationPrompt(
  content: string,
  format: string,
  config: PromptConfig
): string {
  const { sourceLanguage, targetLanguage, customInstruction, useDefaultInstruction } = config;
  const sourceLabel = getLanguageLabel(sourceLanguage);
  const targetLabel = getLanguageLabel(targetLanguage);

  const instruction = useDefaultInstruction
    ? DEFAULT_INSTRUCTION
    : customInstruction || DEFAULT_INSTRUCTION;

  const formatRule = FORMAT_RULES[format] || FORMAT_RULES.txt;

  const validationCheckpoint = `
VALIDATION CHECKPOINT:
Before outputting, verify:
✓ Same number of lines as input
✓ Same structure/format preserved  
✓ No missing content
✓ No added explanations
✓ Syntax elements unchanged
✓ Only content text translated
✓ Language changed from ${sourceLabel} to ${targetLabel}
✓ No original ${sourceLabel} text remains untranslated

INPUT CONTENT:
${content}

OUTPUT: Return the exact same structure with ALL text converted from ${sourceLabel} to ${targetLabel}.`;

  return `CRITICAL TRANSLATION RULES - FOLLOW EXACTLY:

1. PRESERVE STRUCTURE: Maintain EXACT same number of lines, paragraphs, sections, and formatting
2. PRESERVE SYNTAX: Keep all markup, tags, delimiters, brackets, quotes, and special characters UNCHANGED  
3. TRANSLATE ONLY CONTENT: Only translate readable text content, NOT structure elements
4. NO ADDITIONS: Do not add explanations, notes, or extra content
5. NO DELETIONS: Do not remove or skip any part of the original
6. NO REFORMATTING: Keep exact spacing, indentation, and line breaks
7. LANGUAGE CHANGE: You MUST translate the text from ${sourceLabel} to ${targetLabel} - DO NOT keep original language

TRANSLATION TASK:
- Source Language: ${sourceLabel}
- Target Language: ${targetLabel}
- Content Type: ${format.toUpperCase()}
- REQUIREMENT: Convert ALL text from ${sourceLabel} to ${targetLabel}

${instruction}

${formatRule}

${validationCheckpoint}`;
}

export function buildNovelContextPrompt(
  content: string,
  targetLanguage: string
): string {
  const targetLabel = getLanguageLabel(targetLanguage);

  return `You are analyzing a fictional narrative text to extract translation context.

TASK:
1. Extract all character names (with any aliases/ nicknames)
2. Extract important terms, objects, and locations
3. Provide a brief summary of the story context

Return the information in this JSON format:
{
  "characters": [{"name": "string", "aliases": ["string"], "descriptions": ["string"]}],
  "terms": ["string"],
  "locations": ["string"],
  "summary": "string"
}

ORIGINAL TEXT:
${content.slice(0, 15000)}

OUTPUT (JSON only):`;
}
