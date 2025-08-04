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
            keyInput: document.getElementById('api-key-input'),
            sourceLanguageSelect: document.getElementById('source-language'),
            targetLanguageSelect: document.getElementById('target-language')
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
            copyToClipboardBtn: document.getElementById('copy-to-clipboard')
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
            elements.translation.pauseBtn.addEventListener('click', () => log('Fitur jeda belum tersedia.'));
        }

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
    };

        const init = () => {
            setupEventListeners();
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

    // Update split calculation text and enforce UI states
    const updateSplitCalculation = () => {
        const auto = elements.splitting.autoToggle.checked;
        const maxLines = parseInt(elements.splitting.maxLinesInput.value || '300', 10);
        const overlap = parseInt(elements.splitting.overlapInput.value || '0', 10);

        elements.splitting.maxLinesInput.disabled = auto;
        elements.splitting.overlapInput.disabled = auto;

        if (!state.uploadedFileContent || state.uploadedFileContent.length === 0) {
            elements.splitting.calculationPara.textContent = 'Belum ada file yang dimuat.';
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
        elements.splitting.calculationPara.textContent = `Perkiraan: ${chunks} chunk • Maks ${effMax} baris/chunk • Overlap ${effOverlap}`;
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
        if (!apiKey) throw new Error('API key belum diisi.');
        if (!modelName || modelName.trim() === '') throw new Error('Nama model belum diisi.');

        // Build prompt
        const prompt = `${instruction}\n\nSumber (${sourceLang}) -> Tujuan (${targetLang}):\n\n${chunk}`;

        if (provider === 'google') {
            const data = await callGoogle(apiKey, modelName, prompt);
            if (data && data.promptFeedback && data.promptFeedback.blockReason) {
                if (data.promptFeedback.blockReason === 'PROHIBITED_CONTENT') {
                    throw new Error('Terjemahan gagal: Konten mungkin melanggar kebijakan penggunaan. Silakan coba dengan teks yang berbeda.');
                }
            }
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Terjemahan gagal: Respon dari API tidak valid atau tidak lengkap.');
            return text;
        }
        if (provider === 'openrouter') {
            const data = await callOpenRouter(apiKey, modelName, prompt);
            const text = data?.choices?.[0]?.message?.content;
            if (!text) throw new Error('Terjemahan gagal: Respon dari API tidak valid atau tidak lengkap.');
            return text;
        }
        if (provider === 'cerebras') {
            const data = await callCerebras(apiKey, modelName, prompt);
            const text = data?.choices?.[0]?.message?.content;
            if (!text) throw new Error('Terjemahan gagal: Respon dari API tidak valid atau tidak lengkap.');
            return text;
        }
        throw new Error('Provider tidak dikenal.');
    };

    const startTranslation = async () => {
        errorHandling.hide();
        if (!state.uploadedFileContent) {
            errorHandling.show('Silakan unggah file .txt terlebih dahulu.');
            return;
        }
        const sourceLang = elements.api.sourceLanguageSelect.value;
        const targetLang = elements.api.targetLanguageSelect.value;
        let instruction = elements.instruction.customTextarea.value.trim();
        if (!instruction || elements.instruction.useDefaultCheckbox.checked) {
            instruction = 'Translate the following text naturally and accurately. Maintain the original formatting, tone, and context. For technical terms, provide appropriate translations while keeping important keywords recognizable.';
        }

        state.translationAborted = false;
        elements.translation.startBtn.disabled = true;
        elements.translation.stopBtn.disabled = false;
        log('Memulai proses terjemahan...');

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
            log(`Menterjemahkan chunk ${i + 1}/${originalChunks.length}...`);
            try {
                const translated = await translateChunk(chunk, sourceLang, targetLang, instruction);
                state.translatedChunks[i] = translated;
                elements.preview.originalText.textContent = chunk;
                elements.preview.translatedText.textContent = translated;
                updateProgress(i + 1, originalChunks.length);
            } catch (err) {
                errorHandling.show(err.message || 'Terjadi kesalahan saat menerjemahkan.');
                log(`Error pada chunk ${i + 1}: ${err.message || err}`);
                break;
            }
        }

        const anyTranslated = state.translatedChunks.some(t => t && t.length > 0);
        if (anyTranslated) {
            const merged = mergeChunks(state.translatedChunks.filter(Boolean));
            elements.preview.translatedText.textContent = merged;
            log('Terjemahan selesai.');
        } else {
            log('Tidak ada hasil terjemahan yang dapat ditampilkan.');
        }
        elements.translation.startBtn.disabled = false;
        elements.translation.stopBtn.disabled = true;
    };

    const stopTranslation = () => {
        state.translationAborted = true;
        elements.translation.startBtn.disabled = false;
        elements.translation.stopBtn.disabled = true;
        log('Proses terjemahan diminta berhenti.');
    };

    const handleDownloadSingle = () => {
        const content = elements.preview.translatedText.textContent || '';
        if (!content) {
            errorHandling.show('Belum ada hasil untuk diunduh.');
            return;
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'translated.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        log('Hasil terjemahan diunduh sebagai translated.txt');
    };

    const handleDownloadZip = async () => {
        errorHandling.show('Fitur ZIP belum diimplementasikan pada versi ini.');
        setTimeout(() => errorHandling.hide(), 3000);
    };

    const handleCopyToClipboard = async () => {
        const content = elements.preview.translatedText.textContent || '';
        if (!content) {
            errorHandling.show('Belum ada hasil untuk disalin.');
            return;
        }
        try {
            await navigator.clipboard.writeText(content);
            log('Hasil terjemahan disalin ke clipboard.');
        } catch (e) {
            errorHandling.show('Gagal menyalin ke clipboard.');
        }
    };

    init();
});