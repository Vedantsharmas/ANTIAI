/**
 * AntiGravity AI - Hardened Production Finance Voice Assistant
 * Groq API (llama-3.1-8b-instant) + Web Speech API
 */

import CONFIG from './config.js';

class AntiGravityAI {
    constructor() {
        // DOM refs
        this.orb        = document.getElementById('orb');
        this.visualizer = document.getElementById('visualizer');
        this.overlay    = document.getElementById('start-overlay');
        this.bars       = document.querySelectorAll('.bar');
        this.langSelector = document.getElementById('lang-selector');
        this.transcriptBox = document.getElementById('transcript-text');
        this.listeningAs   = document.getElementById('listening-as');
        this.stopBtn       = document.getElementById('stop-btn');
        this.hintBox       = document.getElementById('hint-text');

        // Status label (created dynamically)
        this.statusText = document.createElement('div');
        this.statusText.id = 'status-text';
        this.statusText.style.cssText = [
            'position:fixed', 'bottom:40px', 'left:50%',
            'transform:translateX(-50%)',
            'color:rgba(255,180,255,0.85)',
            'font-family:Inter,sans-serif', 'font-size:14px',
            'letter-spacing:1px', 'text-align:center',
            'pointer-events:none', 'transition:opacity 0.4s',
            'opacity:0', 'text-shadow:0 0 10px rgba(255,100,255,0.6)',
            'white-space:nowrap'
        ].join(';');
        document.getElementById('app').appendChild(this.statusText);

        // State flags
        this.recognition        = null;
        this.synthesis          = window.speechSynthesis;
        this.isListening        = false;
        this.isSpeaking         = false;
        this.isThinking         = false;
        this.isRecognitionActive= false;
        this.lastTranscript     = '';
        this.speakTimer         = null;  // watchdog for stuck synthesis
        this.animFrameId        = null;  // animation frame handle
        this.appStarted         = false;

        // Hints
        this.hints = [
            "What is a Mutual Fund?",
            "Explain SIP in simple terms.",
            "How does the stock market work?",
            "What are the benefits of insurance?",
            "Should I invest in Crypto?",
            "How can I save on taxes?",
            "What is a good credit score?",
            "Difference between Equity and Debt."
        ];
        this.hintIndex = 0;

        // Language selected in dropdown
        this.currentLanguage = this.langSelector ? this.langSelector.value : 'en-IN';

        this._init();
    }

    /* ───────────────────────────── INIT ───────────────────────────── */

    _init() {
        // Overlay click → start
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this._startApp());
        }

        // Orb click → toggle listen / stop speaking
        if (this.orb) {
            this.orb.addEventListener('click', () => this._handleOrbClick());
        }

        // Language selector
        if (this.langSelector) {
            this.langSelector.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
                console.log('[Lang]', this.currentLanguage);
            });
        }

        // Pre-load voices (Chrome loads them async)
        if (this.synthesis) {
            this.synthesis.getVoices();
            this.synthesis.onvoiceschanged = () => this.synthesis.getVoices();
        }

        // Stop button
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this._stopEverything());
        }

        // Start hint rotation
        this._rotateHints();
    }

    /* ─────────────────────────── APP START ────────────────────────── */

    _startApp() {
        if (this.appStarted) return;
        this.appStarted = true;

        if (this.overlay) this.overlay.style.display = 'none';
        this._startListening();
        this._startVisualizerLoop();
    }

    /* ──────────────────────── ORB CLICK HANDLER ───────────────────── */

    _handleOrbClick() {
        if (!this.appStarted) return; // overlay still showing

        if (this.isSpeaking) {
            this._stopSpeaking();
            return;
        }

        if (this.isThinking) return; // busy, ignore

        if (this.isRecognitionActive) return; // already listening

        this._startListening();
    }

    /* ──────────────────────── SPEECH RECOGNITION ──────────────────── */

    _startListening() {
        this.lastTranscript = '';
        if (this.transcriptBox) this.transcriptBox.textContent = 'Listening...';
        
        // Update listening-as label
        if (this.listeningAs && this.langSelector) {
            const langName = this.langSelector.options[this.langSelector.selectedIndex].text;
            this.listeningAs.textContent = `(${langName})`;
        }

        this.recognition = this._createEngine();
        if (this.recognition) this._safeStart();
    }

    _createEngine() {
        // Tear down old engine safely
        if (this.recognition) {
            this.recognition.onstart  = null;
            this.recognition.onresult = null;
            this.recognition.onerror  = null;
            this.recognition.onend    = null;
            try { this.recognition.abort(); } catch (_) {}
            this.recognition = null;
        }

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            this._setStatus('error');
            this.statusText.textContent = '⚠️ Browser does not support Speech Recognition. Use Chrome.';
            return null;
        }

        const rec = new SR();
        rec.continuous     = false;
        rec.interimResults = false;
        rec.lang           = this.currentLanguage;

        rec.onstart = () => {
            this.isRecognitionActive = true;
            this._setStatus('listening');
        };

        rec.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            if (result && result[0]) {
                const t = result[0].transcript.trim();
                if (t) {
                    this.lastTranscript = t;
                    if (this.transcriptBox) this.transcriptBox.textContent = t;
                }
            }
        };

        rec.onerror = (event) => {
            this.isRecognitionActive = false;
            const ignored = ['aborted', 'no-speech'];
            if (!ignored.includes(event.error)) {
                console.warn('[RecognitionError]', event.error);
            }
            if (!this.isThinking && !this.isSpeaking) {
                this._setStatus('idle');
            }
        };

        rec.onend = () => {
            this.isRecognitionActive = false;
            const transcript = this.lastTranscript;
            this.lastTranscript = '';

            if (transcript && !this.isThinking && !this.isSpeaking) {
                this._handleUserSpeech(transcript);
            } else if (!this.isThinking && !this.isSpeaking) {
                this._setStatus('idle');
            }
        };

        return rec;
    }

    _safeStart() {
        if (!this.recognition || this.isRecognitionActive) return;
        try {
            this.recognition.start();
        } catch (e) {
            console.warn('[RecognitionStart]', e.message);
            this._setStatus('idle');
        }
    }

    /* ────────────────────────── USER SPEECH HANDLER ───────────────── */

    async _handleUserSpeech(text) {
        console.log('[UserSaid]', text);

        if (this.isSpeaking) this._stopSpeaking();

        this._setStatus('thinking');
        this.isThinking = true;

        try {
            const reply = await this._callGroq(text);
            this.isThinking = false;
            await this._speak(reply);
        } catch (err) {
            console.error('[API]', err.message);
            this.isThinking = false;
            this._setStatus('error');
            await new Promise(r => setTimeout(r, 600));
            await this._speak('Sorry, there was a connection issue. Please tap the orb and try again.');
        } finally {
            this.isThinking = false;
            if (!this.isSpeaking) this._setStatus('idle');
        }
    }

    /* ────────────────────────── GROQ API CALL ─────────────────────── */

    async _callGroq(userInput) {
        const langName = this.langSelector
            ? this.langSelector.options[this.langSelector.selectedIndex].text
            : 'English';

        const systemPrompt =
            `You are AntiGravity AI, a high-performance multilingual finance voice assistant.\n` +
            `CRITICAL RULE: You must detect the language of the user's input and respond in that EXACT SAME language.\n` +
            `Example: If user speaks in Gujarati, your answer must be in Gujarati. If user speaks in Bengali, your answer must be in Bengali.\n` +
            `Do NOT default to Hindi or English unless the user speaks in those languages.\n\n` +
            `Selected Hint: The user interface is currently set to "${langName}", but PRIORITIZE the language they actually spoke.\n` +
            `TOPICS: Only banking, investments, stocks, tax, and general finance. Decline others politely.\n` +
            `FORMAT: Plain text only. 2-3 sentences max. Conversational style.`;

        const controller = new AbortController();
        const timeout    = setTimeout(() => controller.abort(), 15000); // 15s timeout

        let response;
        try {
            response = await fetch(CONFIG.API_URL, {
                method : 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({
                    model      : CONFIG.MODEL,
                    messages   : [
                        { role: 'system', content: systemPrompt },
                        { role: 'user',   content: userInput    }
                    ],
                    temperature: 0.7,
                    max_tokens : 300
                }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try {
                const errData = await response.json();
                errMsg = errData?.error?.message || errMsg;
            } catch (_) {}
            console.error('[GroqError]', response.status, errMsg);
            throw new Error(errMsg);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();

        if (!content) {
            console.error('[GroqEmpty]', JSON.stringify(data));
            throw new Error('Empty response received from AI.');
        }

        return content;
    }

    /* ─────────────────────────── TTS / SPEAK ──────────────────────── */

    _speak(text) {
        return new Promise((resolve) => {
            if (!this.synthesis) { resolve(); return; }

            // Cancel any previous utterance
            this.synthesis.cancel();
            if (this.speakTimer) { clearTimeout(this.speakTimer); this.speakTimer = null; }

            // Strip any remaining markdown chars
            const clean = text.replace(/[*#_`~>\-]+/g, '').replace(/\s+/g, ' ').trim();
            if (!clean) { resolve(); return; }

            const utterance  = new SpeechSynthesisUtterance(clean);
            utterance.lang   = this.currentLanguage;
            utterance.pitch  = 1.0;
            utterance.rate   = 1.0;

            // Voice selection
            utterance.voice  = this._pickVoice(this.currentLanguage);

            this.isSpeaking = true;
            this._setStatus('speaking');

            const done = () => {
                if (this.speakTimer) { clearTimeout(this.speakTimer); this.speakTimer = null; }
                this.isSpeaking = false;
                this._setStatus('idle');
                resolve();
            };

            const voice = this._pickVoice(this.currentLanguage);
            if (!voice) {
                console.warn(`[TTS] No native voice for ${this.currentLanguage}. Falling back.`);
                const fallbackMsg = `Note: Native voice for this language is not installed in your browser.`;
                if (this.transcriptBox) {
                    const original = this.transcriptBox.textContent;
                    this.transcriptBox.innerHTML = `${original}<br><small style="color:rgba(255,255,0,0.6);font-size:0.7rem">${fallbackMsg}</small>`;
                }
            }

            utterance.voice = voice;
            utterance.onend = done;
            utterance.onerror = (e) => {
                // 'interrupted' is normal when cancelled — don't log as error
                if (e.error !== 'interrupted' && e.error !== 'canceled') {
                    console.warn('[TTS error]', e.error);
                }
                done();
            };

            this.synthesis.speak(utterance);

            // Watchdog: Chrome sometimes fires neither onend nor onerror
            // Estimate: ~120 words/min at rate 1.0 → ~0.5s per word + 3s buffer
            const words   = clean.split(' ').length;
            const estMs   = Math.max(5000, words * 500 + 3000);
            this.speakTimer = setTimeout(() => {
                console.warn('[TTS watchdog] synthesis stuck — resolving manually');
                this.synthesis.cancel();
                done();
            }, estMs);
        });
    }

    _pickVoice(lang) {
        const voices = this.synthesis.getVoices();
        if (!voices.length) return null;
        
        const prefix = lang.split('-')[0];

        // 1. Try exact match (e.g., gu-IN)
        let voice = voices.find(v => v.lang === lang || v.lang.replace('_', '-') === lang);
        if (voice) return voice;

        // 2. Try prefix match (e.g., gu)
        voice = voices.find(v => v.lang.startsWith(prefix));
        if (voice) return voice;

        // 3. Indian Language Fallback: If it's an Indian language but native voice is missing,
        // use Hindi (Google हिन्दी) which is much better than English for Indian phonetics.
        const isIndian = ['hi', 'gu', 'bn', 'kn', 'ml', 'mr', 'pa', 'ta', 'te', 'ur'].includes(prefix) || lang.endsWith('-IN');
        if (isIndian) {
            const hindiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi') || v.name.includes('हिन्दी'));
            if (hindiVoice) return hindiVoice;
        }

        // 4. Global Fallback: Use any English-India voice
        const enIndia = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Ravi') || v.name.includes('Heera'));
        if (enIndia) return enIndia;

        // 5. Absolute Fallback: Default system voice
        return null;
    }

    _stopSpeaking() {
        if (this.speakTimer) { clearTimeout(this.speakTimer); this.speakTimer = null; }
        this.synthesis.cancel();
        this.isSpeaking = false;
        this._setStatus('idle');
    }

    /* ──────────────────────────── UI HELPERS ──────────────────────── */

    _setStatus(state) {
        const map = {
            listening : '🎙️ Listening...',
            thinking  : '🤔 Thinking...',
            speaking  : '🔊 Speaking...',
            idle      : 'Tap orb to speak',
            error     : '⚠️ Error — tap to retry'
        };
        this.orb.className = `orb ${state}`;

        const active = state === 'listening' || state === 'speaking';
        this.visualizer.classList.toggle('active', active);

        this.statusText.textContent  = map[state] || '';
        this.statusText.style.opacity = state === 'idle' ? '0.4' : '1';

        // Toggle Stop Button
        if (this.stopBtn) {
            const shouldShowStop = ['listening', 'thinking', 'speaking'].includes(state);
            this.stopBtn.classList.toggle('visible', shouldShowStop);
        }
    }

    /* ────────────────────────── GLOBAL STOP ───────────────────────── */

    _stopEverything() {
        console.log('[StopRequested]');
        
        // 1. Abort recognition
        if (this.recognition) {
            try { this.recognition.abort(); } catch (_) {}
            this.isRecognitionActive = false;
        }

        // 2. Cancel speech
        if (this.synthesis) {
            this.synthesis.cancel();
            if (this.speakTimer) { clearTimeout(this.speakTimer); this.speakTimer = null; }
            this.isSpeaking = false;
        }

        // 3. Reset thinking
        this.isThinking = false;

        // 4. Update UI
        this._setStatus('idle');
        if (this.transcriptBox) this.transcriptBox.textContent = 'Stopped.';
    }

    /* ───────────────────────── HINT ROTATION ──────────────────────── */

    _rotateHints() {
        if (!this.hintBox) return;
        
        setInterval(() => {
            this.hintIndex = (this.hintIndex + 1) % this.hints.length;
            this.hintBox.style.opacity = '0';
            setTimeout(() => {
                this.hintBox.textContent = `"${this.hints[this.hintIndex]}"`;
                this.hintBox.style.opacity = '1';
            }, 500);
        }, 6000);
    }

    /* ──────────────────────── VISUALIZER LOOP ─────────────────────── */

    _startVisualizerLoop() {
        const tick = () => {
            this.animFrameId = requestAnimationFrame(tick);
            if (!this.visualizer.classList.contains('active')) return;

            const isSpeaking  = this.orb.classList.contains('speaking');
            const isListening = this.orb.classList.contains('listening');

            this.bars.forEach(bar => {
                let h = 5;
                if (isListening) h = Math.random() * 30 + 5;
                else if (isSpeaking) h = Math.random() * 50 + 10;
                bar.style.height = `${h}px`;
            });
        };
        this.animFrameId = requestAnimationFrame(tick);
    }
}

/* ────────────────────────────── BOOT ──────────────────────────────── */

window.addEventListener('DOMContentLoaded', () => {
    // Check for Chrome / Edge (required for Web Speech API)
    const isChromium = !!(window.chrome) || navigator.userAgent.includes('Edg');
    if (!isChromium) {
        const warn = document.createElement('div');
        warn.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(255,60,60,0.85);color:#fff;padding:12px 24px;border-radius:12px;font-family:sans-serif;z-index:9999;text-align:center;';
        warn.textContent   = '⚠️ Please use Google Chrome or Edge for voice features.';
        document.body.appendChild(warn);
    }

    new AntiGravityAI();
});
