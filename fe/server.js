import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = (process.env.API_URL || 'http://api:8000').replace(/\/$/, '');

// Trust first proxy (necessary for req.secure behind Nginx/PM2)
app.set('trust proxy', 1);

// Fix for Google OAuth: Allow popups to communicate with the main window
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Middleware for parsing cookies (Must be before proxy to inject tokens)
app.use(cookieParser());

// Debug logger
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[BFF Incoming] ${req.method} ${req.url}`);
  }
  next();
});

// Proxy API requests to the backend
// MUST be before express.json() to prevent body-parsing from hanging the proxy
app.use(
  createProxyMiddleware({
    pathFilter: '/api',
    target: API_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req, res) => {
        const targetUrl = `${API_URL}${proxyReq.path}`;
        console.log(`[BFF Proxy Request] ${req.method} ${req.url} -> ${targetUrl}`);

        const accessToken = req.cookies?.access_token;
        if (accessToken) {
          proxyReq.setHeader('Authorization', `Bearer ${accessToken}`);
        }
      },
      proxyRes: (proxyRes, req, res) => {
        console.log(`[BFF Proxy Response] ${req.method} ${req.url} -> Status: ${proxyRes.statusCode}`);
      },
      error: (err, req, res) => {
        console.error(`[BFF Proxy Error] ${req.method} ${req.url} -> ${err.message}`);
      }
    }
  })
);

// Middleware for parsing JSON (Only for non-proxied routes like /auth/login)
app.use(express.json());

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
    console.log('[BFF] No access_token cookie found');
    return res.status(200).json({ authenticated: false });
  }

  try {
    const url = `${API_URL}/api/v1/auth/me`;
    console.log(`[BFF] Checking session at: ${url}`);
    
    const backendResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!backendResponse.ok) {
      console.error(`[BFF] Session check failed: Backend returned ${backendResponse.status}`);
      return res.status(200).json({ authenticated: false });
    }

    const user = await backendResponse.json();
    console.log('[BFF] Session check success for:', user.email);
    res.json({ authenticated: true, user });
  } catch (error) {
    console.error('[BFF] Session check error:', error.message);
    res.status(200).json({ authenticated: false });
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
