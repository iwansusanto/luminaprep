# LuminaPrep

LuminaPrep is an AI-powered educational and preparation platform designed to deliver personalized, adaptive learning experiences. This repository contains the source code for the entire LuminaPrep ecosystem.

---

## 🏗 Repository Structure

This project is structured as a **monorepo**, containing both the frontend user interface and the backend API services:

*   📂 **[`/fe`](./fe)** - The Frontend application (React 19, TypeScript, Vite, TanStack Router, Shadcn UI).
*   📂 **`/api`** *(Coming Soon)* - The Backend API services.
*   📄 **`docker-compose.yml`** - Root orchestration file to run the entire stack (Frontend, Database, PHPMyAdmin) locally.

---

## 🚀 Getting Started

The easiest way to get the entire LuminaPrep stack running locally is via Docker.

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/iwansusanto/luminaprep.git
   cd luminaprep
   ```
2. Start the infrastructure using Docker Compose:
   ```bash
   docker-compose up -d --build
   ```
3. Access the application:
   *   **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   *   **phpMyAdmin:** [http://localhost:8099](http://localhost:8099)
   *   **MySQL Database:** `localhost:3363` (User: `user_lp`, DB: `db_lp`)

---

## 📚 Documentation

For detailed instructions on running, developing, and building the specific services (including how to run the frontend locally without Docker), please refer to the individual service documentation:

👉 **[Frontend (FE) Documentation](./fe/README.md)**

---

## 🛠 Technology Stack

*   **Frontend:** React 19, TypeScript, Vite, TanStack Router, Tailwind CSS, Framer Motion
*   **Process Management:** PM2
*   **Database:** MySQL 8.4
*   **Infrastructure:** Docker & Docker Compose
