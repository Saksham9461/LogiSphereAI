# LogiSphere AI — Minor Project Reference & Quickstart

**LogiSphere AI** is an enterprise-grade Fleet Management, Logistics Operations, and AI Intelligence platform designed for real-time fleet dispatch, driver attendance, carbon accounting, and multi-tenant organization governance.

---

## 🚀 Architecture Overview

The system consists of three coordinated tiers:
1. **Backend (`/backend`)**: Node.js, Express, TypeScript, and Supabase (PostgreSQL) REST & WebSocket API service.
2. **Mobile App (`/App`)**: React Native 0.86 (Android & iOS) mobile application for all the roles.
3. **Web Portal (`/web`)**: React 19 + Vite web portal for organization self-registration and platform admin approvals.

---

## 🛠️ Quickstart Setup Guide

### 1. Backend Service (`/backend`)

The backend manages auth, trips, tracking, WebSocket communications, and AI intelligence.

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment (.env)
# Create .env based on .env.example with your Supabase and AI provider keys:
# PORT=5001
# SUPABASE_URL=https://<project-ref>.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# GEMINI_API_KEY=<gemini-key>
# GROQ_API_KEY=<optional-groq-key>
# CEREBRAS_API_KEY=<optional-cerebras-key>

# 3. Run in Development Mode
npm run dev

# Or build and run production server
npm run build
npm start
```

- **Health check**: `http://localhost:5001/api/health`
- **WebSockets**: `ws://localhost:5001/ws/chat`, `/ws/tracking`, `/ws/alerts`

---

### 2. Mobile App (`/App`)

Built with React Native for Android and iOS devices.

```bash
cd App

# 1. Install dependencies
npm install

# 2. iOS only (macOS)
cd ios && pod install && cd ..

# 3. Configure backend target in App/src/api/apiPath.ts:
# export const BASE_URL = 'http://localhost:5001'; // Or your machine's local IP (e.g. 192.168.1.X:5001)

# 4. Start Metro Bundler
npm start

# 5. Launch on Device / Emulator (in a separate terminal)
npm run android   # For Android Emulator or physical device
npm run ios       # For iOS Simulator (macOS only)
```

---

### 3. Web Portal (`/web`)

Standalone React Vite frontend for organization self-registration and platform administration.

```bash
cd web

# 1. Install dependencies
npm install

# 2. Start Vite Dev Server
npm run dev
```

- **Portal URL**: `http://localhost:3000`
- **Routes**:
  - `#/register` — Organization self-registration
  - `#/admin` — Platform administrator portal (review and approve pending organizations)

---

## 🌟 Core Features & Modules

- **Centralized AI Provider Hierarchy**: Automatic failover (`Gemini` → `Groq` → `Cerebras` → `LRU Cache` → `Deterministic rules`) with dynamic cooldown on HTTP 429 and 4-second bounded timeouts.
- **Trip Lifecycle & Dispatching**: Strict vehicle weight payload validation, active-trip double booking checks, and state transitions.
- **Attendance & Geofencing**: Configurable geofence radius (50m–5000m), balanced hardware location fixes, and active-trip geofence exception handling.
- **AI Carbon Intelligence**: DEFRA/EPA compliant multi-fuel emission calculations, sustainability budgets, and eco-routing advisories.
- **Fuel & Expense Tracking**: Refueling and expenditure logs with binary A4 executive PDF exports (`/api/fuel/report/export-pdf`).
- **Real-Time Messaging & SOS**: WebSocket-powered 1-on-1 chat, in-app foreground notification banners, and emergency panic SOS alerts.
- **Multi-Tenant SaaS**: Complete database schema isolation via `organization_id`, approval workflows, and role-based permissions.

---

## 🧪 Verification & Testing

Run the automated integration test suite in `/backend`:

```bash
cd backend
npx vitest run
```
