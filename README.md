# Translation TXT - Multi-Provider LLM Translator

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
- **OpenRouter**: Supports various models like qwen/qwen3-4b:free, meta-llama/llama-3.2-3b-instruct:free, etc.
- **Cerebras**: Supports models like llama-4-scout-17b-16e-instruct, qwen-3-32b, etc.
- **Google Gemini**: Supports models like gemini-2.5-flash-lite, gemini-1.5-pro, etc.

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
- **OpenRouter**: Model `qwen/qwen3-4b:free`, API key from OpenRouter
- **Cerebras**: Model `llama-4-scout-17b-16e-instruct`, API key from Cerebras
- **Google Gemini**: Model `gemini-2.5-flash-lite`, API key from Google AI Studio

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

## License

This project is open-source and available under the MIT License.

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

**Last Updated**: January 2025 | **Version**: 2.0 Final | **Status**: Production Ready 🚀