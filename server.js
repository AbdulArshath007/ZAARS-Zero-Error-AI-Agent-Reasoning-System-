import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

// ── Fail-fast: refuse to start without critical secrets ──────────────────────
if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set. Set it in your .env file or Vercel environment variables.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('[FATAL] DATABASE_URL is not set.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// ── CORS: whitelist production origin only ────────────────────────────────────
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,          // e.g. https://zaars-ai.vercel.app
  'http://localhost:5173',              // Vite dev server
  'http://localhost:5000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server (no Origin header) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // CSP managed by Vite/Vercel for the frontend
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 auth attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 30,                    // 30 AI requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached, please slow down.' }
});

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Initialize DB Table
const initDB = async () => {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255),
          provider VARCHAR(50) DEFAULT 'local',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT;

        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title TEXT,
          messages TEXT,
          insights TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log("Database initialized");
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
};
initDB();

app.post('/auth/register', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
  if (typeof username !== 'string' || username.length < 3 || username.length > 50)
    return res.status(400).json({ error: 'Username must be 3–50 characters' });
  if (typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  // Basic allowlist: alphanumeric + underscore only for username
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });

  try {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, provider) VALUES ($1, $2, $3) RETURNING id, username, provider',
      [username.trim(), hash, 'local']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { name: user.username, originalUsername: user.username, isGoogle: false, avatar: user.avatar_url } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Invalid request' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)) AND provider = $2', [username.trim(), 'local']);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { name: user.username, originalUsername: user.username, email: user.email, isGoogle: false, avatar: user.avatar_url, apiKey: user.api_key } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/google', authLimiter, async (req, res) => {
  const { credential } = req.body;
  if (!credential || typeof credential !== 'string')
    return res.status(400).json({ error: 'Invalid request' });
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    
    let result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND provider = $2', [email, 'google']);
    let user;
    if (result.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO users (username, email, provider) VALUES ($1, $2, $3) RETURNING id, username, email, provider',
        [email, email, 'google']
      );
      user = result.rows[0];
    } else {
      user = result.rows[0];
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { name, email, originalUsername: name, isGoogle: true, avatar: user.avatar_url || picture, apiKey: user.api_key } });
  } catch (err) {
    // Don't expose internal error details to the client
    res.status(400).json({ error: 'Google login failed' });
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.get('/user/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows.map(row => ({
      id: row.id,
      title: row.title,
      messages: JSON.parse(row.messages),
      insights: row.insights ? JSON.parse(row.insights) : null,
      date: row.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.post('/user/sessions', authenticateToken, async (req, res) => {
  const { id, title, messages, insights } = req.body;
  try {
    if (id && !isNaN(id)) {
      // Update existing
      await pool.query(
        'UPDATE sessions SET title = $1, messages = $2, insights = $3 WHERE id = $4 AND user_id = $5',
        [title, JSON.stringify(messages), JSON.stringify(insights), id, req.user.id]
      );
      res.json({ success: true, id });
    } else {
      // Create new
      const result = await pool.query(
        'INSERT INTO sessions (user_id, title, messages, insights) VALUES ($1, $2, $3, $4) RETURNING id',
        [req.user.id, title, JSON.stringify(messages), JSON.stringify(insights)]
      );
      res.json({ success: true, id: result.rows[0].id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

app.delete('/user/sessions/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Intelligence Stats Endpoint (Tailored from CRYSO)
app.get('/api/social/stats', (req, res) => {
  const now = new Date();
  res.json({
    live: true,
    postsPerMinute: 800 + Math.floor(Math.random() * 200),
    postsPerHour: 48000 + Math.floor(Math.random() * 5000),
    sentiment: 70 + Math.floor(Math.random() * 15),
    sentimentLabel: "GREED",
    breakouts: 4,
    crashRisks: 1,
    velocity: 85 + Math.random() * 10,
    timestamp: now.toISOString()
  });
});

app.post('/user/update', authenticateToken, async (req, res) => {
  const { avatar_url, api_key } = req.body;
  try {
    if (avatar_url !== undefined && api_key !== undefined) {
      await pool.query('UPDATE users SET avatar_url = $1, api_key = $2 WHERE id = $3', [avatar_url, api_key, req.user.id]);
    } else if (avatar_url !== undefined) {
      await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatar_url, req.user.id]);
    } else if (api_key !== undefined) {
      await pool.query('UPDATE users SET api_key = $1 WHERE id = $2', [api_key, req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// AI Proxy Endpoint — requires valid auth token + rate limit
app.post('/api/ai/chat', authenticateToken, aiLimiter, async (req, res) => {
  const { messages, response_format } = req.body;
  let { model } = req.body;

  // Intercept ANY decommissioned Llama 3.2 vision models from cached clients
  if (model.includes('llama-3.2') && model.includes('vision')) {
    console.log(`[BACKEND] Intercepting decommissioned model ${model} -> mapping to gemini-2.5-flash`);
    model = 'gemini-2.5-flash';
  }

  console.log(`[BACKEND] AI Request for Model: ${model}`);
  const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

  if (model.startsWith('gemini')) {
    if (!geminiKey) return res.status(500).json({ error: 'Gemini API key missing' });
    
    try {
        const contents = messages.map(msg => {
            if (msg.role === 'system') return { role: 'user', parts: [{ text: `[SYSTEM]: ${msg.content}` }] };
            if (Array.isArray(msg.content)) {
                return {
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: msg.content.map(part => {
                        if (part.type === 'text') return { text: part.text };
                        if (part.type === 'image_url') {
                            const match = part.image_url.url.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
                            if (match) return { inline_data: { mime_type: match[1], data: match[2] } };
                        }
                        return { text: typeof part === 'string' ? part : JSON.stringify(part) };
                    })
                };
            }
            return { role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] };
        });

        const systemMessage = messages.find(m => m.role === 'system');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                ...(systemMessage ? { system_instruction: { parts: [{ text: systemMessage.content }] } } : {}),
                generationConfig: {
                    ...(response_format?.type === 'json_object' ? { response_mime_type: 'application/json' } : {}),
                    temperature: 0.1,
                    maxOutputTokens: 8192
                }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini API request failed');
        
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ choices: [{ message: { content: text } }] });
    } catch (err) {
        console.error("Gemini Proxy Error:", err);
        res.status(500).json({ error: err.message });
    }
  } else {
    if (!groqKey) return res.status(500).json({ error: 'Server misconfigured: Groq API key missing' });

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                ...(response_format ? { response_format } : {}),
                temperature: 0.1,
                max_tokens: 4096
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Groq API request failed');
        res.json(data);
    } catch (err) {
        console.error("AI Proxy Error:", err);
        res.status(500).json({ error: err.message });
    }
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
