document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const elements = {
        file: {
            input: document.getElementById('file-input'),
            dragDropArea: document.querySelector('.drag-drop-area'),
            info: document.getElementById('file-info'),
            nameSpan: document.getElementById('file-name'),
            sizeSpan: document.getElementById('file-size'),
            lineCountSpan: document.getElementById('line-count')
        },
        api: {
            providerSelect: document.getElementById('api-provider'),
            modelNameInput: document.getElementById('model-name-input'),
            keyInput: document.getElementById('api-key-input')
        },
        language: {
            sourceSelect: document.getElementById('source-language'),
            targetSelect: document.getElementById('target-language'),
            sourceCustom: document.getElementById('source-language-custom'),
            targetCustom: document.getElementById('target-language-custom')
        },
        instruction: {
            useDefaultCheckbox: document.getElementById('use-default-instruction'),
            customTextarea: document.getElementById('custom-instruction-text')
        },
        splitting: {
            autoToggle: document.getElementById('auto-split-toggle'),
            maxLinesInput: document.getElementById('max-lines-per-chunk'),
            overlapInput: document.getElementById('overlap-lines'),
            calculationPara: document.getElementById('split-calculation')
        },
        translation: {
            startBtn: document.getElementById('start-translation'),
            stopBtn: document.getElementById('cancel-translation'),
            pauseBtn: document.getElementById('pause-translation'),
            progressBar: document.querySelector('.progress-bar'),
            progressText: document.getElementById('progress-text'),
            logContent: document.getElementById('log-content')
        },
        preview: {
            originalText: document.getElementById('original-text-preview'),
            translatedText: document.getElementById('translated-text-preview')
        },
        actions: {
            downloadSingleBtn: document.getElementById('download-single-txt'),
            downloadZipBtn: document.getElementById('download-zip'),
            copyToClipboardBtn: document.getElementById('copy-to-clipboard'),
            clearAllBtn: document.getElementById('clear-all')
        },
        stats: {
            linesSpan: document.getElementById('stats-lines'),
            wordsSpan: document.getElementById('stats-words'),
            charsSpan: document.getElementById('stats-chars')
        },
        error: {
            messageDiv: document.getElementById('error-message')
        }
    };

    // State Management
    const state = {
        uploadedFileContent: '',
        uploadedFileName: '',
        translatedChunks: [],
        originalChunks: [],
        translationAborted: false,
        api: {
            key: '',
            endpoint: '',
            modelName: ''
        }
    };

    // Error Handling Functions
    const errorHandling = {
        show: (message) => {
            elements.error.messageDiv.textContent = message;
            elements.error.messageDiv.style.display = 'block';
        },
        hide: () => {
            elements.error.messageDiv.textContent = '';
            elements.error.messageDiv.style.display = 'none';
        }
    };

    // API Management Functions
    const apiManagement = {
        loadKey: (provider) => {
            const key = localStorage.getItem(`${provider}_api_key`);
            elements.api.keyInput.value = key || '';
            state.api.key = key || '';
        },
        saveKey: (provider, key) => {
            localStorage.setItem(`${provider}_api_key`, key);
            state.api.key = key;
        },
        saveModelName: (provider, modelName) => {
            localStorage.setItem(`${provider}_model_name`, modelName);
            state.api.modelName = modelName;
        },
        setConfig: (provider) => {
            switch(provider) {
                case 'openrouter':
                    state.api.endpoint = 'https://openrouter.ai/api/v1/chat/completions';
                    break;
                case 'cerebras':
                    state.api.endpoint = 'https://api.cerebras.ai/v1/chat/completions';
                    break;
                case 'google':
                    state.api.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/';
                    break;
            }
            const savedModelName = localStorage.getItem(`${provider}_model_name`);
            if (savedModelName) {
                elements.api.modelNameInput.value = savedModelName;
                state.api.modelName = savedModelName;
            }
            apiManagement.loadKey(provider);
        }
    };

    // File Handling Functions
    const fileHandling = {
        handleFile: (file) => {
            if (file.type !== 'text/plain') {
                alert('Please upload a .txt file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                state.uploadedFileContent = e.target.result;
                state.uploadedFileName = file.name;
                const lines = state.uploadedFileContent.split('\n');
                const lineCount = lines.length;

                elements.file.nameSpan.textContent = file.name;
                elements.file.sizeSpan.textContent = `${(file.size / 1024).toFixed(2)} KB`;
                elements.file.lineCountSpan.textContent = lineCount;
                elements.file.info.style.display = 'block';

                // Update split calculation after file is loaded
                setTimeout(() => {
                    updateSplitCalculation();
                    log(`File loaded: ${file.name} (${lineCount} lines)`);
                }, 100);
            };
            reader.readAsText(file);
        }
    };

    // Event Listeners Setup
    const setupEventListeners = () => {
        // File Upload Events
        elements.file.dragDropArea.addEventListener('click', () => elements.file.input.click());
        elements.file.dragDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.file.dragDropArea.classList.add('drag-over');
        });
        elements.file.dragDropArea.addEventListener('dragleave', () => {
            elements.file.dragDropArea.classList.remove('drag-over');
        });
        elements.file.dragDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.file.dragDropArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileHandling.handleFile(files[0]);
            }
        });

        elements.file.input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                fileHandling.handleFile(e.target.files[0]);
            }
        });

        // API Related Events
        elements.api.providerSelect.addEventListener('change', (event) => {
            const selectedProvider = event.target.value;
            apiManagement.setConfig(selectedProvider);
            log(`API Provider changed to: ${selectedProvider}`);
        });

        elements.api.keyInput.addEventListener('input', (event) => {
            const currentProvider = elements.api.providerSelect.value;
            apiManagement.saveKey(currentProvider, event.target.value);
        });

        elements.api.modelNameInput.addEventListener('input', (event) => {
            const currentProvider = elements.api.providerSelect.value;
            apiManagement.saveModelName(currentProvider, event.target.value);
        });

        // Translation Control Events
        if (elements.translation.startBtn) {
            elements.translation.startBtn.addEventListener('click', startTranslation);
        }
        if (elements.translation.stopBtn) {
            elements.translation.stopBtn.addEventListener('click', stopTranslation);
        }
        if (elements.translation.pauseBtn) {
            elements.translation.pauseBtn.addEventListener('click', () => log('Pause feature not available yet.'));
        }

        // Language selection change
        elements.language.sourceSelect.addEventListener('change', () => {
            updateSplitCalculation();
            toggleCustomLanguageInput('source');
        });
        elements.language.targetSelect.addEventListener('change', () => {
            updateSplitCalculation();
            toggleCustomLanguageInput('target');
        });

        // Custom language input change
        elements.language.sourceCustom.addEventListener('input', () => {
            updateSplitCalculation();
        });
        elements.language.targetCustom.addEventListener('input', () => {
            updateSplitCalculation();
        });

        // File Splitting Events
        elements.splitting.autoToggle.addEventListener('change', updateSplitCalculation);
        elements.splitting.maxLinesInput.addEventListener('input', updateSplitCalculation);
        elements.splitting.overlapInput.addEventListener('input', updateSplitCalculation);

        // Custom Instruction Events
        elements.instruction.useDefaultCheckbox.addEventListener('change', () => {
            elements.instruction.customTextarea.disabled = elements.instruction.useDefaultCheckbox.checked;
            if (elements.instruction.useDefaultCheckbox.checked) {
                elements.instruction.customTextarea.value = "Translate the following text naturally and accurately. Maintain the original formatting, tone, and context. For technical terms, provide appropriate translations while keeping important keywords recognizable.";
            }
        });

        // Download and Copy Events
        elements.actions.downloadSingleBtn.addEventListener('click', handleDownloadSingle);
        elements.actions.downloadZipBtn.addEventListener('click', handleDownloadZip);
        elements.actions.copyToClipboardBtn.addEventListener('click', handleCopyToClipboard);
        elements.actions.clearAllBtn.addEventListener('click', handleClearAll);
    };

            const init = () => {
        setupEventListeners();
        setupSmoothScrolling();
        setupSmartFooter();
        const initialProvider = elements.api.providerSelect.value;
        apiManagement.setConfig(initialProvider);
        elements.instruction.useDefaultCheckbox.dispatchEvent(new Event('change'));
        updateSplitCalculation();
    };

    const log = (msg) => {
        const time = new Date().toLocaleTimeString();
        elements.translation.logContent.textContent += `[${time}] ${msg}\n`;
        elements.translation.logContent.parentElement.scrollTop = elements.translation.logContent.parentElement.scrollHeight;
    };

    // Toggle custom language input visibility
    const toggleCustomLanguageInput = (type) => {
        const select = type === 'source' ? elements.language.sourceSelect : elements.language.targetSelect;
        const customInput = type === 'source' ? elements.language.sourceCustom : elements.language.targetCustom;
        
        if (select.value === 'custom') {
            customInput.style.display = 'block';
            customInput.focus();
        } else {
            customInput.style.display = 'none';
            customInput.value = '';
        }
    };

    // Get language value (from select or custom input)
    const getLanguageValue = (type) => {
        const select = type === 'source' ? elements.language.sourceSelect : elements.language.targetSelect;
        const customInput = type === 'source' ? elements.language.sourceCustom : elements.language.targetCustom;
        
        if (select.value === 'custom') {
            return customInput.value.trim() || 'Unknown';
        }
        return select.value;
    };

    // Get language suffix for filename
    const getLanguageSuffix = (languageCode) => {
        const languageMap = {
            'en': 'english',
            'id': 'indonesia',
            'ja': 'japanese',
            'es': 'spanish',
            'fr': 'french',
            'de': 'german',
            'zh': 'chinese',
            'ko': 'korean',
            'ar': 'arabic',
            'ru': 'russian',
            'pt': 'portuguese',
            'it': 'italian',
            'nl': 'dutch',
            'sv': 'swedish',
            'no': 'norwegian',
            'da': 'danish',
            'fi': 'finnish',
            'pl': 'polish',
            'tr': 'turkish',
            'hi': 'hindi',
            'th': 'thai',
            'vi': 'vietnamese',
            'auto': 'auto-detected'
        };
        
        // Check if it's a custom language (not in predefined map)
        if (!languageMap[languageCode]) {
            // For custom languages, use the input value directly
            // Clean it up for filename safety
            return languageCode.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single
                .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
        }
        
        return languageMap[languageCode];
    };

    // Enhanced Smooth Scrolling System
    const setupSmoothScrolling = () => {
        // Easing function for smooth animation
        const easeOutCubic = t => --t * t * t + 1;
        
        // Smooth scroll to element or position
        const smoothScrollTo = (target, duration = 600) => {
            const startY = window.scrollY;
            const targetY = typeof target === 'number' ? target : target.offsetTop;
            const difference = targetY - startY;
            const startTime = performance.now();

            if (difference === 0) return;

            const step = () => {
                const progress = (performance.now() - startTime) / duration;
                const amount = easeOutCubic(Math.min(progress, 1));
                window.scrollTo({ 
                    top: startY + amount * difference,
                    behavior: 'auto' // Use auto for better performance
                });
                
                if (progress < 0.99) {
                    requestAnimationFrame(step);
                }
            };
            
            requestAnimationFrame(step);
        };

        // Enhanced scroll performance for all scrollable elements
        const enhanceScrollPerformance = () => {
            const scrollableElements = document.querySelectorAll('main, .split-view, #log-content, .original-view pre, .translated-view pre');
            
            scrollableElements.forEach(element => {
                // Add hardware acceleration
                element.style.transform = 'translateZ(0)';
                element.style.willChange = 'scroll-position';
                
                // Smooth scroll for internal elements
                element.addEventListener('wheel', (e) => {
                    if (element.scrollHeight > element.clientHeight) {
                        e.preventDefault();
                        const delta = e.deltaY;
                        const scrollStep = Math.abs(delta) > 50 ? delta * 0.5 : delta;
                        
                        element.scrollTop += scrollStep;
                    }
                }, { passive: false });
            });
        };

        // Initialize enhanced scrolling
        enhanceScrollPerformance();
        
        // Add smooth scroll to anchor links
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a[href^="#"]');
            if (target) {
                e.preventDefault();
                const element = document.querySelector(target.getAttribute('href'));
                if (element) {
                    smoothScrollTo(element, 800);
                }
            }
        });

        // Optimize scroll performance on mobile
        if ('ontouchstart' in window) {
            document.body.style.webkitOverflowScrolling = 'touch';
        }
    };

    // Smart Footer with dynamic width
    const setupSmartFooter = () => {
        const footer = document.querySelector('footer');
        let ticking = false;

        const updateFooterState = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // Check if we're near the bottom (within 50px)
            const isNearBottom = (scrollTop + windowHeight) >= (documentHeight - 50);
            
            if (isNearBottom) {
                footer.classList.add('at-bottom');
            } else {
                footer.classList.remove('at-bottom');
            }
            
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateFooterState);
                ticking = true;
            }
        };

        // Listen for scroll events
        window.addEventListener('scroll', requestTick, { passive: true });
        
        // Initial check
        updateFooterState();
    };

    // Update split calculation text and enforce UI states
    const updateSplitCalculation = () => {
        const auto = elements.splitting.autoToggle.checked;
        const maxLines = parseInt(elements.splitting.maxLinesInput.value || '300', 10);
        const overlap = parseInt(elements.splitting.overlapInput.value || '0', 10);

        elements.splitting.maxLinesInput.disabled = auto;
        elements.splitting.overlapInput.disabled = auto;

        if (!state.uploadedFileContent || state.uploadedFileContent.length === 0) {
            elements.splitting.calculationPara.textContent = 'No file loaded yet.';
            return;
        }
        
        const totalLines = state.uploadedFileContent.split('\n').length;
        let effMax = Math.max(1, maxLines);
        let effOverlap = Math.max(0, Math.min(overlap, effMax - 1));

        if (auto) {
            effMax = Math.min(500, Math.max(50, Math.ceil(totalLines / Math.max(1, Math.ceil(totalLines / 300)))));
            effOverlap = Math.min(5, Math.max(0, Math.floor(effMax * 0.05)));
        }

        const chunks = Math.max(1, Math.ceil((totalLines - effOverlap) / (effMax - effOverlap)));
        elements.splitting.calculationPara.textContent = `Estimate: ${chunks} chunks • Max ${effMax} lines/chunk • Overlap ${effOverlap}`;
    };

    const splitFileContent = (text) => {
        const auto = elements.splitting.autoToggle.checked;
        let maxLines = parseInt(elements.splitting.maxLinesInput.value || '300', 10);
        let overlap = parseInt(elements.splitting.overlapInput.value || '0', 10);

        const lines = text.split('\n');
        const total = lines.length;

        if (auto) {
            maxLines = Math.min(500, Math.max(50, Math.ceil(total / Math.max(1, Math.ceil(total / 300)))));
            overlap = Math.min(5, Math.max(0, Math.floor(maxLines * 0.05)));
        } else {
            maxLines = Math.max(1, maxLines);
            overlap = Math.max(0, Math.min(overlap, maxLines - 1));
        }

        const chunks = [];
        let start = 0;
        while (start < total) {
            const end = Math.min(total, start + maxLines);
            const chunkText = lines.slice(start, end).join('\n');
            chunks.push(chunkText);
            if (end === total) break;
            start = end - overlap;
        }
        return chunks;
    };

    const mergeChunks = (chunks) => chunks.join('\n');

    // Build robust translation prompt based on file format
    const buildRobustTranslationPrompt = (content, sourceLang, targetLang, customInstruction) => {
        // Detect file format from current file info
        const fileName = state.uploadedFileName || '';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'txt';
        
        const basePrompt = `CRITICAL TRANSLATION RULES - FOLLOW EXACTLY:

1. PRESERVE STRUCTURE: Maintain EXACT same number of lines, paragraphs, sections, and formatting
2. PRESERVE SYNTAX: Keep all markup, tags, delimiters, brackets, quotes, and special characters UNCHANGED  
3. TRANSLATE ONLY CONTENT: Only translate readable text content, NOT structure elements
4. NO ADDITIONS: Do not add explanations, notes, or extra content
5. NO DELETIONS: Do not remove or skip any part of the original
6. NO REFORMATTING: Keep exact spacing, indentation, and line breaks

TRANSLATION TASK:
- Source Language: ${sourceLang}
- Target Language: ${targetLang}
- Content Type: ${fileExtension.toUpperCase()}

${customInstruction ? `CUSTOM INSTRUCTION: ${customInstruction}\n` : ''}

`;

        const formatSpecificRules = {
            'txt': 'TRANSLATE TEXT FILE - CRITICAL RULES:\n- Keep exact line breaks and paragraph spacing\n- Preserve any special formatting (bullets, numbers, dashes)\n- Translate only readable text, keep symbols unchanged\n- Maintain exact character count per line structure where possible\n- Do not merge or split paragraphs',
            
            'csv': 'TRANSLATE CSV FILE - CRITICAL RULES:\n- Preserve ALL commas, quotes, and delimiters EXACTLY\n- Keep header row structure identical\n- Translate only cell content, NOT column names (unless specified)\n- Maintain exact number of columns and rows\n- Preserve empty cells as empty\n- Keep any escape characters or special CSV formatting',
            
            'md': 'TRANSLATE MARKDOWN FILE - CRITICAL RULES:\n- Keep ALL markdown syntax: #, *, **, _, `, [], (), etc.\n- Preserve exact heading levels and structure\n- Keep link URLs unchanged, translate only link text\n- Maintain code blocks untranslated (```code```)\n- Keep table structure identical\n- Preserve line breaks and spacing exactly',
            
            'json': 'TRANSLATE JSON FILE - CRITICAL RULES:\n- Keep ALL JSON syntax: {}, [], "", :, , exactly as is\n- Translate only string VALUES, never keys or structure\n- Maintain exact indentation and formatting\n- Preserve escape characters (\\n, \\t, \\", etc.)\n- Keep numeric and boolean values unchanged\n- Ensure valid JSON output',
            
            'srt': 'TRANSLATE SUBTITLE FILE - CRITICAL RULES:\n- Keep ALL timestamp formats EXACTLY (00:00:00,000 --> 00:00:00,000)\n- Preserve subtitle numbering sequence\n- Maintain exact timing and cue structure\n- Translate only subtitle text content\n- Keep speaker labels if present\n- Preserve line breaks within subtitles',
            
            'vtt': 'TRANSLATE SUBTITLE FILE - CRITICAL RULES:\n- Keep ALL timestamp formats EXACTLY (00:00:00.000 --> 00:00:00.000)\n- Preserve cue timing and WebVTT format\n- Maintain exact timing and cue structure\n- Translate only subtitle text content\n- Keep speaker labels if present\n- Preserve line breaks within subtitles',
            
            'xml': 'TRANSLATE XML FILE - CRITICAL RULES:\n- Keep ALL XML tags unchanged: <tag>, </tag>, <tag/>\n- Preserve attributes and values in tags\n- Translate only text content between tags\n- Maintain exact tag hierarchy and nesting\n- Keep CDATA sections format\n- Preserve XML declarations and namespaces',
            
            'yaml': 'TRANSLATE YAML FILE - CRITICAL RULES:\n- Keep ALL YAML syntax: indentation, dashes, colons\n- Preserve exact spacing and structure\n- Translate only string values, keep keys unchanged\n- Maintain list and dictionary structures\n- Keep comments (# lines) in original language or translate if needed\n- Preserve multi-line string formats',
            
            'yml': 'TRANSLATE YAML FILE - CRITICAL RULES:\n- Keep ALL YAML syntax: indentation, dashes, colons\n- Preserve exact spacing and structure\n- Translate only string values, keep keys unchanged\n- Maintain list and dictionary structures\n- Keep comments (# lines) in original language or translate if needed\n- Preserve multi-line string formats',
            
            'log': 'TRANSLATE LOG FILE - CRITICAL RULES:\n- Keep ALL timestamps and log levels unchanged\n- Preserve exact log entry format and structure\n- Translate only human-readable message content\n- Keep technical identifiers, IPs, codes unchanged\n- Maintain chronological order\n- Preserve any log formatting patterns'
        };
        
        const specificRule = formatSpecificRules[fileExtension] || 'Preserve original formatting exactly.';
        
        const validationPrompt = `

VALIDATION CHECKPOINT:
Before outputting, verify:
✓ Same number of lines as input
✓ Same structure/format preserved  
✓ No missing content
✓ No added explanations
✓ Syntax elements unchanged
✓ Only content text translated

INPUT CONTENT:
${content}

OUTPUT: Return the exact same structure with only the translatable text converted to target language.`;

        return basePrompt + specificRule + validationPrompt;
    };

    const updateProgress = (done, total) => {
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        elements.translation.progressBar.style.width = `${pct}%`;
        elements.translation.progressText.textContent = `${pct}%`;
        elements.translation.progressBar.setAttribute('aria-valuenow', String(pct));
    };

    const callGoogle = async (apiKey, modelName, content) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const body = {
            contents: [
                {
                    parts: [
                        { text: content }
                    ]
                }
            ]
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Google API error ${res.status}: ${t}`);
        }
        return res.json();
    };

    const callOpenRouter = async (apiKey, modelName, content) => {
        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const body = {
            model: modelName,
            messages: [
                { role: 'system', content: 'You are a helpful translation assistant.' },
                { role: 'user', content }
            ]
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`OpenRouter API error ${res.status}: ${t}`);
        }
        return res.json();
    };

    const callCerebras = async (apiKey, modelName, content) => {
        const url = 'https://api.cerebras.ai/v1/chat/completions';
        const body = {
            model: modelName,
            messages: [
                { role: 'system', content: 'You are a helpful translation assistant.' },
                { role: 'user', content }
            ]
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Cerebras API error ${res.status}: ${t}`);
        }
        return res.json();
    };

    const translateChunk = async (chunk, sourceLang, targetLang, instruction) => {
        const provider = elements.api.providerSelect.value;
        const apiKey = state.api.key;
        const modelName = state.api.modelName;
        if (!apiKey) throw new Error('API key not filled.');
        if (!modelName || modelName.trim() === '') throw new Error('Model name not filled.');

        // Build robust translation prompt based on file format
        const prompt = buildRobustTranslationPrompt(chunk, sourceLang, targetLang, instruction);

        if (provider === 'google') {
            const data = await callGoogle(apiKey, modelName, prompt);
            if (data && data.promptFeedback && data.promptFeedback.blockReason) {
                if (data.promptFeedback.blockReason === 'PROHIBITED_CONTENT') {
                    throw new Error('Translation failed: Content may violate usage policy. Please try with different text.');
                }
            }
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Translation failed: API response is invalid or incomplete.');
            return text;
        }
        if (provider === 'openrouter') {
            const data = await callOpenRouter(apiKey, modelName, prompt);
            const text = data?.choices?.[0]?.message?.content;
            if (!text) throw new Error('Translation failed: API response is invalid or incomplete.');
            return text;
        }
        if (provider === 'cerebras') {
            const data = await callCerebras(apiKey, modelName, prompt);
            const text = data?.choices?.[0]?.message?.content;
            if (!text) throw new Error('Translation failed: API response is invalid or incomplete.');
            return text;
        }
        throw new Error('Unknown provider.');
    };

    const startTranslation = async () => {
        errorHandling.hide();
        if (!state.uploadedFileContent) {
            errorHandling.show('Please upload a .txt file first.');
            return;
        }
        const sourceLang = getLanguageValue('source');
        const targetLang = getLanguageValue('target');
        let instruction = elements.instruction.customTextarea.value.trim();
        if (!instruction || elements.instruction.useDefaultCheckbox.checked) {
            instruction = 'Translate the following text naturally and accurately. Maintain the original formatting, tone, and context. For technical terms, provide appropriate translations while keeping important keywords recognizable.';
        }

        state.translationAborted = false;
        elements.translation.startBtn.disabled = true;
        elements.translation.stopBtn.disabled = false;
        log('Starting translation process...');

        const originalChunks = splitFileContent(state.uploadedFileContent);
        state.originalChunks = originalChunks;
        state.translatedChunks = new Array(originalChunks.length).fill('');
        updateProgress(0, originalChunks.length);

        for (let i = 0; i < originalChunks.length; i++) {
            if (state.translationAborted) {
                log('Dibatalkan oleh pengguna.');
                break;
            }
            const chunk = originalChunks[i];
            log(`Translating chunk ${i + 1}/${originalChunks.length}...`);
            try {
                const translated = await translateChunk(chunk, sourceLang, targetLang, instruction);
                state.translatedChunks[i] = translated;
                elements.preview.originalText.textContent = chunk;
                elements.preview.translatedText.textContent = translated;
                updateProgress(i + 1, originalChunks.length);
            } catch (err) {
                errorHandling.show(err.message || 'An error occurred during translation.');
                log(`Error on chunk ${i + 1}: ${err.message || err}`);
                break;
            }
        }

        const anyTranslated = state.translatedChunks.some(t => t && t.length > 0);
        if (anyTranslated) {
            const merged = mergeChunks(state.translatedChunks.filter(Boolean));
            elements.preview.translatedText.textContent = merged;
            log('Translation completed.');
        } else {
            log('No translation results to display.');
        }
        elements.translation.startBtn.disabled = false;
        elements.translation.stopBtn.disabled = true;
    };

    const stopTranslation = () => {
        state.translationAborted = true;
        elements.translation.startBtn.disabled = false;
        elements.translation.stopBtn.disabled = true;
        log('Translation process requested to stop.');
    };

    const handleDownloadSingle = () => {
        const content = elements.preview.translatedText.textContent || '';
        if (!content) {
            errorHandling.show('No results to download.');
            return;
        }

        // Generate smart filename
        const originalFileName = state.uploadedFileName || 'document.txt';
        const targetLang = getLanguageValue('target');
        const languageSuffix = getLanguageSuffix(targetLang);
        
        // Remove extension and add language suffix
        const baseName = originalFileName.replace(/\.[^/.]+$/, '');
        const extension = originalFileName.split('.').pop() || 'txt';
        const translatedFileName = `${baseName}-${languageSuffix}.${extension}`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = translatedFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        log(`Translation result downloaded as ${translatedFileName}`);
    };

    const handleDownloadZip = async () => {
        if (!state.uploadedFileContent || !state.translatedChunks.some(t => t && t.length > 0)) {
            errorHandling.show('No files to download. Please upload a file and complete translation first.');
            setTimeout(() => errorHandling.hide(), 3000);
            return;
        }

        try {
            // Import JSZip dynamically
            const JSZip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
            const zip = new JSZip.default();

            // Add original file
            const originalFileName = state.uploadedFileName || 'original.txt';
            zip.file(originalFileName, state.uploadedFileContent);

            // Add translated file
            const translatedContent = state.translatedChunks.filter(Boolean).join('\n\n');
            const targetLang = getLanguageValue('target');
            const languageSuffix = getLanguageSuffix(targetLang);
            
            // Generate smart filename for translated file
            const baseName = originalFileName.replace(/\.[^/.]+$/, '');
            const extension = originalFileName.split('.').pop() || 'txt';
            const translatedFileName = `${baseName}-${languageSuffix}.${extension}`;
            zip.file(translatedFileName, translatedContent);

            // Add metadata file
            const metadata = {
                originalFile: originalFileName,
                translatedFile: translatedFileName,
                sourceLanguage: getLanguageValue('source'),
                targetLanguage: getLanguageValue('target'),
                translationDate: new Date().toISOString(),
                totalChunks: state.translatedChunks.length,
                provider: elements.api.providerSelect.value,
                model: elements.api.modelNameInput.value
            };
            zip.file('translation_metadata.json', JSON.stringify(metadata, null, 2));

            // Generate and download ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `translation_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            log('ZIP file downloaded with original, translated, and metadata files.');
        } catch (error) {
            console.error('ZIP creation failed:', error);
            errorHandling.show('Failed to create ZIP file. Please try again.');
            setTimeout(() => errorHandling.hide(), 3000);
        }
    };

    const handleCopyToClipboard = async () => {
        const content = elements.preview.translatedText.textContent || '';
        if (!content) {
            errorHandling.show('No results to copy.');
            return;
        }
        try {
            await navigator.clipboard.writeText(content);
            log('Translation result copied to clipboard.');
        } catch (e) {
            errorHandling.show('Failed to copy to clipboard.');
        }
    };

    const handleClearAll = () => {
        if (confirm('Are you sure you want to clear all progress? Uploaded file and translation results will be deleted.')) {
            // Reset state
            state.uploadedFileContent = '';
            state.uploadedFileName = '';
            state.translatedChunks = [];
            state.originalChunks = [];
            state.translationAborted = false;

            // Reset file info
            elements.file.info.style.display = 'none';
            elements.file.nameSpan.textContent = '';
            elements.file.sizeSpan.textContent = '';
            elements.file.lineCountSpan.textContent = '';

            // Reset file input
            elements.file.input.value = '';

            // Reset progress
            updateProgress(0, 1);
            elements.translation.startBtn.disabled = false;
            elements.translation.stopBtn.disabled = true;

            // Reset preview
            elements.preview.originalText.textContent = '';
            elements.preview.translatedText.textContent = '';

            // Reset split calculation
            updateSplitCalculation();

            // Clear log
            elements.translation.logContent.textContent = '';

            // Hide error message
            errorHandling.hide();

            log('All progress cleared. Ready for new file.');
        }
    };

    init();
});