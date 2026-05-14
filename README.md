# AntiGravity AI - Multilingual Finance Voice Assistant

AntiGravity AI is a futuristic, voice-only financial assistant that understands and speaks multiple languages. It uses the Grok API for intelligent financial reasoning and the Web Speech API for real-time speech interaction.

## Features
- **100% Voice Interface**: No text, no buttons, just pure voice.
- **Multilingual Support**: Supports 15+ languages including English, Hindi, Gujarati, Hinglish, and more.
- **Finance-Only Filter**: Specialised logic to ensure conversations stay focused on finance.
- **Futuristic UI**: A premium, animated glowing orb that reacts to your voice.
- **Interruption Handling**: Stop the AI anytime by speaking.

## Tech Stack
- HTML5, CSS3, Vanilla JavaScript
- Grok API (via x.ai)
- Web Speech API (SpeechRecognition & SpeechSynthesis)

## Setup Instructions

### 1. Get Grok API Key
1. Go to [x.ai console](https://console.x.ai/) and generate an API key.
2. Open `config.js` in the project folder.
3. Replace `'YOUR_GROK_API_KEY_HERE'` with your actual API key.

### 2. Run Locally
You can run this project using any local web server.

**Option A: VS Code Live Server**
1. Install the "Live Server" extension in VS Code.
2. Right-click `index.html` and select **Open with Live Server**.

**Option B: Python HTTP Server**
Run this in your terminal:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

## Browser Compatibility
- **Google Chrome**: Best performance and support for Web Speech API.
- **Microsoft Edge**: Good support.
- **Safari**: Supported (ensure microphone permissions are granted).
- **Firefox**: Limited support for speech recognition.

## Troubleshooting
- **Microphone Permission**: If the AI doesn't hear you, click the address bar icon to ensure microphone access is "Allowed".
- **API Errors**: Check the browser console (F12) to see if there are any errors with the Grok API key or network.
- **Speech Synthesis**: If the AI doesn't speak, ensure your system volume is up and the browser isn't muting the tab.
- **Autoplay**: Some browsers block audio until the user interacts with the page. You may need to click once anywhere on the page to start the audio context.

## Support
This AI is restricted to finance topics. If you ask about movies, sports, or coding, it will politely decline.

---
Built with ❤️ by AntiGravity
