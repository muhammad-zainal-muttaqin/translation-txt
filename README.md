# 🚀 TranslationTXT - Multi-Provider Text Translation Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0%20Final-blue.svg)](https://github.com/muhammad-zainal-muttaqin/translation-txt)
[![Status](https://img.shields.io/badge/status-Production%20Ready-green.svg)](https://translation-txt.vercel.app)

A modern web application for translating text files using various LLM API providers. Supports multiple providers, robust translation prompts, and enhanced user experience.

## ✨ Features

- **🌐 Multi-Provider Support**: OpenRouter, Cerebras, Google Gemini
- **📁 Smart File Handling**: Drag & drop, multiple formats (TXT, CSV, MD, JSON, SRT, VTT, XML, YAML, LOG)
- **⚡ Real-Time Progress**: Live progress indicators and streaming feedback
- **🔄 Quality Validation**: Retry mechanism with translation quality checks
- **📦 ZIP Download**: Complete package with metadata
- **🎨 Modern UI**: Glassmorphism design with smooth scrolling
- **📱 PWA Ready**: Installable web app with offline support
- **🔒 Secure**: Local API key storage, no server-side processing

## 🚀 Quick Start

1. **Visit**: https://translation-txt.vercel.app
2. **Upload**: Drag & drop your text file
3. **Configure**: Select provider, enter model name and API key
4. **Translate**: Choose languages and start translation
5. **Download**: Get results in TXT or ZIP format

## 📋 Supported Models

### OpenRouter (Free Tier)
| Model | Context | Specialization |
|-------|---------|----------------|
| `horizon-beta` | 256K | Programming, Science, Translation |
| `qwen:qwen3-coder` | 262K | Code generation, Tool use |
| `mistral:mistral-small-3-2-24b` | 131K | Instruction following |

### Cerebras (Free Tier)
| Model | Context | Rate Limits |
|-------|---------|-------------|
| `qwen-3-32b` | 65,536 | 30/min, 900/hour |
| `llama-4-scout-17b-16e-instruct` | 8,192 | 30/min, 900/hour |
| `llama-3.3-70b` | 65,536 | 30/min, 900/hour |

### Google Gemini (Free)
| Model | Context | Capabilities |
|-------|---------|--------------|
| `gemini-2.5-pro` | 2M+ | Advanced reasoning |
| `gemini-2.5-flash-lite` | 1M | Lightweight, fast |
| `gemini-2.5-flash` | 1M | Balanced performance |

## ⚙️ Configuration

### API Keys Required
- **OpenRouter**: Get from [OpenRouter](https://openrouter.ai/)
- **Cerebras**: Get from [Cerebras](https://cerebras.ai/)
- **Google Gemini**: Get from [Google AI Studio](https://aistudio.google.com/u/0/apikey)

### Recommended Settings
- **Chunk Size**: 300 lines (default)
- **Overlap**: 5 lines (for continuity)
- **Language**: Custom input supported

## 🎯 Advanced Features

### Robust Translation Prompts
- Format-specific rules for each file type
- Structure preservation (line breaks, formatting)
- Syntax preservation (markup, tags, delimiters)
- Quality validation with retry mechanism

### Smart File Processing
- Automatic chunking with overlap
- Real-time progress tracking
- Error handling per chunk
- ZIP download with metadata

### Enhanced UX
- Smooth scrolling animations
- Glassmorphism design
- Responsive layout
- PWA installation support

## 📊 Performance

- **Lighthouse Score**: 94 Performance, 100 Accessibility
- **Loading Time**: < 2 seconds
- **File Size**: Optimized bundle
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

## 🔧 Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Deployment**: Vercel (auto-deploy from GitHub)
- **PWA**: Service Worker, Manifest
- **Security**: Content Security Policy, HTTPS only

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**Copyright (c) 2025 Muhammad Zainal Muttaqin**

## 🔗 Links

- **🌐 Live Demo**: https://translation-txt.vercel.app
- **📁 GitHub**: https://github.com/muhammad-zainal-muttaqin/translation-txt
- **📖 Documentation**: This README

---

**Version**: 2.0 Final | **Status**: Production Ready 🚀 | **Last Updated**: August 2025