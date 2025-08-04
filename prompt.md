Saya butuh prompt system yang benar-benar mempertahankan format dan struktur file original, hanya mengubah bahasanya saja. Ini masalah umum saat menggunakan LLM untuk translate file karena model sering "kreatif" dalam memformat output.

# System Prompts untuk Translation File

## 1. Prompt Utama (Universal untuk semua format)

```
CRITICAL TRANSLATION RULES - FOLLOW EXACTLY:

1. PRESERVE STRUCTURE: Maintain EXACT same number of lines, paragraphs, sections, and formatting
2. PRESERVE SYNTAX: Keep all markup, tags, delimiters, brackets, quotes, and special characters UNCHANGED  
3. TRANSLATE ONLY CONTENT: Only translate readable text content, NOT structure elements
4. NO ADDITIONS: Do not add explanations, notes, or extra content
5. NO DELETIONS: Do not remove or skip any part of the original
6. NO REFORMATTING: Keep exact spacing, indentation, and line breaks

TRANSLATION TASK:
- Source Language: [AUTO-DETECT or specify]
- Target Language: [Indonesian/English/etc]
- Content Type: [File extension detected]

Translate ONLY the human-readable text content while preserving ALL formatting, structure, and syntax elements exactly as provided.

INPUT CONTENT:
[PASTE FILE CONTENT HERE]

OUTPUT: Return the exact same structure with only the translatable text converted to target language.
```

## 2. Prompt Khusus Per Format File

### Untuk File .TXT
```
TRANSLATE TEXT FILE - CRITICAL RULES:
- Keep exact line breaks and paragraph spacing
- Preserve any special formatting (bullets, numbers, dashes)
- Translate only readable text, keep symbols unchanged
- Maintain exact character count per line structure where possible
- Do not merge or split paragraphs

[CONTENT HERE]
```

### Untuk File .CSV
```
TRANSLATE CSV FILE - CRITICAL RULES:
- Preserve ALL commas, quotes, and delimiters EXACTLY
- Keep header row structure identical
- Translate only cell content, NOT column names (unless specified)
- Maintain exact number of columns and rows
- Preserve empty cells as empty
- Keep any escape characters or special CSV formatting

[CONTENT HERE]
```

### Untuk File .MD (Markdown)
```
TRANSLATE MARKDOWN FILE - CRITICAL RULES:
- Keep ALL markdown syntax: #, *, **, _, `, [], (), etc.
- Preserve exact heading levels and structure  
- Keep link URLs unchanged, translate only link text
- Maintain code blocks untranslated (```code```)
- Keep table structure identical
- Preserve line breaks and spacing exactly

[CONTENT HERE]
```

### Untuk File .JSON
```
TRANSLATE JSON FILE - CRITICAL RULES:
- Keep ALL JSON syntax: {}, [], "", :, , exactly as is
- Translate only string VALUES, never keys or structure
- Maintain exact indentation and formatting
- Preserve escape characters (\n, \t, \", etc.)
- Keep numeric and boolean values unchanged
- Ensure valid JSON output

[CONTENT HERE]
```

### Untuk File .SRT/.VTT (Subtitle)
```
TRANSLATE SUBTITLE FILE - CRITICAL RULES:
- Keep ALL timestamp formats EXACTLY (00:00:00,000 --> 00:00:00,000)
- Preserve subtitle numbering sequence
- Maintain exact timing and cue structure
- Translate only subtitle text content
- Keep speaker labels if present
- Preserve line breaks within subtitles

[CONTENT HERE]
```

### Untuk File .XML
```
TRANSLATE XML FILE - CRITICAL RULES:
- Keep ALL XML tags unchanged: <tag>, </tag>, <tag/>
- Preserve attributes and values in tags
- Translate only text content between tags
- Maintain exact tag hierarchy and nesting
- Keep CDATA sections format
- Preserve XML declarations and namespaces

[CONTENT HERE]
```

### Untuk File .YAML/.YML
```
TRANSLATE YAML FILE - CRITICAL RULES:
- Keep ALL YAML syntax: indentation, dashes, colons
- Preserve exact spacing and structure
- Translate only string values, keep keys unchanged
- Maintain list and dictionary structures
- Keep comments (# lines) in original language or translate if needed
- Preserve multi-line string formats

[CONTENT HERE]
```

### Untuk File .LOG
```
TRANSLATE LOG FILE - CRITICAL RULES:
- Keep ALL timestamps and log levels unchanged
- Preserve exact log entry format and structure
- Translate only human-readable message content
- Keep technical identifiers, IPs, codes unchanged
- Maintain chronological order
- Preserve any log formatting patterns

[CONTENT HERE]
```

## 3. Prompt Validasi (Tambahan)

```
VALIDATION CHECKPOINT:
Before outputting, verify:
✓ Same number of lines as input
✓ Same structure/format preserved  
✓ No missing content
✓ No added explanations
✓ Syntax elements unchanged
✓ Only content text translated

If any check fails, restart translation process.
```

## 4. Template Implementasi dalam Code

### JavaScript Example:
```javascript
function buildTranslationPrompt(fileContent, fileExtension, targetLanguage) {
    const basePrompt = `CRITICAL: Preserve EXACT formatting and structure. Translate only text content to ${targetLanguage}.\n\n`;
    
    const formatSpecificRules = {
        'txt': 'Keep line breaks and spacing identical.',
        'csv': 'Preserve ALL commas and delimiters exactly.',
        'md': 'Keep ALL markdown syntax unchanged.',
        'json': 'Maintain valid JSON, translate only string values.',
        'srt': 'Keep timestamps and numbering unchanged.',
        'vtt': 'Preserve cue timing and WebVTT format.',
        'xml': 'Keep all XML tags and attributes unchanged.',
        'yaml': 'Maintain YAML indentation and structure.',
        'yml': 'Maintain YAML indentation and structure.',
        'log': 'Keep timestamps and log format unchanged.'
    };
    
    const specificRule = formatSpecificRules[fileExtension] || 'Preserve original formatting exactly.';
    
    return `${basePrompt}${specificRule}\n\nContent to translate:\n${fileContent}\n\nTranslated content:`;
}
```

## 5. Tips Implementasi

1. **Pre-processing**: Count lines/elements before sending to API
2. **Post-processing**: Validate output has same structure
3. **Chunking**: For large files, split by logical sections (not randomly)
4. **Fallback**: If output invalid, retry with more specific instructions
5. **Validation**: Compare input vs output structure programmatically

## 6. Prompt Debugging (Jika masih bermasalah)

```
DEBUG MODE - TRANSLATION ANALYSIS:

Step 1: Identify structure elements in input
Step 2: Identify translatable content only  
Step 3: Translate content while preserving structure
Step 4: Verify output matches input structure exactly

Show your analysis before providing final translation.
```

Prompt system di atas dirancang khusus untuk mengatasi masalah yang Anda hadapi. Beberapa poin kunci:

**Mengapa prompt Anda sekarang bermasalah:**
- Terlalu umum dan tidak spesifik per format file
- Tidak ada instruksi eksplisit untuk preservasi struktur
- LLM punya kecenderungan "membantu" dengan memformat ulang

**Solusi dalam prompt baru:**
1. **CRITICAL RULES** - menggunakan kata tegas agar LLM tidak kreatif
2. **Format-specific prompts** - setiap jenis file punya aturan khusus
3. **Validation checkpoint** - meminta LLM self-check sebelum output
4. **Implementasi code** - template untuk integrate ke aplikasi Anda

**Cara pakai:**
1. Deteksi format file dari extension
2. Pilih prompt yang sesuai format
3. Tambahkan content file ke prompt
4. Kirim ke API (OpenRouter/Cerebras/Gemini)
5. Validate output secara programmatik

**Tips tambahan:**
- Untuk file besar, chunk berdasarkan struktur logis (misal per paragraph untuk MD, per entry untuk JSON)
- Implement retry mechanism jika output tidak valid
- Consider preprocessing untuk file yang sangat kompleks