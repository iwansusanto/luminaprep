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
    onProxyReq: (proxyReq, req, res) => {
      // Inject bearer token from cookie if it exists
      const accessToken = req.cookies.access_token;
      if (accessToken) {
        proxyReq.setHeader('Authorization', `Bearer ${accessToken}`);
      }
    },
  })
);

// --- Auth Session Endpoints (BFF) ---
app.post('/auth/login', async (req, res) => {
  try {
    const { email, name, avatar_url } = req.body;
    
    // Hit backend endpoint /api/v1/auth/signin
    const backendResponse = await fetch(`${API_URL}/api/v1/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name, avatar_url }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return res.status(backendResponse.status).json({ 
        success: false, 
        message: errorData.detail || errorData.message || 'Authentication failed' 
      });
    }

    const data = await backendResponse.json();
    const { access_token, user } = data;
    
    // Only use secure cookies if the connection is HTTPS
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    // Set access_token in HttpOnly cookie
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('access_token');
  res.json({ success: true });
});

app.get('/auth/session', async (req, res) => {
  const accessToken = req.cookies.access_token;
  if (!accessToken) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const backendResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!backendResponse.ok) {
      return res.status(401).json({ authenticated: false });
    }

    const user = await backendResponse.json();
    res.json({ authenticated: true, user });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(401).json({ authenticated: false });
  }
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
