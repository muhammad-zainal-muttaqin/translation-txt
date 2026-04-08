# TranslationTXT

Client-side translation workspace for text and structured text files using Gemini, OpenAI-compatible, and Anthropic-compatible endpoints.

## Features

- **Multi-format support**: TXT, CSV, Markdown, JSON, logs, SRT, VTT, XML, YAML
- **Multiple providers**: OpenAI-compatible, Anthropic-compatible, Google Gemini
- **Smart chunking**: Automatic chunking with overlap for large files
- **Novel mode**: Specialized handling for long-form fiction translation
- **Local-first**: All processing happens in your browser
- **PWA support**: Works offline after initial load

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- PWA with Service Worker

## License

MIT
