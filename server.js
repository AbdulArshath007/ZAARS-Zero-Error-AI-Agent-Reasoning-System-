import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
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

app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
  
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, provider) VALUES ($1, $2, $3) RETURNING id, username, provider',
      [username, hash, 'local']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { name: user.username, originalUsername: user.username, isGoogle: false, avatar: user.avatar_url } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND provider = $2', [username, 'local']);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { name: user.username, originalUsername: user.username, email: user.email, isGoogle: false, avatar: user.avatar_url, apiKey: user.api_key } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/google', async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;
    
    let result = await pool.query('SELECT * FROM users WHERE email = $1 AND provider = $2', [email, 'google']);
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
    
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { name: name, email: email, originalUsername: name, isGoogle: true, avatar: user.avatar_url || picture, apiKey: user.api_key } });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Google login failed' });
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
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

// AI Proxy Endpoint
app.post('/api/ai/chat', async (req, res) => {
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
