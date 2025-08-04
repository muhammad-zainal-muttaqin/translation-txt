# Translation TXT - Multi-Provider LLM Translator

A simple web application for translating text files (.txt) using various LLM API providers. This application serves as a universal platform that allows users to choose their preferred API provider and model.

## Project Structure

- `index.html`: Main HTML file for the web application interface
- `style.css`: Contains CSS for styling the user interface
- `script.js`: Contains JavaScript logic for file handling, API integration, translation process, and UI interactions
- `TODO.md`: Complete project specifications and development plans

## Implemented Features

### 🔌 **Multi-Provider API Support**
- **OpenRouter**: Supports various models like qwen/qwen3-4b:free, meta-llama/llama-3.2-3b-instruct:free, etc.
- **Cerebras**: Supports models like llama-4-scout-17b-16e-instruct, qwen-3-32b, etc.
- **Google Gemini**: Supports models like gemini-2.5-flash-lite, gemini-1.5-pro, etc.

### 📁 **File Upload Interface**
- Drag & drop or select `.txt` files
- File content preview with detailed information (name, size, line count)
- Supports various text formats: .txt, .csv, .md, .json, .log, .srt, .vtt, .xml, .yaml, .yml

### 🌐 **Language Configuration**
- Dropdown for source and target languages
- Auto-detect source language option
- Supports: Indonesian, English, Japanese, Spanish

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

### 📊 **Results Management**
- Side-by-side preview (original vs translation)
- Download as single .txt file
- Copy to clipboard
- (ZIP feature in development)

### 🛡️ **Robust Error Handling**
- User-friendly error messages
- Specific API error handling:
  - `PROHIBITED_CONTENT` from Google Gemini
  - Comprehensive input validation
  - Network error handling

## Setup and Running

To run this project locally, follow these steps:

### 1. **Clone repository or download project files**

### 2. **Open `index.html` in web browser**

Since this is a client-side application, you can directly open the `index.html` file in your browser. No web server is required for basic functionality.

### 3. **API Key Configuration (Important)**

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

## Future Enhancements (from TODO.md)

- **Batch Processing**: Upload and process multiple files simultaneously
- **Translation History**: Translation history with localStorage
- **Quality Control**: Confidence scoring and manual review
- **Performance Optimization**: Caching, compression, Web Workers
- **Download ZIP**: Complete implementation of download as .zip
- **Pause/Resume**: Pause and resume translation functionality
- **Additional Providers**: Support for other API providers

## License

This project is open-source and available under the MIT License.

---

**Last Updated**: January 2025