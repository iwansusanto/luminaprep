# LuminaPrep

This repository contains the LuminaPrep application, structured as a monorepo with Frontend (FE) and Backend API (API) services.

---

## 🎨 Frontend (FE)

The LuminaPrep frontend is a modern, high-performance React application built with:
- **React 19 & TypeScript**
- **Vite** (Build Tool)
- **TanStack Router** (Type-safe file-based routing)
- **Tailwind CSS & Shadcn UI** (Styling & Components)
- **Framer Motion** (Animations)
- **PM2** (Production Process Management)

### Environment Variables

Before running or building the frontend, you must configure the necessary environment variables, particularly for Google OAuth authentication.

1. **For Local Development (Without Docker):**
   Create a `.env` file inside the `fe` directory and add your Google Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
   ```

2. **For Docker Deployment:**
   Create a `.env` file in the **root** directory (`luminarep`) with the same variable:
   ```env
   VITE_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
   ```
   *Docker Compose is configured to automatically pick up the root `.env` file and pass this variable into the frontend build process.*

### How to Run: Without Docker (Local Development)

If you want to run the frontend locally on your machine for development:

1. Open your terminal and navigate to the `fe` directory:
   ```bash
   cd fe
   ```
2. Install the required Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The app will be available at `http://localhost:5173`.*

**To test the Production Build locally:**
```bash
npm run build
npm run start
```
*This uses `pm2` and `server.js` to serve the optimized `dist` folder on `http://localhost:3000`.*

### How to Run: With Docker (Recommended)

Running with Docker automatically sets up the frontend, the network, and the databases without needing Node.js installed locally.

1. Open your terminal in the **root** directory (`luminarep`).
2. Run Docker Compose in detached mode:
   ```bash
   docker-compose up -d --build
   ```
3. The frontend is now accessible at **`http://localhost:3000`**.

*(To stop the containers, run `docker-compose down`)*

---

## ⚙️ Backend (API) & Infrastructure

The backend API handles data processing, authentication, and core business logic.

### API Connection Details
The frontend is configured to securely communicate with the API without CORS issues using an internal proxy (`server.js`):
- **Local Dev:** Proxies `/api` requests to `http://localhost:8000`.
- **Docker:** Proxies `/api` requests to the internal Docker service at `http://api:8000`.

*(You can easily override the API endpoint by passing the `API_URL` environment variable).*

### Database & Services (Docker)
When you run `docker-compose up -d`, the following infrastructure is automatically provisioned for the API:

- **MySQL Database (v8.4)**
  - Mapped to your local port: `3363`
  - Database Name: `db_lp`
  - User: `user_lp`
  - Data is persistently saved in the `./dbdata` folder.

- **phpMyAdmin**
  - Accessible at: **`http://localhost:8099`**
  - Use this to visually manage your MySQL database. (Log in with `root` or `user_lp`).
