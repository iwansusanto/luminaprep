import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Middleware for parsing JSON and cookies
app.use(express.json());
app.use(cookieParser());

// Proxy API requests to the backend
app.use(
  '/api',
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
  })
);

// --- Auth Session Endpoints (BFF) ---
app.post('/auth/login', (req, res) => {
  const userData = req.body;
  // Set HttpOnly cookie. In production, use secure: true
  res.cookie('luminaprep_session', JSON.stringify(userData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  res.json({ success: true });
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('luminaprep_session');
  res.json({ success: true });
});

app.get('/auth/session', (req, res) => {
  const sessionCookie = req.cookies.luminaprep_session;
  if (sessionCookie) {
    try {
      const userData = JSON.parse(sessionCookie);
      return res.json({ authenticated: true, user: userData });
    } catch (e) {
      return res.status(401).json({ authenticated: false });
    }
  }
  return res.status(401).json({ authenticated: false });
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing by returning index.html for all non-API requests
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Proxying /api requests to ${API_URL}`);
});
