// config.js - Configuration for AntiGravity AI (Groq)

const CONFIG = {
    // Groq API Key (free tier — very fast inference)
    API_KEY: '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',

    // Groq API Endpoint (OpenAI-compatible)
    API_URL: 'https://api.groq.com/openai/v1/chat/completions',

    // Model — llama-3.1-8b-instant is ultra-fast, perfect for real-time voice
    MODEL: 'llama-3.1-8b-instant',

    // Finance topic keywords
    FINANCE_KEYWORDS: [
        'finance', 'investment', 'money', 'stock', 'crypto', 'tax', 'loan',
        'insurance', 'sip', 'mutual fund', 'bank', 'trading', 'budget',
        'portfolio', 'wealth', 'savings', 'interest', 'dividend', 'market',
        'equity', 'bond', 'commodity', 'derivative', 'inflation', 'gdp',
        'economy', 'startup', 'debt', 'credit', 'debit', 'wallet', 'payment',
        'revenue', 'profit', 'loss', 'accounting', 'fintech', 'pension',
        'mortgage', 'asset', 'liability', 'capital', 'broker', 'etf', 'nifty',
        'sensex', 'bitcoin', 'ethereum', 'dividend', 'yield', 'bull', 'bear'
    ]
};

export default CONFIG;
