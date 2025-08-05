# Translation TXT - Multi-Provider LLM Translator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0%20Final-blue.svg)](https://github.com/muhammad-zainal-muttaqin/translation-txt)
[![Status](https://img.shields.io/badge/status-Production%20Ready-green.svg)](https://translation-txt.vercel.app)

A modern, feature-rich web application for translating text files using various LLM API providers. This application serves as a universal platform that allows users to choose their preferred API provider and model with advanced features like robust translation prompts, smart file naming, and enhanced user experience.

## Project Structure

- `index.html`: Main HTML file with modern UI and PWA support
- `style.css`: Clean glassmorphism design with smooth scrolling
- `script.js`: Advanced JavaScript with robust translation system
- `manifest.json`: PWA manifest for app-like experience
- `sw.js`: Service Worker for offline caching
- `robots.txt`: SEO optimization
- `vercel.json`: Production deployment configuration

## Implemented Features

### 🔌 **Multi-Provider API Support**
- **OpenRouter**: Universal gateway to 100+ models from various providers
- **Cerebras**: High-performance models with generous free tier
- **Google Gemini**: Google's latest AI models with advanced capabilities

## 📋 **Supported Models by Provider**

### 🚀 **OpenRouter Models (Free Tier)**
Based on [OpenRouter's model catalog](https://openrouter.ai/models), here are the recommended free models:

| Model Name | Provider | Context | Specialization | Status |
|------------|----------|---------|----------------|---------|
| `horizon-beta` | openrouter | 256K | Programming, Science, Translation | ✅ Free |
| `z-ai:glm-4-5-air` | z-ai | 131K | Agent-centric applications | ✅ Free |
| `qwen:qwen3-coder` | qwen | 262K | Code generation, Tool use | ✅ Free |
| `moonshotai:kimi-k2` | moonshotai | 33K | Reasoning, Code synthesis | ✅ Free |
| `venice:uncensored` | cognitivecomputations | 33K | Unrestricted use cases | ✅ Free |
| `google:gemma-3n-2b` | google | 8K | Multilingual, Reasoning | ✅ Free |
| `tencent:hunyuan-a13b` | tencent | 33K | Mathematics, Science | ✅ Free |
| `tng:deepseek-r1t2-chimera` | tngtech | 164K | Long-context analysis | ✅ Free |
| `mistral:mistral-small-3-2-24b` | mistralai | 131K | Instruction following | ✅ Free |
| `moonshotai:kimi-dev-72b` | moonshotai | 131K | Software engineering | ✅ Free |
| `deepseek:deepseek-r1-0528-qwen3-8b` | deepseek | 131K | Math, Programming | ✅ Free |

**💡 Tip**: For paid models and higher rate limits, visit [OpenRouter Models](https://openrouter.ai/models)

### ⚡ **Cerebras Models (Free Tier)**
Based on Cerebras platform, here are the available models:

| Model Name | Context Length | Type | Rate Limits | Status |
|------------|----------------|------|-------------|---------|
| `qwen-3-235b-a22b-instruct-2507` | 64,000 | Requests: 30/min, 900/hour | ✅ Free |
| `qwen-3-235b-a22b-thinking-2507` | 65,536 | Requests: 30/min, 900/hour | ✅ Free |
| `qwen-3-coder-480b` | 65,536 | Requests: 10/min, 100/hour | ✅ Free |
| `llama-3.3-70b` | 65,536 | Requests: 30/min, 900/hour | ✅ Free |
| `qwen-3-32b` | 65,536 | Requests: 30/min, 900/hour | ✅ Free |
| `llama3.1-8b` | 8,192 | Requests: 30/min, 900/hour | ✅ Free |
| `llama-4-scout-17b-16e-instruct` | 8,192 | Requests: 30/min, 900/hour | ✅ Free |
| `llama-4-maverick-17b-128e-instruct` | 8,192 | Requests: 30/min, 900/hour | ✅ Free |

**💡 Note**: Llama 3.1 models are temporarily limited to 8192 context in Free Tier

### 🌟 **Google Gemini Models**
Google's latest AI models with advanced capabilities - **Available for FREE**:

| Model Name | Context | Capabilities | Pricing |
|------------|---------|--------------|---------|
| `gemini-2.5-pro` | 2M+ | Advanced reasoning, Code generation | ✅ Free |
| `gemini-2.5-flash` | 1M | Fast, efficient processing | ✅ Free |
| `gemini-2.5-flash-lite` | 1M | Lightweight, cost-effective | ✅ Free |
| `gemini-2.0-flash` | 1M | Balanced performance | ✅ Free |
| `gemini-2.0-flash-lite` | 1M | Lightweight version | ✅ Free |

**💡 Note**: Gemini models require Google AI Studio API key from [Google AI Studio](https://aistudio.google.com/u/0/apikey) - **FREE to use**

### 📁 **File Upload Interface**
- Drag & drop or select `.txt` files
- File content preview with detailed information (name, size, line count)
- Supports various text formats: .txt, .csv, .md, .json, .log, .srt, .vtt, .xml, .yaml, .yml

### 🌐 **Advanced Language Configuration**
- Dropdown for source and target languages with **Custom Language Input**
- Auto-detect source language option
- Supports: Indonesian, English, Japanese, Spanish + **Any Custom Language**
- **Smart Language Detection**: Users can input any language name (French, German, Chinese, etc.)

### ⚙️ **Flexible API Settings**
- **User-defined Model Names**: Users input their own model names according to provider
- **API Key Management**: Local storage per provider
- **Persistent Settings**: Preferences saved in localStorage

### 📝 **Custom Instructions**
- Option to use standard or custom instructions
- User-friendly placeholder with example instructions

### ✂️ **File Splitting Configuration**
- **Automatic Splitting**: Target ~300 lines per chunk (default)
- **Manual Splitting**: Configure maximum lines per chunk and overlap
- **Real-time Calculation**: Estimate number of chunks to be created

### 🚀 **Translation Process**
- Progress bar with real-time information
- Log panel for process monitoring
- Controls: Start, Pause, Resume, Cancel

### 📊 **Advanced Results Management**
- Side-by-side preview (original vs translation)
- **Smart Filename Generation**: Automatic naming with language suffixes
- Download as single .txt file with smart naming
- **ZIP Download**: Complete package with original, translated, and metadata files
- Copy to clipboard functionality
- **Clear All Progress**: Reset application state with one click

### 🛡️ **Robust Error Handling & Translation System**
- User-friendly error messages
- **Advanced Translation Prompts**: Format-specific rules for different file types
- **Structure Preservation**: Maintains exact formatting, syntax, and structure
- Specific API error handling:
  - `PROHIBITED_CONTENT` from Google Gemini
  - Comprehensive input validation
  - Network error handling
- **Format-Specific Rules**: Special handling for TXT, CSV, MD, JSON, SRT, VTT, XML, YAML files

## Setup and Running

### 🌐 **Live Demo**
**Production URL**: https://translation-txt.vercel.app

### 🚀 **Local Development**

To run this project locally, follow these steps:

### 1. **Clone repository or download project files**
```bash
git clone https://github.com/muhammad-zainal-muttaqin/translation-txt.git
cd translation-txt
```

### 2. **Open `index.html` in web browser**

Since this is a client-side application, you can directly open the `index.html` file in your browser. No web server is required for basic functionality.

### 3. **For PWA Features (Recommended)**
Use a local server for full PWA functionality:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

### 4. **API Key Configuration (Important)**

This application supports various API providers. You need to fill in the API key according to your chosen provider:

1. **Select Provider**: OpenRouter, Cerebras, or Google Gemini
2. **Enter Model Name**: According to your chosen provider
3. **Enter API Key**: Key will be stored locally in browser

**Example Configuration:**

**OpenRouter (Recommended for Free Tier):**
- Model: `horizon-beta` (256K context, great for translation)
- Model: `qwen:qwen3-coder` (262K context, excellent for code files)
- Model: `mistral:mistral-small-3-2-24b` (131K context, balanced performance)
- API Key: Get from [OpenRouter](https://openrouter.ai/)

**Cerebras (High Performance):**
- Model: `qwen-3-32b` (65,536 context, fast and reliable)
- Model: `llama-4-scout-17b-16e-instruct` (8,192 context, good for small files)
- Model: `llama-3.3-70b` (65,536 context, high quality)
- API Key: Get from [Cerebras](https://cerebras.ai/)

**Google Gemini (Advanced Features - FREE):**
- Model: `gemini-2.5-flash-lite` (1M context, lightweight and fast)
- Model: `gemini-2.5-pro` (2M+ context, best quality and reasoning)
- Model: `gemini-2.5-flash` (1M context, balanced performance)
- API Key: Get from [Google AI Studio](https://aistudio.google.com/u/0/apikey) - **FREE**

**Note**: For security, API keys are stored locally in the user's browser. This setup is for local use and demonstration.

## Usage

1. **Upload File**: Drag and drop `.txt` file to designated area or click to select
2. **Configure Provider**: Select API provider, enter model name, and API key
3. **Language Settings**: Choose source and target languages
4. **Splitting Configuration**: Adjust file splitting options (automatic/manual)
5. **Start Translation**: Click "Start Translation" button
6. **View Results**: After translation, original and translated texts will be displayed
7. **Download/Copy**: Download result file or copy to clipboard

## Default Settings

- **Automatic Splitting**: Target ~300 lines per chunk
- **Manual Splitting**: Default 300 lines per chunk
- **Overlap**: 0 lines (can be adjusted manually)
- **Instructions**: Uses standard instructions (can be customized)
- **Smart Naming**: Automatic filename generation with language suffixes
- **Enhanced UX**: Smooth scrolling, glassmorphism design, responsive layout

## 🎯 **Production Features (FINAL VERSION)**

### ✨ **Advanced Features Implemented**
- **🌐 Custom Language Support**: Input any language name (French, German, Chinese, etc.)
- **📁 Smart Filename Generation**: Automatic naming with language suffixes
- **📦 ZIP Download System**: Complete package with metadata
- **🎨 Enhanced UI/UX**: Glassmorphism design with smooth scrolling
- **📱 PWA Support**: Installable web app with offline capabilities
- **🔍 SEO Optimized**: Meta tags, robots.txt, and social sharing
- **⚡ Performance Optimized**: 60FPS smooth scrolling and hardware acceleration
- **🛡️ Robust Translation**: Format-specific prompts for perfect structure preservation
- **🎯 Clear All Progress**: One-click reset functionality
- **🐙 GitHub Integration**: Direct link to repository in footer

### 🚀 **Technical Excellence**
- **Modern CSS**: Glassmorphism, smooth animations, responsive design
- **Advanced JavaScript**: RequestAnimationFrame, performance optimization
- **Security Headers**: Production-ready Vercel configuration
- **Cross-Platform**: Works on desktop, tablet, and mobile
- **Auto-Deploy**: GitHub integration with Vercel for instant updates

## Future Enhancements

- **Batch Processing**: Upload and process multiple files simultaneously
- **Translation History**: Translation history with localStorage
- **Quality Control**: Confidence scoring and manual review
- **Additional Providers**: Support for other API providers
- **Advanced Analytics**: Translation statistics and usage metrics

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Copyright (c) 2025 Muhammad Zainal Muttaqin**

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 📊 **Project Statistics**

- **Total Commits**: 15+ commits with comprehensive features
- **Production Ready**: Live on Vercel with auto-deploy
- **GitHub Stars**: Open source project with active development
- **Cross-Platform**: Tested on Windows, macOS, Linux, iOS, Android
- **Performance**: 60FPS smooth scrolling, optimized for all devices

## 🔗 **Links**

- **🌐 Live Demo**: https://translation-txt.vercel.app
- **📁 GitHub Repository**: https://github.com/muhammad-zainal-muttaqin/translation-txt
- **📖 Documentation**: This README file

---

**Last Updated**: August 2025 | **Version**: 2.0 Final | **Status**: Production Ready 🚀