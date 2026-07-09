# Product

## Register

product

## Users

One person (or a small circle of hobbyist translators) translating whole documents — novels, subtitles, logs, structured text — with their own LLM API keys. They use it at a desk in long sessions, often at night, waiting on multi-minute runs. Not developers-in-the-loop: they want the translation, not the machinery.

## Product Purpose

TranslationTXT is a local-first, browser-only workspace that splits large text files into parts, translates them through a user-configured provider endpoint, and reassembles the result for download. Success = a first-time user can go from file to downloaded translation without reading docs, and a power user keeps every knob (chunking, parallelism, profiles, novel mode).

## Brand Personality

Warm, literary, unhurried. Feels like a small publishing tool, not an engineering console. Three words: calm, bookish, dependable.

## Anti-references

- The previous "Editorial Futuristik Control Desk" look: dark-green terminal vibes, 8 technical tabs, jargon-first labels (chunk, prepass, diagnostics) in the primary flow.
- Dashboard-SaaS clichés: stat-tile grids as decoration, gradient accents, glassmorphism.
- Anything that makes the primary flow (file → translate → result) share attention with configuration.

## Design Principles

1. **The page order teaches the workflow** — no steppers, wizards, or onboarding copy; sections appear in the order you use them.
2. **Configuration is nearby, never in the way** — technical controls live one click away in Settings, saved automatically.
3. **Plain words first, precise words on demand** — "parts" in the main flow, "chunks" inside expandable details and logs.
4. **Nothing is lost** — partial results are always visible, downloadable, and honestly labeled.
5. **Warmth from type and accent, not tinted backgrounds** — serif display + terracotta accent on quiet neutral surfaces.

## Accessibility & Inclusion

WCAG AA: 4.5:1 body text contrast, visible focus rings everywhere, full keyboard operability (dropzone, sheet focus trap, Esc), `prefers-reduced-motion` honored on all transitions, light and dark themes both first-class.
