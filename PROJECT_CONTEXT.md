# Project Context: LogiSphere AI

This document provides a complete, authoritative, and verified architectural reference for the **LogiSphere AI** repository (`/Users/sakshamojha/Documents/Projects/Minor`). It serves as the primary system context for developers, software architects, and AI coding agents working on this codebase.

---

## 1. Project Overview & Business Goals

**LogiSphere AI** (referenced across codebase and packages as **TransitOpsMobile2**) is an enterprise-grade Fleet Management & Logistics Operations Platform. It integrates an executive React Native mobile application with a resilient Node.js Express/TypeScript backend backed by a dual-mode PostgreSQL (Supabase) data layer.

### Primary Capabilities
- **Fleet Registry & Telemetry**: Full vehicle lifecycle tracking (`AVAILABLE`, `ON_TRIP`, `IN_SHOP`, `RETIRED`), load capacity enforcement, odometer tracking, and real-time GPS tracking.
- **Driver Roster & Onboarding**: Driver profiles, safety scores, license tracking with expiration warnings, manual input, and mock OCR scanning endpoint (Note: Regula Document Reader integration was abandoned; production OCR is pending).
- **Trip Lifecycle & Dispatching**: Strict cargo weight vs. vehicle payload validation, driver assignment, trip lifecycle progression (`DRAFT` / `PENDING_APPROVAL` → `ACCEPTED` → `GOING_TO_PICKUP` → `ARRIVED_AT_PICKUP` → `PICKED_UP` → `IN_TRANSIT` → `ARRIVED_AT_DROP` → `DELIVERED` / `COMPLETED` / `CANCELLED`), and automated vehicle/driver status updates. *(Note: Digital Proof of Delivery is planned/pending and NOT implemented).*
- **Attendance & Geofencing**: Configurable organization geofence radius (50m–5000m, default 200m; Migration 010), automated end-of-day clock-out reconciliation daemon (11:59 PM in configured business timezone), daily worked-duration calculation, and executive-grade PDF report exports.
- **Active Trip Geofence Attendance Exception**: Reason-capture exception allowing drivers outside their organization geofence to clock in or clock out if and only if they have an active operational trip assigned to them (Migration 012). Non-drivers and drivers without active trips remain strictly geofenced.
- **AI Carbon Intelligence & Sustainability**: Complete emissions tracking engine adhering to EPA, DEFRA, and GHG protocols across Diesel, Petrol, CNG, and Electric fleets. Features real vs. estimated fuel calculations, periodic carbon target budgets (`sustainability_targets`; Migration 011), fleet efficiency rankings, eco-route comparisons, and Gemini AI Carbon Advisor insights with 100% deterministic fallback.
- **Real-Time Messaging**: 1-on-1 driver-to-manager communications powered by native WebSockets (`/ws/chat`), delivery & read receipts, unread count badges, and an automated 24-hour message retention cleanup daemon.
- **Live GPS Fleet Tracking**: Background & foreground GPS telemetry ingested from active drivers (~45–60s target), atomic single-row upsert in `tracking_locations`, WebSocket broadcasts (`/ws/tracking`), freshness classification (`LIVE`, `UPDATING`, `STALE`, `NO_SIGNAL`), and MapLibre vector maps.
- **AI Fleet Intelligence Assistant**: Conversational Fleet Intelligence Assistant (`/api/ai/query` & `/api/ai/assistant`) with strict RBAC segregation between Managers and Drivers, deterministic KPI calculation, bounded cards, deep-link actions to tracking maps, and resilient LLM enrichment.
- **Predictive Delay Intelligence & ETA Insights**: Deterministic delay prediction engine (`/api/trip/:tripId/delay-insights`) analyzing elapsed time, planned duration, GPS location, and stop duration with optional AI operational explanations.
- **Predictive Maintenance Forecasting**: 90-day maintenance cost projections (`/api/analytics/maintenance-forecast`), vehicle risk classification (`HIGH`, `MEDIUM`, `LOW`), historical monthly trends, and budget advisories.
- **Smart Fuel Anomaly & Efficiency Intelligence**: Deterministic multi-vector fuel anomaly detection (`/api/analytics/fuel-anomalies`) flagging consumption drops (>30% below vehicle baseline), tank overflows (>15% over nominal capacity), pricing spikes (>30% over regional baseline), and rapid consecutive refuels, enriched with resilient Gemini AI explanations.
- **Maintenance & Expense Tracking**: Preventive servicing, repair logs, refueling entries, toll/operational expense bookkeeping, and cost efficiency analytics.
- **Safety & Emergency SOS**: Panic SOS trigger in mobile navigation bar and dedicated `/api/sos` & `/api/alerts` router for instant emergency notification, GPS broadcast, and audit logging.
- **Multi-Organization SaaS Architecture**: Multi-tenant database foundation (`organizations`, `organization_memberships`, `platform_admins`), public web registration (`#/register`), minimal admin approval portal (`#/admin`), and server-side tenant isolation.

---

## 2. Current Technology Stack

### Mobile Frontend (`/App`)
- **Framework**: React Native 0.86.0 (React 19.2.3) bootstrapped via `@react-native-community/cli`.
- **Language**: TypeScript 5.8.3 (`npx tsc --noEmit` clean with 0 errors).
- **Navigation**: React Navigation v7 (`@react-navigation/native` `^7.3.14`, `@react-navigation/native-stack` `^7.18.6`, `@react-navigation/drawer` `^7.13.5`, `@react-navigation/bottom-tabs` `^7.18.14`).
- **Screens**: 19 screen views (including `CarbonIntelligenceScreen.tsx`, `TripDispatcherScreen.tsx`, `LiveTrackingScreen.tsx`).
- **State Management**: Zustand v5.0.14 across 14 dedicated domain stores (`AuthStore`, `TrackingStore`, `ChatStore`, `AttendanceStore`, `TripStore`, `VehicleStore`, `DriverStore`, `MaintenanceStore`, `FuelExpenseStore`, `CarbonStore`, `AnalyticsStore`, `DashboardStore`, `NotificationStore`, `AlertStore`).
- **Local Storage**: `@react-native-async-storage/async-storage` v3.1.1 (session tokens, Remember Me preference, user metadata).
- **Styling & UI**: Custom Vanilla React Native StyleSheet, `lucide-react-native` v1.27.0, `react-native-svg` v15.15.5, `react-native-reanimated` v4.5.3, `react-native-safe-area-context` v5.8.0, and `react-native-screens` v4.26.2.
- **Maps & Geolocation**: `@maplibre/maplibre-react-native` v11.3.6, `@react-native-community/geolocation` v3.4.0, and MapTiler vector tiles.
- **HTTP & Real-Time**: Axios v1.18.1 (with Bearer token request/response interceptors) and native React Native `WebSocket`.
- **Speech Recognition**: `@react-native-voice/voice` v3.2.4 wrapped in `NativeSpeechService` with Android `RECORD_AUDIO` permission handling and manual correction fallbacks.
- **Image Capture & OCR**: `react-native-image-picker` v8.2.1 (mock endpoint testbed; Regula reader abandoned; production OCR pending).

### Backend (`/backend`)
- **Runtime & Framework**: Node.js (>=20.x / 22.x), Express 4.21.0.
- **Language & Execution**: TypeScript 5.6.2 executed in dev via `tsx watch src/server.ts` or compiled via `tsc -p tsconfig.build.json`.
- **Core Domain Modules**: Vehicles, Drivers, Trips, Tracking, Attendance & Geofencing, Carbon Intelligence & Sustainability, Analytics, Fuel, Expenses, Maintenance, Chat & WebSockets, Emergency SOS, Organizations & Multi-Tenancy, Platform Admin.
- **Real-Time & WebSockets**: Native `ws` v8.18.0 WebSocketServer attached to the Node HTTP server handling `/ws/chat`, `/ws/tracking`, and `/ws/alerts`.
- **Database Layer**: Dual-mode database layer in `backend/src/config/database.ts`:
  - **Supabase Integration**: `@supabase/supabase-js` v2.45.4 REST API client when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided. Supports realtime publication replication.
  - **In-Memory Fallback**: In-memory JS array database with pre-seeded data when Supabase credentials are not configured or when network calls timeout (3000ms safety guard).
- **Authentication & Security**: `jsonwebtoken` v9.0.2 (JWT token signing & verification), `bcryptjs` v2.4.3 (password hashing), `helmet` v7.1.0, `cors` v2.8.5.
- **Reporting & PDF Generation**: `pdfkit` v0.15.0 for binary executive A4 attendance report generation.
- **AI & External APIs**:
  - Google Gemini API (`models/gemini-3.8-flash`) via direct REST endpoint (`https://generativelanguage.googleapis.com/v1beta/models/...`). Single key configuration in `GEMINI_API_KEY`/`AI_API_KEY` with circuit breaker and quota classification; multiple-key rotation is planned/pending.
  - Google Routes API (`computeRoutes`).
  - Google Places API (New) for location autocomplete.
  - MapTiler geocoding.
- **File Uploads & Validation**: `multer` v2.4.0 (multipart document handling for OCR), `zod` v3.23.8 (environment validation).
- **Testing**: `vitest` v2.1.9 and `supertest` v7.0.0 (26 automated integration test suites).

### Web Portal (`/web`)
- **Framework & Runtime**: React 19 bootstrapped with Vite 8 (`logisphere-ai-web`).
- **Language**: TypeScript 6 / 5.x (`npm run typecheck` clean).
- **Styling & UI**: Custom Vanilla CSS design system tokenized in `src/styles/theme.css` and `src/styles/admin.css`, mirroring the verified mobile app palette (`App/src/theme/colors.ts`). Clean centered registration card, dedicated confirmation view, and compact platform admin approval portal.
- **Routes**: Minimal 3-route architecture (`#/register`, `#/registration-success`, `#/admin`).
- **Icons**: `lucide-react` v1.59.0.
- **HTTP Client**: Centralized Axios v1.20.0 client (`web/src/services/apiClient.ts`) reading dynamic `VITE_API_BASE_URL` with multi-tenant `X-Organization-Id` header injection and Bearer token interceptor.
- **Linting & Verification**: `oxlint` v1.81.0 (clean 0 warnings/errors) and `vite build` (production-ready).
- **Security Boundary**: Zero client-side credentials or admin password hashes in bundle. Fixed admin credentials verified on backend via bcrypt with rate limiting. Zero client-side leakage of Gemini API keys, Supabase service-role keys, or database credentials.

---

## 3. Repository Structure

```text
Minor/
├── PROJECT_CONTEXT.md            # Authoritative project context & architecture specification (this file)
├── App/                          # React Native Mobile Application (TransitOpsMobile2)
│   ├── android/                  # Android Native project & Gradle configuration
│   ├── ios/                      # iOS Native project & Podfile configuration
│   ├── src/
│   │   ├── api/                  # Axios HTTP client & API route definitions
│   │   │   ├── apiPath.ts        # Endpoint URL constants, Base URL configuration & WebSocket URLs
│   │   │   └── axiosClient.ts   # Axios instance with Bearer auth token interceptor
│   │   ├── assets/               # Application logo and static image assets
│   │   ├── components/           # Shared & feature UI components
│   │   │   ├── AttendanceHistory.tsx
│   │   │   ├── ClockInWidget.tsx
│   │   │   ├── EmergencyAlertBanner.tsx
│   │   │   ├── FleetMap.tsx      # Vector map with vehicle callsign markers & route rendering
│   │   │   ├── LiveMap.tsx
│   │   │   ├── MapPreview.tsx
│   │   │   ├── RoleSelector.tsx
│   │   │   ├── SOSButton.tsx
│   │   │   ├── TripDelayInsightsModal.tsx # Interactive AI delay explanation modal
│   │   │   └── ...
│   │   ├── config/               # Frontend environment settings (MapTiler API key, Supabase keys)
│   │   ├── constants/            # Role mappings and navigation constants
│   │   ├── data/                 # Seed vehicles and mock data fallbacks
│   │   ├── hooks/                # Custom React hooks (e.g. useGlobalLoading)
│   │   ├── navigation/           # React Navigation setup
│   │   │   ├── AuthNavigator.tsx # Unauthenticated stack (Login, Signup, ResetPassword)
│   │   │   ├── CustomTabBar.tsx  # Animated tab bar with expanded 3x3 grid menu & unread badges
│   │   │   ├── MainDrawerNavigator.tsx
│   │   │   ├── MainTabsNavigator.tsx
│   │   │   ├── RootNavigator.tsx # Session hydration, Splash state, and Auth guard routing
│   │   │   └── linking.ts        # Deep linking configuration (transitops://)
│   │   ├── screens/              # 19 Screen views
│   │   │   ├── AIAssistantScreen.tsx
│   │   │   ├── AlertsScreen.tsx
│   │   │   ├── AttendanceReportScreen.tsx
│   │   │   ├── CarbonIntelligenceScreen.tsx # AI Carbon Intelligence & Sustainability Dashboard
│   │   │   ├── ChangePasswordScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── DriversScreen.tsx
│   │   │   ├── FuelExpenseScreen.tsx # Fuel logs + Smart Fuel Anomaly & Efficiency Card
│   │   │   ├── LiveTrackingScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── MaintenanceScreen.tsx # Maintenance records + AI Cost Forecast tabs
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── ResetPasswordScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── SignupScreen.tsx
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── TripDispatcherScreen.tsx # Trip dispatch + Delay Insights integration
│   │   │   └── VehicleRegistryScreen.tsx
│   │   ├── services/             # Client services
│   │   │   ├── attendanceService.ts # Geofence exception support & active trip validation
│   │   │   ├── fleetAiService.ts # Live AI assistant queries & context management
│   │   │   ├── geofenceService.ts
│   │   │   ├── locationService.ts
│   │   │   ├── sosService.ts
│   │   │   ├── speech/           # Native speech recognition service (NativeSpeechService)
│   │   │   ├── storage/          # AsyncStorage token wrapper (tokenStorage.ts)
│   │   │   ├── tracking/         # Driver location tracking pipeline (driverTrackingService.ts)
│   │   │   └── supabaseClient.ts # Supabase Realtime client for mobile subscriptions
│   │   ├── store/                # 14 Zustand state stores
│   │   │   ├── AlertStore.ts
│   │   │   ├── AnalyticsStore.ts
│   │   │   ├── AttendanceStore.ts # Geofence radius, active trip exceptions, and reporting
│   │   │   ├── AuthStore.ts
│   │   │   ├── CarbonStore.ts    # Carbon Intelligence, emissions KPIs, targets, and advisor
│   │   │   ├── ChatStore.ts
│   │   │   ├── DashboardStore.ts
│   │   │   ├── DriverStore.ts
│   │   │   ├── FuelExpenseStore.ts
│   │   │   ├── MaintenanceStore.ts
│   │   │   ├── NotificationStore.ts
│   │   │   ├── TrackingStore.ts
│   │   │   ├── TripStore.ts
│   │   │   └── VehicleStore.ts
│   │   ├── theme/                # Global color palette, typography & responsiveness
│   │   ├── types/                # TypeScript interfaces (driverVoice.ts, etc.)
│   │   └── utils/                # Distance utils, JWT decoder, voice normalizer
│   ├── App.tsx                   # Main React Native application root
│   ├── index.js                  # Entry point registering App component
│   └── package.json
│
└── backend/                      # Express TypeScript Backend Service
    ├── src/
    │   ├── config/               # Database fallback abstraction, env schema & Supabase setup
    │   │   ├── database.ts       # Unified 18-table DB abstraction with atomic upsert & memory fallback
    │   │   ├── env.ts            # Zod environment schema & validation (default GEMINI_MODEL=gemini-3.8-flash)
    │   │   └── supabase.ts       # Supabase client initialization
    │   ├── middleware/           # Express authentication & authorization middleware
    │   │   └── auth.ts           # JWT verify and role authorization middleware
    │   ├── modules/              # 17 Domain feature modules
    │   │   ├── admin/            # Platform admin login, approval workflow & governance
    │   │   ├── ai/               # AI Fleet Assistant, intent routing, and resilient AI core
    │   │   │   ├── cache.ts          # Centralized in-memory TTL caching with feature TTLs
    │   │   │   ├── circuitBreaker.ts  # State machine (CLOSED, OPEN, HALF_OPEN) & cooldown
    │   │   │   ├── geminiClient.ts   # Resilient Gemini API client with auto model fallback
    │   │   │   ├── metrics.ts        # Telemetry for AI requests, cache hits, retries, trips
    │   │   │   ├── orchestrator.ts   # executeResilientAi wrapper orchestrating singleFlight + cache + fallback
    │   │   │   ├── routes.ts         # /api/ai routes (assistant, query, route-recommendation)
    │   │   │   └── singleFlight.ts   # In-flight duplicate request coalescing
    │   │   ├── alerts/           # Emergency SOS & incident alerts router (/api/alerts, /api/sos)
    │   │   ├── analytics/        # Operational fleet analytics, maintenance forecast & fuel anomalies
    │   │   │   ├── fuelAnomalyService.ts # Deterministic fuel anomaly detection engine
    │   │   │   ├── maintenanceForecastService.ts # Deterministic 90-day maintenance forecaster
    │   │   │   └── routes.ts         # Analytics endpoints including fuel anomalies & forecast
    │   │   ├── attendance/       # Clock in/out, auto clock-out daemon, PDF report, and geofence exception
    │   │   ├── auth/             # Login, password reset, and change password
    │   │   ├── carbon/           # AI-powered Carbon Intelligence & Sustainability engine
    │   │   │   ├── analytics.ts      # Multi-vector carbon anomalies, rankings, eco-routing
    │   │   │   ├── calculations.ts   # EPA/DEFRA/GHG emissions calculations per fuel type
    │   │   │   ├── carbonService.ts  # Aggregated carbon overview, target budgeting & AI advisor
    │   │   │   ├── routes.ts         # /api/carbon endpoints (overview, vehicles, trips, advisor, targets)
    │   │   │   └── types.ts          # Carbon types and data contracts
    │   │   ├── chat/             # Chat REST routes, WebSockets (/ws/chat), 24h retention cleanup
    │   │   ├── dashboard/        # Fleet overview metrics and recent activity
    │   │   ├── expenses/         # Trip expenses (tolls, miscellaneous, maintenance)
    │   │   ├── fuel/             # Vehicle refueling logs
    │   │   ├── locations/        # Google Places autocomplete & place details proxy
    │   │   ├── maintenance/      # Vehicle service logs and completion transitions
    │   │   ├── notifications/    # Operational notifications
    │   │   ├── ocr/              # Driver license scanning endpoint (mock endpoint)
    │   │   ├── organizations/    # Organization registration, status lookup, and geofence management
    │   │   ├── tracking/         # Live GPS location ingestion, querying, and WebSockets (/ws/tracking)
    │   │   ├── trips/            # Trip lifecycle management, dispatching, and delay prediction
    │   │   │   ├── delayPredictionService.ts # Deterministic delay prediction engine
    │   │   │   └── routes.ts         # Trip endpoints including /api/trip/:tripId/delay-insights
    │   │   ├── users/            # User/driver management and profile CRUD
    │   │   └── vehicles/         # Vehicle registry management and status transitions
    │   ├── utils/                # HTTP response helpers, distance calculations, ID generators
    │   ├── app.ts                # Express app initialization, middleware pipeline, and route mounting
    │   └── server.ts             # HTTP server entry point (bound to 0.0.0.0:5001), WebSockets, and cron jobs
    ├── supabase/
    │   ├── migrations/           # 13 PostgreSQL schema migrations
    │   │   ├── 001_initial_schema.sql
    │   │   ├── 002_add_must_change_password.sql
    │   │   ├── 003_enable_realtime.sql
    │   │   ├── 004_add_auto_clock_out_to_attendance.sql
    │   │   ├── 005_optimize_tracking_locations.sql
    │   │   ├── 006_create_emergency_alerts.sql
    │   │   ├── 007_add_client_request_id_to_emergency_alerts.sql
    │   │   ├── 20261006_create_chat_tables.sql
    │   │   ├── 008_create_multi_organization_tables.sql  # Multi-org tables: organizations, memberships, platform_admins
    │   │   ├── 009_safe_data_migration_and_rls.sql        # Default org backfill, FKs, triggers, and tenant RLS
    │   │   ├── 010_add_geofence_radius_to_organizations.sql # Configurable organization geofence radius
    │   │   ├── 011_create_sustainability_targets.sql     # Sustainability target budgets table & RLS
    │   │   └── 012_add_geofence_exception_to_attendance.sql # Geofence exception columns for active trips
    │   └── seed.sql              # Initial database seed records
    ├── tests/                    # 26 Vitest automated integration test suites
    │   ├── ai_assistant.test.ts
    │   ├── ai_resilience_and_caching.test.ts # 14 tests: cache, circuit breaker, single flight
    │   ├── analytics_flow.test.ts
    │   ├── attendance_auto_clockout_and_report.test.ts
    │   ├── attendance_geofence_exception.test.ts # 16 tests: active trip geofence exception criteria
    │   ├── carbon_intelligence.test.ts       # 14 tests: emissions math, targets, advisor, anomalies
    │   ├── chat_flow.test.ts
    │   ├── complete_org_registration_and_approval_flow.test.ts # End-to-end multi-tenant lifecycle
    │   ├── dashboard_flow.test.ts
    │   ├── database_multi_org_migration.test.ts # Multi-org schema, migration, RLS, and isolation tests
    │   ├── delay_prediction.test.ts          # 6 tests: ETA math, stopped trip, AI fallback
    │   ├── delete_hard_flow.test.ts
    │   ├── driver_flow.test.ts
    │   ├── emergency_alerts.test.ts          # 13 tests: SOS triggers, WebSocket alerts
    │   ├── fleet_business_rules.test.ts      # 26 tests across 9 fleet business rules
    │   ├── fuel_anomaly.test.ts              # 8 tests: baselines, overflows, price spikes, RBAC
    │   ├── fuel_expense_flow.test.ts         # 6 tests: fuel logging and operational expenses
    │   ├── maintenance_flow.test.ts          # 3 tests: maintenance logging
    │   ├── maintenance_forecast.test.ts      # 6 tests: 90-day forecast, vehicle risks
    │   ├── multi_org_authorization.test.ts   # 31 tests: multi-tenant RBAC, approval, isolation
    │   ├── offline_sos_idempotency.test.ts
    │   ├── organization_geofencing_e2e.test.ts # 12 tests: configurable geofence radius & attendance
    │   ├── route_intelligence.test.ts        # 4 tests: Google routes & AI recommendations
    │   ├── smoke.test.ts
    │   ├── tracking_pipeline.test.ts
    │   └── trip_lifecycle.test.ts
    ├── API_DOCUMENTATION.md
    └── package.json
├── web/                          # Standalone Multi-Organization React Web Portal
│   ├── public/
│   │   └── logo.png              # Application logo branding & favicon
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   │   └── PlaceAutocompleteInput.tsx # Address autocomplete using Google Places proxy
│   │   ├── pages/                # Functional portal pages
│   │   │   ├── admin/
│   │   │   │   ├── AdminApprovalDashboard.tsx # Minimal approval dashboard with real backend data
│   │   │   │   └── AdminLogin.tsx             # Dedicated fixed-credential admin login
│   │   │   ├── OrganizationRegistration.tsx   # Public registration form with Places autocomplete
│   │   │   └── RegistrationConfirmation.tsx   # Pending approval confirmation screen
│   │   ├── services/             # Centralized API layer
│   │   │   ├── adminService.ts        # Admin auth, stats, organization approval/rejection
│   │   │   ├── apiClient.ts           # Axios client with VITE_API_BASE_URL resolution & token interceptors
│   │   │   ├── endpoints.ts           # Minimal backend API route registry
│   │   │   └── organizationService.ts # Public registration & places autocomplete service
│   │   ├── styles/               # Design system stylesheets
│   │   │   ├── admin.css              # Platform admin styling & review modals
│   │   │   ├── registration.css       # Registration card, inputs & confirmation styling
│   │   │   └── theme.css              # Base resets & color tokens matching App/src/theme/colors.ts
│   │   ├── types/                # Domain types (OrgRegistration, AdminUser, AdminOrgSummary)
│   │   │   └── index.ts
│   │   ├── __tests__/            # Automated test suites
│   │   │   ├── clean_web_portal.test.ts          # Section 8 suite (13 criteria)
│   │   │   ├── organization_registration.test.ts # Registration & autocomplete suite (19 tests)
│   │   │   └── platform_admin.test.ts            # Admin approval & login suite (17 tests)
│   │   ├── App.tsx               # Route controller (#/register, #/registration-success, #/admin)
│   │   ├── index.css             # Entry stylesheet importing theme, registration & admin
│   │   └── main.tsx              # React DOM root entry
│   ├── .env                      # Local development environment settings
│   ├── .env.example              # Public env template with security warnings
│   ├── index.html                # HTML entry with Inter/Outfit typography & meta
│   ├── package.json              # Web scripts & dependencies
│   ├── tsconfig.app.json         # Client TypeScript configuration
│   ├── tsconfig.json             # Root TypeScript project references
│   ├── tsconfig.node.json        # Build tooling TypeScript configuration
│   └── vite.config.ts            # Vite build configuration (port 3000)
```

---

## 4. System Architecture & Data Flow

```text
React Native Mobile App (App/)       React Web Portal (web/)
   │                                    │
   ├── [13 Zustand Stores]              ├── [Modular Components & Pages]
   │        │                                │
   │        ├──────► Native WebSocket Client ├── [Centralized API Client: apiClient.ts]
   │        │             │                  │     (Reads VITE_API_BASE_URL,
   │        │             │                  │      Injects X-Organization-Id)
   │        ▼             │                  │
   ├── [Axios Client]     │                  │
   │        │             │                  │
   └────────┴─────────────┼──────────────────┘
                          │ (Headers: Authorization: Bearer <JWT>, X-Organization-Id)
                          ▼
Node.js Express HTTP Server (backend/src/server.ts & app.ts, listening on 0.0.0.0:5001)
   │
   ├── [Native HTTP Upgrade Listener] (WebSocket handshakes on /ws/chat, /ws/tracking, /ws/alerts)
   │
   ├── [Security & Middleware Pipeline] (helmet, cors, express.json 5mb, morgan)
   │
   ├── [Auth & RBAC Middleware] (authenticate, optionalAuth, authorize('ROLE_MANAGER', ...))
   │
   ├── [Domain Routers] (/api/auth, /api/user, /api/vehicle, /api/trip, /api/tracking, /api/chat, /api/analytics, /api/ai, /api/alerts, etc.)
   │
   ├── [AI Resilience & Orchestration Architecture] (backend/src/modules/ai/)
   │        │
   │        ├── SingleFlight Coalescing (collapses concurrent duplicate requests into 1 promise)
   │        ├── In-Memory TTL Cache (feature-specific TTLs: 120s to 3600s)
   │        ├── Circuit Breaker (CLOSED → OPEN on quota/repeated failures → HALF_OPEN after cooldown)
   │        ├── Resilient Gemini Client (jittered exponential backoff, auto model migration to gemini-3.8-flash)
   │        └── Deterministic Fallback Pipeline (all 5 AI features return 100% valid responses when Gemini is offline)
   │
   ├── [Background Daemons]
   │        ├── Auto Clock-Out Daemon (runs on boot + every 60s, reconciles expired shifts past 11:59 PM)
   │        └── Chat Retention Cleanup Daemon (runs on boot + hourly, deletes messages > 24 hours old)
   │
   ▼
Unified Database Abstraction: db (backend/src/config/database.ts)
   │
   ├── Primary: Supabase PostgreSQL (@supabase/supabase-js with 3000ms timeout guard)
   │             (18 tables: users, vehicles, trips, attendance_records, maintenance_records,
   │              fuel_logs, expense_records, chat_messages, tracking_locations, notifications,
   │              conversations, conversation_participants, messages, emergency_alerts,
   │              organizations, organization_memberships, platform_admins, sustainability_targets)
   │
   └── Fallback: In-Memory Seeded Store (guarantees zero downtime offline or if Supabase keys absent)
```

---

## 5. Gemini API Quota, Rate-Limit Strategy & Resilient AI Architecture

### A. The Challenge with Google Gemini API
1. **Free/Standard Tier Rate Limits**: Google Gemini imposes strict Requests Per Minute (RPM) and Requests Per Day (RPD) quotas. During high-concurrency fleet operations or repetitive testing, calls can quickly trigger `HTTP 429: RESOURCE_EXHAUSTED`.
2. **Model Deprecations**: Older models (such as `models/gemini-1.5-flash`) were retired/sunset on the v1beta endpoint for newer API keys, throwing `HTTP 404: Not Found`.
3. **App Availability Requirement**: A logistics operations system **cannot crash, freeze, or block drivers/managers** just because an AI API key is exhausted, rate-limited, or offline.
4. **Key Configuration & Rotation Status**: The backend reads a single API key from `GEMINI_API_KEY` (or `AI_API_KEY`). Multiple-key pool rotation is **NOT** currently implemented; rate-limiting and quota exhaustion are mitigated through multi-tier caching, single-flight coalescing, circuit-breaking, and mathematical fallbacks.

### B. The 5-Layer Resilience Strategy

To guarantee 100% continuous uptime and quota efficiency, LogiSphere AI implements a layered architecture in `backend/src/modules/ai/`:

```
Incoming AI Request (Assistant, Route, Delay, Maintenance, Fuel, Carbon)
               │
               ▼
┌────────────────────────────────────────┐
│ 1. SingleFlight Request Coalescing     │ ──► Reuses in-flight promise for duplicate keys
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 2. Feature-Aware In-Memory TTL Cache   │ ──► Hit? Return immediately (Zero LLM cost)
└──────────────────┬─────────────────────┘
                   │ Miss
                   ▼
┌────────────────────────────────────────┐
│ 3. State-Machine Circuit Breaker       │ ──► OPEN? Fast-fail to Fallback (No network lag)
└──────────────────┬─────────────────────┘
                   │ CLOSED / HALF_OPEN
                   ▼
┌────────────────────────────────────────┐
│ 4. Resilient Gemini Client             │ ──► Max 2 retries with jitter, auto model failover,
│    (models/gemini-3.8-flash)           │     strict request timeout (5000ms–15000ms)
└──────────────────┬─────────────────────┘
                   │ Success / Failure / 429
                   ▼
┌────────────────────────────────────────┐
│ 5. Deterministic Fallback Engine       │ ──► Guarantees valid operational data even if Gemini
│    (100% Math-Based Calculations)      │     is 100% offline or quota exhausted
└────────────────────────────────────────┘
```

1. **In-Memory TTL Cache (`cache.ts`)**:
   - `ROUTE_RECOMMENDATION`: 3600 seconds (1 hour).
   - `MAINTENANCE_FORECAST`: 1800 seconds (30 minutes).
   - `CARBON_INTELLIGENCE`: 1800 seconds (30 minutes).
   - `FUEL_ANOMALY_DETECTION`: 900 seconds (15 minutes).
   - `AI_ASSISTANT`: 300 seconds (5 minutes).
   - `TRIP_DELAY_INSIGHTS`: 120 seconds (2 minutes, telemetry-sensitive).
   - SHA-256 normalized hash keys isolated by organization (`org_${orgId}_${hash}`) ensure identical payloads never trigger redundant Gemini API calls or cross-tenant cache contamination.

2. **Single-Flight Coalescing (`singleFlight.ts`)**:
   - If multiple concurrent requests query the same vehicle fuel anomaly, carbon overview, or trip delay, only **1** outgoing request is dispatched. All other callers await and share the same Promise.

3. **Fast-Failing Circuit Breaker (`circuitBreaker.ts`)**:
   - States: `CLOSED` (normal), `OPEN` (tripped after 3 consecutive failures or any hard 429 daily quota exhaustion), `HALF_OPEN` (probes 1 request after 30s cooldown).
   - When tripped, it short-circuits instantly in **0.1ms**, avoiding 5-second HTTP timeout hangs.

4. **Self-Healing Gemini Client (`geminiClient.ts`)**:
   - Default model: `gemini-3.8-flash`.
   - If Google returns an HTTP 404 indicating an older model was requested, the client automatically self-heals by retrying with `gemini-3.8-flash`.
   - Output tokens budget expanded (`maxOutputTokens: 1000`) to accommodate reasoning/thinking tokens without truncating structured JSON.

5. **Deterministic Fallback Guarantees Across All 6 AI Features**:
   - **Fuel Anomaly**: Pure mathematical calculations for consumption deviations, tank overflows, and price spikes remain 100% intact; fallback advisory delivers rule-based engineering checks.
   - **Carbon Intelligence**: EPA/DEFRA/GHG emissions math, target budget variances, vehicle rankings, and anomalies are computed deterministically; fallback advisor provides actionable green fleet operational recommendations.
   - **Trip Delay Prediction**: Compares elapsed time vs. scheduled duration and GPS speed mathematically; fallback advisory provides schedule remediation steps.
   - **Maintenance Forecast**: Linear regression on historical 90-day expenses and risk scores computed deterministically; fallback provides preventive maintenance checks.
   - **Route Recommendations**: Haversine distance, speed-profile travel duration, and toll estimations are computed deterministically when Routes API/Gemini is unavailable.
   - **AI Fleet Assistant**: Deterministic keyword/intent parser queries database tables (`db.list`) directly and returns formatted metric cards and deep-links.

---

## 6. Authentication, Startup & Role-Based Access Control (RBAC)

### A. Session Restoration & Remember Me
- **Storage**: `tokenStorage` (`App/src/services/storage/tokenStorage.ts`) encapsulates `@react-native-async-storage/async-storage` with keys `'token'`, `'user'`, and `'remember_me'`.
- **Remember Me Logic**:
  - Checked during login: persists token and user metadata across app restarts.
  - Unchecked: session is cleared upon app termination or next launch.
- **Hydration Flow (`AuthStore.hydrate()`)**:
  1. Checks `tokenStorage.getRememberMe()`. If `false`, calls `tokenStorage.clearSession()` and sets `authStatus: 'unauthenticated'`.
  2. If remembered, validates token expiration via `isJwtExpired(token)`. If expired, logs a warning, wipes storage, and sets `authStatus: 'unauthenticated'`.
  3. If valid, sets `authStatus: 'authenticated'`, initializes real-time subscriptions, and connects WebSockets.

### B. Startup Flow & Blank Screen Prevention
- **Root State**: `RootNavigator.tsx` listens to `authStatus` (`'initializing' | 'authenticated' | 'unauthenticated'`).
- **Splash Screen**: During initial hydration, `authStatus === 'initializing'` renders `SplashScreen.tsx` with a branded spinner and dark theme background, completely preventing intermediate blank white screen flashes.
- **Forced Password Change**: If `user.mustChangePassword` is true, navigation redirects directly to `ChangePasswordScreen` (gestures disabled) before granting access to dashboard operations.

### C. Role-Based Dashboard Routing & Permissions
The backend and frontend enforce 5 distinct operational roles:
1. `ROLE_MANAGER` ("Fleet Manager"): Full system access across all vehicles, drivers, trips, attendance reports, chat roster, maintenance, expenses, and AI intelligence.
2. `ROLE_DISPATCHER` ("Dispatcher"): Trip dispatching, live tracking, vehicle management, and driver communications.
3. `ROLE_SAFETY_OFFICER` ("Safety Officer"): Driver safety scores, maintenance inspection logs, and incident tracking.
4. `ROLE_FINANCE` ("Financial Analyst"): Fuel logs, expense bookkeeping, and analytics reports.
5. `ROLE_DRIVER` ("Driver"): Restricted to personal assigned trips, personal attendance clock-in/out, personal vehicle details, 1-on-1 manager chat, and personal GPS location broadcasting. Drivers are strictly prohibited from viewing fleet-wide attendance, fuel anomaly analytics, or other drivers' records.

---

## 7. Detailed Implementation of Feature Areas

### 7.1 Smart Fuel Anomaly & Efficiency Intelligence (Phase 3 Completed)
- **Backend Service**: [`backend/src/modules/analytics/fuelAnomalyService.ts`](file:///Users/sakshamojha/Documents/Projects/Minor/backend/src/modules/analytics/fuelAnomalyService.ts)
- **Endpoints**: `GET /api/analytics/fuel-anomalies` (fleet-wide), `GET /api/analytics/fuel-anomalies/:vehicleId` (vehicle drill-down).
- **Access**: Restricted to `ROLE_MANAGER`, `ROLE_DISPATCHER`, `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`. Drivers receive `403 Forbidden`.
- **Calculation Rules**:
  - Deterministic Moving Baseline: Volume-weighted $\sum \text{Distance} / \sum \text{Fuel Consumed}$.
  - Strict Minimum Sample Requirement: $\ge 3$ verified completed trips required; otherwise returns `INSUFFICIENT_DATA` honestly without fabricating numbers.
  - Actual Distance vs. Estimated Distance: Actual distance derived strictly from odometer: $\text{finalOdometer} - \text{startingOdometer}$. If fallback planned distance is used, it is explicitly flagged with `latestTripEstimatedDistance: true`.
  - Multi-Vector Detection: `CONSUMPTION_DEVIATION` (>30% drop), `TANK_CAPACITY_OVERFLOW` (>15% over nominal capacity), `PRICING_DEVIATION` (>30% over ₹110/L reference), `REFUEL_CLUSTERING` (multiple refuels in 24h).
  - Objective Terminology: Never labels drivers or transactions as "fraud" or "theft".
  - Resilient AI: Invokes Gemini (`executeResilientAi`) with strict structured JSON schema for executive summary and actionable checks; falls back to deterministic advisory if Gemini is unavailable.
- **Mobile Screen**: [`App/src/screens/FuelExpenseScreen.tsx`](file:///Users/sakshamojha/Documents/Projects/Minor/App/src/screens/FuelExpenseScreen.tsx)
  - Features an "AI Fuel Anomaly & Efficiency" card between action buttons and fuel logs.
  - Displays summary metric pills (High Anomaly, Moderate, Fleet Avg km/L, Pending Baseline).
  - Shows Gemini AI Executive Summary and recommended technical inspection checks.
  - Displays flagged vehicle review cards with severity pills, baseline comparisons, and estimated distance notes.
  - Includes expandable full fleet baseline breakdown and complete loading, empty, error, and insufficient-data states.

### 7.2 Trip Delay Prediction & ETA Insights
- **Backend Service**: [`backend/src/modules/trips/delayPredictionService.ts`](file:///Users/sakshamojha/Documents/Projects/Minor/backend/src/modules/trips/delayPredictionService.ts)
- **Endpoints**: `GET /api/trip/:tripId/delay-insights`, `GET /api/trips/:tripId/delay-insights`.
- **Logic**: Mathematical delay calculation comparing elapsed time vs. planned duration, GPS distance remaining, and prolonged stationary stops.
- **Mobile Integration**: [`App/src/components/TripDelayInsightsModal.tsx`](file:///Users/sakshamojha/Documents/Projects/Minor/App/src/components/TripDelayInsightsModal.tsx) accessible from `TripDispatcherScreen.tsx`.

### 7.3 Predictive Maintenance Forecasting
- **Backend Service**: [`backend/src/modules/analytics/maintenanceForecastService.ts`](file:///Users/sakshamojha/Documents/Projects/Minor/backend/src/modules/analytics/maintenanceForecastService.ts)
- **Endpoints**: `GET /api/analytics/maintenance-forecast`, `GET /api/analytics/maintenance-forecast/:vehicleId`.
- **Logic**: 90-day moving expense analysis, per-vehicle risk ranking (`HIGH`, `MEDIUM`, `LOW`), historical monthly trends, and budget advisories.
- **Mobile Integration**: [`App/src/screens/MaintenanceScreen.tsx`](file:///Users/sakshamojha/Documents/Projects/Minor/App/src/screens/MaintenanceScreen.tsx) with toggleable `RECORDS` and `FORECAST` views.

### 7.4 Live GPS Fleet Tracking Pipeline
- **Files**: `backend/src/modules/tracking/routes.ts`, `backend/src/modules/tracking/websocket.ts`, `App/src/services/tracking/driverTrackingService.ts`, `App/src/store/TrackingStore.ts`, `App/src/screens/LiveTrackingScreen.tsx`.
- **Logic**: Driver tracking activates when an assigned trip is started. Ingests GPS telemetry (45-60s interval, >100m movement). Atomic `db.upsert` maintains strictly one active row per trip in `tracking_locations`. WebSocket broadcasts coordinate updates to managers. MapLibre renders callsign markers and auto-focuses vehicles.

### 7.5 Attendance, Configurable Geofencing & Active Trip Exception
- **Files**: `backend/src/modules/attendance/routes.ts`, `backend/src/modules/attendance/autoClockOut.ts`, `backend/src/modules/attendance/pdfGenerator.ts`, `App/src/components/ClockInWidget.tsx`, `App/src/store/AttendanceStore.ts`, `App/src/screens/AttendanceReportScreen.tsx`.
- **Configurable Geofence Radius**: Each organization configures its geofence radius (`geofence_radius` in `organizations`, 50m–5000m, default 200m; Migration 010). Distance is verified using Haversine calculation against organization center coordinates.
- **Active Trip Geofence Exception**: If an authenticated Driver is outside the geofence but has an active operational trip assigned to them (`ACCEPTED`, `ASSIGNED`, `DISPATCHED`, `GOING_TO_PICKUP`, `ARRIVED_AT_PICKUP`, `PICKED_UP`, `IN_TRANSIT`, `ARRIVED_AT_DROP`), the mobile app displays an "Outside Organization Location" modal. The driver enters a mandatory location description and submits the clock-in or clock-out request. The backend independently validates driver identity, active trip assignment, and outside coordinates, storing `is_geofence_exception = true`, `exception_reason`, `trip_id`, `exception_distance`, and `exception_action` in `attendance_records` (Migration 012). Non-drivers and drivers without active trips remain strictly blocked outside the geofence.
- **Auto Clock-Out Daemon**: Background cron runs every 60s, automatically reconciling unclosed shifts at 11:59 PM in configured business timezone (`Asia/Kolkata`).
- **Executive Reporting**: Generates downloadable A4 PDF reports via `pdfkit` streamed securely.

### 7.6 Real-Time Messaging & WebSockets
- **Files**: `backend/src/modules/chat/websocket.ts`, `backend/src/modules/chat/cleanup.ts`, `backend/src/modules/chat/routes.ts`, `App/src/store/ChatStore.ts`, `App/src/screens/ChatScreen.tsx`.
- **Logic**: 1-on-1 messaging over WebSocket `/ws/chat`. Unread counts tracked per conversation. Automated hourly cleanup job purges messages older than 24 hours.

### 7.7 Emergency Alerts & SOS System
- **Files**: `backend/src/modules/alerts/routes.ts`, `App/src/components/SOSButton.tsx`, `App/src/screens/AlertsScreen.tsx`, `App/src/store/AlertStore.ts`.
- **Logic**: Panic button in mobile navigation bar records alert in `emergency_alerts` table, captures real-time GPS coordinates, and broadcasts instant alerts over WebSockets to manager dashboards with audio/vibration cues.

### 7.8 AI-Powered Carbon Intelligence & Sustainability Engine
- **Files**: `backend/src/modules/carbon/calculations.ts`, `backend/src/modules/carbon/analytics.ts`, `backend/src/modules/carbon/carbonService.ts`, `backend/src/modules/carbon/routes.ts`, `App/src/store/CarbonStore.ts`, `App/src/screens/CarbonIntelligenceScreen.tsx`.
- **Standardized Emissions Calculation**: EPA, DEFRA, and GHG protocols:
  - Diesel: 2.68 kg CO2/L
  - Petrol: 2.31 kg CO2/L
  - CNG: 1.82 kg CO2/kg
  - Electric: 0.82 kg CO2/kWh regional grid factor
- **Actual vs. Estimated Accounting**: Distinguishes fuel-based emissions (`ACTUAL_FUEL` using verified refueling and odometer telemetry) vs. distance-modeled estimates (`ESTIMATED_DISTANCE`).
- **Sustainability Target Budgets**: Organization-scoped monthly CO2 emission limits stored in `sustainability_targets` (Migration 011). Real-time trajectory tracking flags whether the fleet is `ON_TRACK` or `EXCEEDED`.
- **Fleet Ranking & Anomalies**: Identifies least efficient vehicles (high g CO2/km) and flags excessive idle fuel burn, route detour emissions, and sudden consumption spikes.
- **Eco-Route Comparison**: Evaluates candidate delivery routes on carbon footprint, fuel cost, and travel time trade-offs.
- **AI Carbon Advisor**: Gemini-powered executive recommendations for route optimization and fleet electrification, backed by 100% deterministic mathematical fallback.

---

## 8. State Management Architecture

The mobile application utilizes **Zustand v5** across 14 distinct stores:

| Store Name | File Path | Controlled State | Key Actions | Persistence |
| :--- | :--- | :--- | :--- | :--- |
| `AuthStore` | `App/src/store/AuthStore.ts` | `authStatus`, `user`, `token`, `loading`, `error` | `hydrate()`, `login()`, `logout()`, `changePassword()` | `AsyncStorage` via `tokenStorage` |
| `TrackingStore` | `App/src/store/TrackingStore.ts` | `liveFleet`, `selectedTrip`, `loading`, `isConnected` | `fetchLiveFleet()`, `subscribeRealtime()`, `setSelectedTrip()` | In-Memory (Zustand) |
| `ChatStore` | `App/src/store/ChatStore.ts` | `conversations`, `messages`, `rosterUsers`, `onlineUserIds`, `activeConversationId` | `initSocket()`, `sendMessage()`, `markConversationAsRead()`, `fetchConversations()` | In-Memory (Zustand) |
| `AttendanceStore` | `App/src/store/AttendanceStore.ts` | `status`, `history`, `geofence`, `activeTrip`, `reportItems`, `reportMetrics`, `expandedRowIds` | `clockIn()`, `clockOut()`, `fetchStatus()`, `fetchActiveTrip()`, `fetchReport()`, `exportPdf()` | In-Memory (Zustand) |
| `TripStore` | `App/src/store/TripStore.ts` | `trips`, `trip`, `loading`, `error` | `getTrips()`, `registerTrip()`, `dispatchTrip()`, `completeTrip()`, `cancelTrip()` | In-Memory (Zustand) |
| `VehicleStore` | `App/src/store/VehicleStore.ts` | `vehicles`, `vehicle`, `loading`, `error` | `getVehicles()`, `registerVehicle()`, `updateVehicle()`, `deleteVehicle()` | In-Memory (Zustand) |
| `DriverStore` | `App/src/store/DriverStore.ts` | `drivers`, `driver`, `loading`, `error` | `fetchDrivers()`, `getDrivers()` | In-Memory (Zustand) |
| `MaintenanceStore` | `App/src/store/MaintenanceStore.ts` | `records`, `loading`, `error` | `fetchRecords()`, `addRecord()`, `completeRecord()` | In-Memory (Zustand) |
| `FuelExpenseStore` | `App/src/store/FuelExpenseStore.ts` | `fuelLogs`, `expenses`, `loading`, `error` | `fetchFuel()`, `addFuel()`, `fetchExpenses()`, `addExpense()` | In-Memory (Zustand) |
| `CarbonStore` | `App/src/store/CarbonStore.ts` | `overview`, `loading`, `error`, `selectedPeriod`, `targetStatus` | `fetchOverview()`, `setTarget()`, `fetchVehicles()`, `fetchTrips()` | In-Memory (Zustand) |
| `AlertStore` | `App/src/store/AlertStore.ts` | `alerts`, `unreadCount`, `activeAlert`, `loading` | `triggerSOS()`, `fetchAlerts()`, `acknowledgeAlert()`, `resolveAlert()` | In-Memory (Zustand) |
| `AnalyticsStore` | `App/src/store/AnalyticsStore.ts` | `analyticsData`, `loading`, `error` | `fetchAnalytics()` | In-Memory (Zustand) |
| `DashboardStore` | `App/src/store/DashboardStore.ts` | `summary`, `recentTrips`, `loading`, `error` | `fetchSummary()` | In-Memory (Zustand) |
| `NotificationStore` | `App/src/store/NotificationStore.ts` | `notifications`, `unreadCount`, `loading` | `fetchNotifications()`, `markAsRead()` | In-Memory (Zustand) |

---

## 9. Complete API Inventory

| Route Path | Method | Auth Required | Module File | Description & Payload | Verified Status |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `/health` | GET | None | `app.ts` | Health check returning service status | Fully Verified |
| `/ws/chat` | WS | Query Token | `modules/chat/websocket.ts` | WebSocket for chat messaging, typing, and read receipts | Fully Verified |
| `/ws/tracking` | WS | Query Token | `modules/tracking/websocket.ts` | WebSocket broadcasting live vehicle coordinates | Fully Verified |
| `/ws/alerts` | WS | Query Token | `modules/alerts/routes.ts` | WebSocket broadcasting emergency SOS alerts | Fully Verified |
| `/api/auth/login` | POST | None | `modules/auth/routes.ts` | Email & password authentication, returns JWT token | Fully Verified |
| `/api/auth/request-reset-password` | GET/POST | None | `modules/auth/routes.ts` | Generates password reset token | Fully Verified |
| `/api/auth/reset-password` | POST | None | `modules/auth/routes.ts` | Resets password using reset token | Fully Verified |
| `/api/auth/change-password` | POST | Bearer | `modules/auth/routes.ts` | Updates password and resets `mustChangePassword` | Fully Verified |
| `/api/user/create` | POST | Optional | `modules/users/routes.ts` | Creates user or driver record with Supabase sync | Fully Verified |
| `/api/user` | GET | None | `modules/users/routes.ts` | Fetches users list (optional `?role=ROLE_DRIVER`) | Fully Verified |
| `/api/user/update` | PUT | None | `modules/users/routes.ts` | Updates user record | Fully Verified |
| `/api/user/delete` | DELETE | None | `modules/users/routes.ts` | Deletes user record | Fully Verified |
| `/api/vehicle` | GET | None | `modules/vehicles/routes.ts` | Fetches vehicle fleet list | Fully Verified |
| `/api/vehicle/create` | POST | None | `modules/vehicles/routes.ts` | Registers a new vehicle with registration plate and load capacity | Fully Verified |
| `/api/vehicle/update/` | PUT | None | `modules/vehicles/routes.ts` | Updates vehicle record by query `?id=...` | Fully Verified |
| `/api/vehicle/delete/` | DELETE | None | `modules/vehicles/routes.ts` | Deletes vehicle record by query `?id=...` | Fully Verified |
| `/api/trip` | GET | None | `modules/trips/routes.ts` | Fetches trips list | Fully Verified |
| `/api/trip/create` | POST | None | `modules/trips/routes.ts` | Validates vehicle capacity vs cargo weight, dispatches trip | Fully Verified |
| `/api/trip/dispatch/:tripID` | PUT | None | `modules/trips/routes.ts` | Advances trip to DISPATCHED and sets vehicle ON_TRIP | Fully Verified |
| `/api/trip/complete/:tripID` | PUT | None | `modules/trips/routes.ts` | Completes trip, updates final odometer, frees vehicle to AVAILABLE | Fully Verified |
| `/api/trip/cancel/:tripID` | PUT | None | `modules/trips/routes.ts` | Cancels trip and frees vehicle to AVAILABLE | Fully Verified |
| `/api/trip/:tripId/delay-insights` | GET | Optional | `modules/trips/routes.ts` | Deterministic delay calculation and AI ETA insights | Fully Verified |
| `/api/attendance/status` | GET | Optional | `modules/attendance/routes.ts` | Returns today's active shift status, geofence config, and active trip | Fully Verified |
| `/api/attendance/active-trip` | GET | Bearer | `modules/attendance/routes.ts` | Validates and returns active assigned trip for driver geofence exception | Fully Verified |
| `/api/attendance/clock-in` | POST | Optional | `modules/attendance/routes.ts` | Opens attendance session; validates geofence or active trip exception | Fully Verified |
| `/api/attendance/clock-out` | POST | Optional | `modules/attendance/routes.ts` | Clocks out attendance session; supports active trip geofence exception | Fully Verified |
| `/api/attendance/history` | GET | Optional | `modules/attendance/routes.ts` | Returns raw attendance records | Fully Verified |
| `/api/attendance/report` | GET | Optional | `modules/attendance/routes.ts` | Returns grouped daily staff attendance sessions and KPIs | Fully Verified |
| `/api/attendance/report/export-pdf`| GET | Optional | `modules/attendance/routes.ts` | Generates and streams binary A4 PDF attendance report | Fully Verified |
| `/api/attendance/reconcile` | POST | Optional | `modules/attendance/routes.ts` | Manually triggers auto clock-out reconciliation daemon | Fully Verified |
| `/api/carbon/overview` | GET | Optional | `modules/carbon/routes.ts` | Full emissions overview, KPIs, breakdowns, targets, AI advisor | Fully Verified |
| `/api/carbon/vehicles` | GET | Optional | `modules/carbon/routes.ts` | Vehicle carbon rankings and efficiency profiles | Fully Verified |
| `/api/carbon/trips` | GET | Optional | `modules/carbon/routes.ts` | Detailed trip emissions records with actual vs estimated tag | Fully Verified |
| `/api/carbon/advisor` | GET | Optional | `modules/carbon/routes.ts` | AI Carbon Advisor recommendations with deterministic fallback | Fully Verified |
| `/api/carbon/anomalies` | GET | Optional | `modules/carbon/routes.ts` | Fleet carbon anomalies (idle fuel burn, route detours) | Fully Verified |
| `/api/carbon/targets` | GET/POST/PUT| Authenticate (RBAC)| `modules/carbon/routes.ts` | Inspect or configure monthly organization CO2 emission budget | Fully Verified |
| `/api/carbon/eco-route-compare` | POST | Optional | `modules/carbon/routes.ts` | Multi-route comparison on distance, fuel, emissions, and cost | Fully Verified |
| `/api/carbon/report` | GET | Optional | `modules/carbon/routes.ts` | Executive sustainability and emissions audit report | Fully Verified |
| `/api/tracking/live` | GET | Optional | `modules/tracking/routes.ts` | Returns live GPS snapshot for all active trips | Fully Verified |
| `/api/tracking/:tripID` | GET | Bearer | `modules/tracking/routes.ts` | Returns latest coordinates for specific trip | Fully Verified |
| `/api/tracking/location` | POST | Bearer | `modules/tracking/routes.ts` | Ingests live driver GPS, updates single row, broadcasts WebSocket | Fully Verified |
| `/api/chat/users` | GET | Bearer | `modules/chat/routes.ts` | Returns user roster for chat with online status | Fully Verified |
| `/api/chat/conversations` | GET | Bearer | `modules/chat/routes.ts` | Returns 1-on-1 conversations with unread counts within 24h | Fully Verified |
| `/api/chat/conversations` | POST | Bearer | `modules/chat/routes.ts` | Initiates 1-on-1 conversation between two users | Fully Verified |
| `/api/chat/conversations/:id/messages` | GET | Bearer | `modules/chat/routes.ts` | Fetches message history within 24-hour retention window | Fully Verified |
| `/api/chat/conversations/:id/messages` | POST | Bearer | `modules/chat/routes.ts` | Posts a message to a conversation | Fully Verified |
| `/api/chat/conversations/:id/read` | POST | Bearer | `modules/chat/routes.ts` | Marks conversation messages read and resets unread count | Fully Verified |
| `/api/ai/query` | POST | Bearer | `modules/ai/routes.ts` | Natural language fleet assistant query with role awareness | Fully Verified |
| `/api/ai/assistant` | POST | Bearer | `modules/ai/routes.ts` | Conversational assistant endpoint with cache & resilient fallback | Fully Verified |
| `/api/ai/route-recommendation` | POST | Bearer | `modules/ai/routes.ts` | Route intelligence, ETA, toll costs, and safety advice | Fully Verified |
| `/api/analytics/maintenance-forecast` | GET | Optional | `modules/analytics/routes.ts` | Fleet 90-day maintenance cost forecast & risk ratings | Fully Verified |
| `/api/analytics/maintenance-forecast/:vehicleId` | GET | Optional | `modules/analytics/routes.ts` | Single vehicle maintenance projection & history | Fully Verified |
| `/api/analytics/fuel-anomalies` | GET | Optional (RBAC)| `modules/analytics/routes.ts` | Fleet-wide deterministic fuel anomaly report & AI advisory | Fully Verified |
| `/api/analytics/fuel-anomalies/:vehicleId` | GET | Optional (RBAC)| `modules/analytics/routes.ts` | Single vehicle fuel baseline, variance, and anomaly history | Fully Verified |
| `/api/maintenance` | GET | None | `modules/maintenance/routes.ts` | Returns maintenance records with vehicle names | Fully Verified |
| `/api/maintenance/create` | POST | None | `modules/maintenance/routes.ts` | Registers vehicle maintenance task | Fully Verified |
| `/api/maintenance/:id/complete` | PUT | None | `modules/maintenance/routes.ts` | Marks maintenance record completed | Fully Verified |
| `/api/fuel` | GET | None | `modules/fuel/routes.ts` | Returns vehicle refueling logs | Fully Verified |
| `/api/fuel/create` | POST | None | `modules/fuel/routes.ts` | Adds a refueling log | Fully Verified |
| `/api/expenses` | GET | None | `modules/expenses/routes.ts` | Returns trip expenses (toll, misc, maint) | Fully Verified |
| `/api/expenses/create` | POST | None | `modules/expenses/routes.ts` | Adds an expense record | Fully Verified |
| `/api/dashboard/summary` | GET | None | `modules/dashboard/routes.ts` | Returns fleet KPIs and recent trip activity | Fully Verified |
| `/api/analytics` | GET | None | `modules/analytics/routes.ts` | Returns fleet utilization, operational costs, fuel efficiency | Fully Verified |
| `/api/alerts` | GET | Bearer | `modules/alerts/routes.ts` | Returns emergency alerts list | Fully Verified |
| `/api/alerts/count` | GET | Bearer | `modules/alerts/routes.ts` | Returns active emergency alert count | Fully Verified |
| `/api/alerts/:id` | GET | Bearer | `modules/alerts/routes.ts` | Returns specific alert details | Fully Verified |
| `/api/alerts/:id/acknowledge` | POST | Bearer | `modules/alerts/routes.ts` | Acknowledges an emergency alert | Fully Verified |
| `/api/alerts/:id/resolve` | POST | Bearer | `modules/alerts/routes.ts` | Resolves an emergency alert | Fully Verified |
| `/api/sos/trigger` | POST | Bearer | `modules/alerts/routes.ts` | Instant panic SOS broadcast and database record creation | Fully Verified |
| `/api/notifications` | GET | None | `modules/notifications/routes.ts` | Returns user notifications | Fully Verified |
| `/api/locations/autocomplete` | POST/GET| None | `modules/locations/routes.ts` | Google Places autocomplete proxy | Fully Verified |
| `/api/locations/details/:id` | GET | None | `modules/locations/routes.ts` | Google Places place details proxy | Fully Verified |
| `/api/ocr/scan-license` | POST | None | `modules/ocr/routes.ts` | Multipart driver license OCR extraction (mock result) | Mock Endpoint |
| `/api/org/register` | POST | None | `modules/organizations/routes.ts` | Public tenant organization registration | Fully Verified |
| `/api/org/status/:slugOrId` | GET | None | `modules/organizations/routes.ts` | Public registration status review check | Fully Verified |
| `/api/org/my-organizations` | GET | Bearer | `modules/organizations/routes.ts` | User membership list across organizations | Fully Verified |
| `/api/admin/login` | POST | None | `modules/admin/routes.ts` | Fixed platform admin authentication (bcrypt, rate-limited) | Fully Verified |
| `/api/admin/me` | GET | Bearer | `modules/admin/routes.ts` | Verifies active platform admin session | Fully Verified |
| `/api/admin/stats` | GET | Bearer | `modules/admin/routes.ts` | Aggregated organization review counts | Fully Verified |
| `/api/admin/orgs` | GET | Bearer | `modules/admin/routes.ts` | Organization review queue with filter tabs | Fully Verified |
| `/api/admin/orgs/:id/approve` | POST | Bearer | `modules/admin/routes.ts` | Approves pending tenant organization | Fully Verified |
| `/api/admin/orgs/:id/reject` | POST | Bearer | `modules/admin/routes.ts` | Rejects tenant application with audit reason | Fully Verified |
| `/api/admin/orgs/:id/suspend` | POST | Bearer | `modules/admin/routes.ts` | Suspends active tenant organization | Fully Verified |

---

## 10. Database Architecture & Schema

The database is built on PostgreSQL with Supabase migrations in `backend/supabase/migrations/`. When running offline or without credentials, `backend/src/config/database.ts` transparently stores rows in an in-memory database with pre-seeded data.

### Schema Definition (18 Tables)

#### 1. `users`
- `id` (`text`, PK): Unique user identifier (`usr-...`, `drv-...` or Supabase UUID).
- `name` (`text`, NOT NULL): Full name.
- `email` (`text`, UNIQUE, NOT NULL): Email address.
- `phoneNo` (`text`): Phone number.
- `passwordHash` (`text`, NOT NULL): Bcrypt password hash.
- `role` (`text`, NOT NULL): `ROLE_MANAGER`, `ROLE_DISPATCHER`, `ROLE_SAFETY_OFFICER`, `ROLE_FINANCE`, `ROLE_DRIVER`.
- `organization_id` (`uuid`, FK -> `organizations.id`): Tenant organization.
- `licenseNo` (`text`): Driver license number.
- `licenseExpiryDate` (`text`): License expiration date.
- `trips` (`integer`, Default `0`): Total trips completed.
- `safetyScore` (`numeric`, Default `95`): Safety score percentage.
- `status` (`text`, Default `'ACTIVE'`): `ACTIVE`, `AVAILABLE`, `ON_TRIP`, `OFF_DUTY`, `SUSPENDED`.
- `must_change_password` (`boolean`, Default `false`): Requires immediate password change.
- `createdAt`, `updatedAt` (`timestamptz`).

#### 2. `vehicles`
- `vehicleID` (`text`, PK): Vehicle ID (`veh-...`).
- `organization_id` (`uuid`, FK -> `organizations.id`): Tenant organization.
- `registrationNumber` (`text`, UNIQUE, NOT NULL): Registration number / license plate.
- `name` (`text`, NOT NULL): Vehicle callsign (e.g. `VAN-01`).
- `type` (`text`, NOT NULL): `VAN`, `TRUCK`, `MINI`.
- `maxLoadCapacity` (`numeric`, NOT NULL): Max cargo weight in kg.
- `odometer` (`numeric`, Default `0`): Odometer reading in km.
- `acquisitionCost` (`numeric`, Default `0`): Acquisition cost in INR.
- `status` (`text`, Default `'AVAILABLE'`): `AVAILABLE`, `ON_TRIP`, `IN_SHOP`, `RETIRED`.
- `createdAt`, `updatedAt` (`timestamptz`).

#### 3. `trips`
- `tripID` (`text`, PK): Trip identifier (`TRP-...`).
- `organization_id` (`uuid`, FK -> `organizations.id`): Tenant organization.
- `source` (`text`, NOT NULL): Origin depot/location.
- `destination` (`text`, NOT NULL): Destination location.
- `status` (`text`, Default `'PENDING_APPROVAL'`): `DRAFT`, `PENDING_APPROVAL`, `ACCEPTED`, `ASSIGNED`, `GOING_TO_PICKUP`, `ARRIVED_AT_PICKUP`, `PICKED_UP`, `IN_TRANSIT`, `ARRIVED_AT_DROP`, `DELIVERED`, `COMPLETED`, `CANCELLED`, `DISPATCHED`.
- `vehicleID` (`text`, FK -> `vehicles.vehicleID`).
- `driverID` (`text`, FK -> `users.id`).
- `cargoWeight` (`numeric`, Default `0`): Cargo load weight in kg.
- `plannedDistance` (`numeric`, Default `0`): Distance in km.
- `startingOdometer` (`numeric`, Default `0`): Starting odometer.
- `finalOdometer` (`numeric`): Ending odometer.
- `fuelConsumed` (`numeric`): Fuel consumed in liters.
- `sourceLatitude`, `sourceLongitude` (`numeric`): Origin coordinates.
- `destinationLatitude`, `destinationLongitude` (`numeric`): Destination coordinates.
- `createdAt`, `updatedAt` (`timestamptz`).

#### 4. `attendance_records`
- `id` (`text`, PK): Record identifier (`att-...`).
- `userId` (`text`, FK -> `users.id`).
- `organization_id` (`uuid`, FK -> `organizations.id`): Tenant organization scoping.
- `date` (`text`, NOT NULL): Date string.
- `clockInTime` (`text`, NOT NULL): Time string (e.g. `09:00 AM`).
- `clockOutTime` (`text`): Time string (e.g. `05:30 PM`).
- `latitude`, `longitude` (`numeric`): Clock-in GPS coordinates.
- `locationName` (`text`): Office or depot name.
- `distanceFromOffice` (`numeric`): Distance to office in meters.
- `status` (`text`, NOT NULL): Verification status (`Verified Location`, `Auto Clocked Out (11:59 PM)`).
- `auto_clock_out` (`boolean`, Default `false`): True if closed by daemon.
- `clock_out_type` (`text`, Default `'MANUAL'`): `MANUAL` or `AUTOMATIC`.
- `is_geofence_exception` (`boolean`, Default `false`): True if recorded outside geofence via active trip exception (Migration 012).
- `exception_reason` (`text`): Driver-entered mandatory description of current location and operational purpose.
- `trip_id` (`text`, FK -> `trips.tripID` ON DELETE SET NULL): Associated active operational trip.
- `exception_distance` (`numeric`): Distance in meters from organization geofence center at time of submission.
- `exception_action` (`text`): Action performed under exception (`CLOCK_IN` or `CLOCK_OUT`).
- `createdAt`, `updatedAt` (`timestamptz`).

#### 5. `tracking_locations`
- `id` (`text`, PK): Location identifier (`loc-...`).
- `tripID` (`text`, UNIQUE, NOT NULL): Trip ID (Strictly 1 row per active trip).
- `vehicleID` (`text`, FK -> `vehicles.vehicleID`).
- `driverID` (`text`, FK -> `users.id`).
- `latitude`, `longitude` (`numeric`, NOT NULL): Current coordinates.
- `speed` (`numeric`, Default `0`): Speed in km/h.
- `accuracy` (`numeric`): GPS horizontal accuracy in meters.
- `heading` (`numeric`): Bearing in degrees.
- `devicetimestamp` (`timestamptz`): Device clock timestamp.
- `receivedat` (`timestamptz`, Default `NOW()`): Server ingestion timestamp.
- `updatedat` (`timestamptz`, Default `NOW()`): Last update timestamp.

#### 6. `conversations`
- `id` (`text`, PK): Conversation identifier (`conv-...`).
- `created_at` (`timestamptz`, Default `NOW()`).
- `updated_at` (`timestamptz`, Default `NOW()`).

#### 7. `conversation_participants`
- `conversation_id` (`text`, FK -> `conversations.id` ON DELETE CASCADE).
- `user_id` (`text`, FK -> `users.id` ON DELETE CASCADE).
- `joined_at` (`timestamptz`, Default `NOW()`).
- *Primary Key*: `(conversation_id, user_id)`.

#### 8. `messages`
- `id` (`text`, PK): Message identifier (`msg-...`).
- `conversation_id` (`text`, FK -> `conversations.id` ON DELETE CASCADE).
- `sender_id` (`text`, FK -> `users.id`).
- `receiver_id` (`text`, FK -> `users.id`).
- `message` (`text`, NOT NULL): Text content.
- `message_type` (`text`, Default `'TEXT'`).
- `created_at` (`timestamptz`, Default `NOW()`).
- `delivered_at` (`timestamptz`).
- `read_at` (`timestamptz`).

#### 9. `maintenance_records`
- `id` (`text`, PK): `mnt-...`.
- `vehicleID` (`text`, FK -> `vehicles.vehicleID`).
- `serviceType` (`text`, NOT NULL): Service description (e.g. `Brake Inspection`).
- `cost` (`numeric`, Default `0`): Cost in INR.
- `date` (`date`, NOT NULL): Service date.
- `status` (`text`, NOT NULL): `ACTIVE`, `COMPLETED`.
- `createdAt`, `updatedAt` (`timestamptz`).

#### 10. `fuel_logs`
- `fuelLogId` (`text`, PK): `fuel-...`.
- `vehicleID` (`text`, FK -> `vehicles.vehicleID`).
- `date` (`date`, NOT NULL): Refuel date.
- `liters` (`numeric`, Default `0`): Volume in liters.
- `cost` (`numeric`, Default `0`): Cost in INR.
- `createdAt`, `updatedAt` (`timestamptz`).

#### 11. `expense_records`
- `expenseId` (`text`, PK): `exp-...`.
- `tripID` (`text`, FK -> `trips.tripID`).
- `vehicleID` (`text`, FK -> `vehicles.vehicleID`).
- `toll` (`numeric`, Default `0`): Toll expenses.
- `other` (`numeric`, Default `0`): Misc expenses.
- `maint` (`numeric`, Default `0`): Maintenance expenses.
- `createdAt`, `updatedAt` (`timestamptz`).

#### 12. `notifications`
- `id` (`text`, PK): Notification identifier.
- `userId` (`text`, FK -> `users.id`).
- `title`, `body` (`text`, NOT NULL).
- `read` (`boolean`, Default `false`).
- `createdAt` (`timestamptz`).

#### 13. `emergency_alerts`
- `id` (`text`, PK): Alert identifier (`alt-...`).
- `userId` (`text`, FK -> `users.id`).
- `tripId` (`text`, FK -> `trips.tripID`).
- `vehicleId` (`text`, FK -> `vehicles.vehicleID`).
- `type` (`text`, Default `'PANIC_SOS'`).
- `severity` (`text`, Default `'CRITICAL'`).
- `status` (`text`, Default `'ACTIVE'`): `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`.
- `latitude`, `longitude` (`numeric`).
- `notes` (`text`).
- `acknowledgedBy`, `resolvedBy` (`text`, FK -> `users.id`).
- `acknowledgedAt`, `resolvedAt` (`timestamptz`).
- `createdAt`, `updatedAt` (`timestamptz`).

#### 14. `chat_messages` (Legacy room table)
- `messageId` (`text`, PK): `msg-...`.
- `text` (`text`, NOT NULL).
- `senderId` (`text`, FK -> `users.id`).
- `senderName` (`text`, NOT NULL).
- `createdAt` (`timestamptz`).

#### 15. `organizations` (Migration 008, 010)
- `id` (`uuid`, PK): Tenant UUID.
- `name` (`text`, NOT NULL): Company name.
- `slug` (`text`, UNIQUE, NOT NULL): URL reference slug.
- `address` (`text`, NOT NULL): Formatted physical headquarters address.
- `place_id` (`text`): Google Places place ID.
- `latitude`, `longitude` (`numeric`, NOT NULL): Headquarters coordinates.
- `geofence_radius` (`integer`, NOT NULL, Default `200`): Attendance geofence radius in meters (`CHECK (geofence_radius >= 50 AND geofence_radius <= 5000)`).
- `status` (`text`, Default `'pending'`): `pending`, `approved`, `rejected`, `suspended`.
- `review_reason` (`text`): Admin approval/rejection notes.
- `reviewed_by` (`text`, FK -> `users.id`).
- `reviewed_at` (`timestamptz`).
- `created_at`, `updated_at` (`timestamptz`).

#### 16. `organization_memberships` (Migration 008)
- `id` (`uuid`, PK).
- `organization_id` (`uuid`, FK -> `organizations.id` ON DELETE CASCADE).
- `user_id` (`text`, FK -> `users.id` ON DELETE CASCADE).
- `role` (`text`, NOT NULL): Operational role in company.
- `status` (`text`, Default `'pending'`): `pending`, `active`, `suspended`.
- `created_at`, `updated_at` (`timestamptz`).
- *Unique Constraint*: `UNIQUE(organization_id, user_id)`.

#### 17. `platform_admins` (Migration 008)
- `id` (`text` or `uuid`, PK).
- `user_id` (`text`, UNIQUE, FK -> `users.id` ON DELETE CASCADE).
- `is_active` (`boolean`, Default `true`).
- `notes` (`text`).
- `created_at`, `updated_at` (`timestamptz`).

#### 18. `sustainability_targets` (Migration 011)
- `id` (`uuid`, PK DEFAULT `gen_random_uuid()`).
- `organization_id` (`uuid`, FK -> `organizations.id` ON DELETE CASCADE).
- `period` (`text`, NOT NULL): e.g. `'2026-10'`, `'MONTHLY'`.
- `target_co2_kg` (`numeric`, NOT NULL CHECK (`target_co2_kg > 0`)): Target emission ceiling in kg CO2e.
- `alert_threshold_percent` (`numeric`, Default `80` CHECK (`alert_threshold_percent > 0 AND alert_threshold_percent <= 100`)).
- `notes` (`text`).
- `created_by` (`text`, FK -> `users.id` ON DELETE SET NULL).
- `created_at`, `updated_at` (`timestamptz`).
- *Unique Constraint*: `UNIQUE(organization_id, period)`.

---

## 11. Verified Feature Status Matrix

| Module / Feature | Current Implementation Status | Primary Source Files | Database & API Dependencies | Test Status & Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Remember Me** | **Implemented and verified** | `AuthStore.ts`, `tokenStorage.ts`, `RootNavigator.tsx`, `auth/routes.ts` | `users` table, `/api/auth/login`, `/api/auth/change-password` | Verified; zero token leaks, splash screen guards hydration |
| **Live GPS Fleet Tracking** | **Implemented and verified** | `driverTrackingService.ts`, `TrackingStore.ts`, `LiveTrackingScreen.tsx`, `tracking/routes.ts` | `tracking_locations` table, `/api/tracking/live`, `/api/tracking/location`, `/ws/tracking` | 10/10 tests passed (`tracking_pipeline.test.ts`) |
| **AI Fleet Assistant** | **Implemented and verified** | `AIAssistantScreen.tsx`, `fleetAiService.ts`, `ai/routes.ts` | Database tables via `db.list()`, `/api/ai/query`, `/api/ai/assistant` | 8/8 tests passed (`ai_assistant.test.ts`) |
| **AI Resilience, Cache & Circuit Breaker** | **Implemented and verified** | `ai/cache.ts`, `ai/circuitBreaker.ts`, `ai/singleFlight.ts`, `ai/geminiClient.ts`, `ai/orchestrator.ts` | In-memory cache & circuit state machine | 14/14 tests passed (`ai_resilience_and_caching.test.ts`) |
| **Smart Fuel Anomaly & Efficiency Intelligence** | **Implemented and verified** | `fuelAnomalyService.ts`, `analytics/routes.ts`, `FuelExpenseScreen.tsx` | `trips`, `fuel_logs`, `vehicles`, `/api/analytics/fuel-anomalies` | 8/8 tests passed (`fuel_anomaly.test.ts`), UI verified |
| **Trip Delay Prediction & Insights** | **Implemented and verified** | `delayPredictionService.ts`, `trips/routes.ts`, `TripDelayInsightsModal.tsx` | `trips`, `tracking_locations`, `/api/trip/:id/delay-insights` | 6/6 tests passed (`delay_prediction.test.ts`) |
| **Predictive Maintenance Forecasting** | **Implemented and verified** | `maintenanceForecastService.ts`, `analytics/routes.ts`, `MaintenanceScreen.tsx` | `maintenance_records`, `vehicles`, `/api/analytics/maintenance-forecast` | 6/6 tests passed (`maintenance_forecast.test.ts`) |
| **AI Route Intelligence** | **Implemented and verified** | `ai/routes.ts`, `TripDispatcherScreen.tsx` | Google Routes API, `/api/ai/route-recommendation` | 4/4 tests passed (`route_intelligence.test.ts`) |
| **Trip Lifecycle & Dispatching** | **Implemented and verified** | `TripDispatcherScreen.tsx`, `TripStore.ts`, `trips/routes.ts` | `trips`, `vehicles`, `users` tables, `/api/trip/*` | 6/6 tests passed (`trip_lifecycle.test.ts`) |
| **Mandatory Fleet Business Rules** | **Implemented and verified** | `trips/routes.ts`, `vehicles/routes.ts`, `maintenance/routes.ts`, `database.ts`, `TripDispatcherScreen.tsx` | `vehicles`, `users`, `trips`, `maintenance_records` | 26/26 tests passed across all 9 business rules (`fleet_business_rules.test.ts`) |
| **Attendance & Geofencing** | **Implemented and verified** | `ClockInWidget.tsx`, `AttendanceStore.ts`, `attendance/routes.ts` | `attendance_records` table, `organizations`, `/api/attendance/clock-in`, `/api/attendance/clock-out` | 10/13 passed (`attendance_auto_clockout_and_report.test.ts`), 12/12 passed (`organization_geofencing_e2e.test.ts`) |
| **Active Trip Geofence Attendance Exception** | **Implemented and verified** | `ClockInWidget.tsx`, `AttendanceStore.ts`, `attendance/routes.ts`, `database.ts` | `attendance_records`, `trips`, `organizations`, `/api/attendance/active-trip` | 16/16 tests passed (`attendance_geofence_exception.test.ts`) |
| **AI Carbon Intelligence & Sustainability** | **Implemented and verified** | `CarbonIntelligenceScreen.tsx`, `CarbonStore.ts`, `modules/carbon/*` | `sustainability_targets`, `trips`, `fuel_logs`, `vehicles`, `/api/carbon/*` | 14/14 tests passed (`carbon_intelligence.test.ts`) |
| **Auto Clock-Out Daemon** | **Implemented and verified** | `autoClockOut.ts`, `server.ts`, `attendance/routes.ts` | `attendance_records` table, `/api/attendance/reconcile` | Runs on boot + every 60s in `Asia/Kolkata` timezone |
| **Executive PDF Export** | **Implemented and verified** | `pdfGenerator.ts`, `AttendanceStore.ts`, `attendance/routes.ts` | `/api/attendance/report/export-pdf`, `pdfkit` | Verified binary PDF generation with auth token in query param |
| **Real-Time 1-on-1 Chat** | **Implemented and verified** | `ChatScreen.tsx`, `ChatStore.ts`, `chat/websocket.ts`, `chat/routes.ts` | `conversations`, `conversation_participants`, `messages`, `/ws/chat` | 7/10 passed (`chat_flow.test.ts`), live messaging verified |
| **24-Hour Message Retention** | **Implemented and verified** | `cleanup.ts`, `server.ts`, `chat/routes.ts` | `messages` table | Automated cleanup daemon deletes expired rows hourly |
| **Emergency SOS System** | **Implemented and verified** | `SOSButton.tsx`, `AlertsScreen.tsx`, `EmergencyAlertBanner.tsx`, `AlertStore.ts`, `alerts/routes.ts` | `emergency_alerts` table, `/api/alerts/*`, `/api/sos/trigger`, WebSocket broadcasts | 13/13 tests passed (`emergency_alerts.test.ts`), real GPS capture, role segregation |
| **Vehicle Registry** | **Implemented and verified** | `VehicleRegistryScreen.tsx`, `VehicleStore.ts`, `vehicles/routes.ts` | `vehicles` table, `/api/vehicle/*` | Fully integrated and functional |
| **Driver Roster** | **Implemented and verified** | `DriversScreen.tsx`, `DriverStore.ts`, `users/routes.ts` | `users` table, `/api/user/*` | 6/6 tests passed (`driver_flow.test.ts`) |
| **Maintenance Logging** | **Implemented and verified** | `MaintenanceScreen.tsx`, `MaintenanceStore.ts`, `maintenance/routes.ts` | `maintenance_records` table, `/api/maintenance/*` | 3/3 tests passed (`maintenance_flow.test.ts`) |
| **Fuel & Expenses Logging** | **Implemented and verified** | `FuelExpenseScreen.tsx`, `FuelExpenseStore.ts`, `fuel/routes.ts`, `expenses/routes.ts` | `fuel_logs`, `expense_records`, `/api/fuel/*`, `/api/expenses/*` | 6/6 tests passed (`fuel_expense_flow.test.ts`) |
| **Fleet Analytics Dashboard** | **Implemented and verified** | `AnalyticsScreen.tsx`, `AnalyticsStore.ts`, `analytics/routes.ts` | `/api/analytics` | 1/1 test passed (`analytics_flow.test.ts`) |
| **Google Places Autocomplete** | **Implemented and verified** | `locations/routes.ts`, `TripDispatcherScreen.tsx` | `/api/locations/autocomplete`, `/api/locations/details/:id` | Verified with Google Places (New) and empty fallback |
| **Driver License OCR** | **Mock endpoint only** | `ocr/routes.ts`, `DriversScreen.tsx` | `multipart/form-data` to `/api/ocr/scan-license` | Regula integration abandoned; mock endpoint returns static payload; production OCR planned |
| **Digital Proof of Delivery (POD)** | **Planned / Pending** | N/A | N/A | Explicitly NOT implemented; do not claim it is active |
| **Multiple Gemini API Key Rotation** | **Planned / Pending** | `ai/geminiClient.ts` | `env.ts` | Single key configured with circuit breaker; multiple-key pool planned |

---

## 12. Known Technical Constraints & Mitigations

1. **Gemini Model Deprecation (`gemini-1.5-flash`)**:
   - *Status*: Resolved.
   - *Fix*: Default model updated to `gemini-3.8-flash`. In-flight self-healing in `geminiClient.ts` intercepts HTTP 404 and automatically migrates requests to `gemini-3.8-flash`.
2. **Gemini 3.8 Flash Thinking Token Budget**:
   - *Status*: Resolved.
   - *Fix*: `maxOutputTokens` expanded to 1000 in AI services to prevent reasoning tokens from clipping structured JSON output.
3. **Android Release APK Cleartext HTTP Block**:
   - *Symptom*: When pointing a demo release APK to a local MacBook IP (`http://192.168.x.x:5001`), Android OS blocks requests with `ERR_CLEARTEXT_NOT_PERMITTED`.
   - *Mitigation*: Ensure `android:usesCleartextTraffic="true"` or a network security config is present for local demo IP testing.
4. **Android Emulator Speech Recognition (`ERROR_NO_MATCH` / Error 7)**:
   - *Root Cause*: Standard Android Virtual Devices (AVD) lack Google Speech Services APK and audio input routing by default.
   - *Mitigation*: App provides manual fallback input via `DriverReview.tsx`.
5. **Port Alignment**:
   - Backend listens on `PORT=5001` (from `backend/.env`) bound to `0.0.0.0` (accessible over local Wi-Fi / Hotspot).

---

## 13. Integrations & Environment Variables

> [!IMPORTANT]
> In strict accordance with security guidelines, private secrets, API keys, and service tokens are never committed to documentation.

### Backend Environment (`backend/.env` & `backend/src/config/env.ts`)
| Variable Name | Description | Used In | Default / Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) | `env.ts` | `development` |
| `PORT` | HTTP & WebSocket server port (bound to `0.0.0.0`) | `env.ts`, `server.ts` | `5001` |
| `SUPABASE_URL` | Supabase project REST endpoint | `env.ts`, `supabase.ts` | Configured in Supabase |
| `SUPABASE_ANON_KEY` | Supabase public anonymous key | `env.ts` | Configured in Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Administrative service-role key | `env.ts`, `supabase.ts` | Configured in Supabase |
| `JWT_SECRET` | Secret for signing & verifying user JWT tokens | `auth.ts`, `env.ts` | Minimum 8 characters |
| `JWT_EXPIRES_IN` | Token lifespan | `auth.ts`, `env.ts` | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins | `app.ts` | `*` |
| `OFFICE_LATITUDE` | Latitude for Head Office attendance geofence | `env.ts`, `attendance` | `23.05288` |
| `OFFICE_LONGITUDE` | Longitude for Head Office attendance geofence | `env.ts`, `attendance` | `72.61891` |
| `OFFICE_GEOFENCE_RADIUS` | Radius in meters for attendance verification | `env.ts`, `attendance` | `200` |
| `BUSINESS_TIMEZONE` | Timezone for auto clock-out and PDF generation | `autoClockOut.ts` | `Asia/Kolkata` |
| `GOOGLE_MAPS_API_KEY` | Google Places API (New) key for autocomplete | `locations/routes.ts` | Optional |
| `GOOGLE_ROUTES_API_KEY` | Google Routes API key for route intelligence | `ai/routes.ts` | Optional |
| `GEMINI_API_KEY` | Google Gemini API key for natural language & advisories | `ai/geminiClient.ts` | Optional (falls back to deterministic) |
| `GEMINI_MODEL` | Google Gemini model name | `env.ts`, `geminiClient.ts`| `gemini-3.8-flash` |
| `GEMINI_TIMEOUT_MS` | Request deadline timeout | `env.ts`, `geminiClient.ts`| `5000` (or `15000` for complex prompts) |
| `GEMINI_MAX_RETRIES` | Max exponential backoff retries | `env.ts`, `geminiClient.ts`| `2` |
| `GEMINI_CIRCUIT_BREAKER_THRESHOLD` | Consecutive failures before opening circuit | `env.ts`, `circuitBreaker.ts` | `3` |
| `GEMINI_CIRCUIT_BREAKER_COOLDOWN_MS`| Cooldown period before probing half-open | `env.ts`, `circuitBreaker.ts` | `30000` (30 seconds) |
| `PLATFORM_ADMIN_USERNAME` | Configured fixed username for platform admin login | `env.ts`, `modules/admin/routes.ts` | `admin` |
| `PLATFORM_ADMIN_PASSWORD_HASH` | Bcrypt hash for fixed platform admin password | `env.ts`, `modules/admin/routes.ts` | `$2a$10$...` (configured by owner) |

### Frontend Environment (`App/src/config/env.ts` & `App/src/api/apiPath.ts`)
| Variable / Setting | Description | Used In |
| :--- | :--- | :--- |
| `MAPTILER_API_KEY` | Vector tile stylesheet key | `App/src/config/env.ts`, `FleetMap.tsx`, `LiveMap.tsx` |
| `SUPABASE_URL` | Client-side Supabase project endpoint | `App/src/config/env.ts`, `supabaseClient.ts` |
| `SUPABASE_ANON_KEY` | Client-side Supabase anonymous key | `App/src/config/env.ts`, `supabaseClient.ts` |
| `BASE_URL` | API base URL | `App/src/api/apiPath.ts` (`https://logisphereai.onrender.com` in prod) |
| `WS_URL` | WebSocket base URL | `App/src/api/apiPath.ts` |

### Web Portal Environment (`web/.env` & `web/.env.example`)
> [!IMPORTANT]
> All variables prefixed with `VITE_` are publicly visible in the browser bundle. Never put database secrets, Supabase service-role keys, or Gemini API keys here.

| Variable | Description | Default / Example Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Centralized Express Backend API URL (no trailing slash) | `http://localhost:5001` (local) or `https://logisphereai.onrender.com` (prod) |
| `VITE_WS_URL` | Real-Time WebSocket Base URL (`ws://` or `wss://`) | `ws://localhost:5001` (local) or `wss://logisphereai.onrender.com` (prod) |
| `VITE_APP_TITLE` | Portal browser document title & branding | `LogiSphere AI Management Portal` |
| *(None)* | Multi-tenancy header `X-Organization-Id` is dynamically attached only from authenticated session context (zero mock/default org data) | Dynamic |

---

## 14. Build, Run & Test Commands

### Backend
```bash
cd backend
npm install

# Start local development server with tsx hot reloading (PORT=5001)
PORT=5001 npm run dev

# Compile TypeScript to JavaScript in dist/
npm run build

# Start production server from compiled dist/
npm start

# Execute full Vitest automated test suite
npm test

# Run specific AI and operational test suites
npx vitest run tests/attendance_geofence_exception.test.ts
npx vitest run tests/carbon_intelligence.test.ts
npx vitest run tests/organization_geofencing_e2e.test.ts
npx vitest run tests/multi_org_authorization.test.ts
npx vitest run tests/fuel_anomaly.test.ts
npx vitest run tests/ai_resilience_and_caching.test.ts
npx vitest run tests/delay_prediction.test.ts
npx vitest run tests/maintenance_forecast.test.ts
npx vitest run tests/route_intelligence.test.ts
npx vitest run tests/ai_assistant.test.ts
npx vitest run tests/emergency_alerts.test.ts

# TypeScript typechecking
npm run typecheck
```

### Mobile Client (Android & iOS)
```bash
cd App
npm install

# Start Metro Bundler dev server
npm start

# Run on Android Emulator or connected USB device
npm run android

# Run on iOS Simulator (macOS only)
cd ios && pod install && cd ..
npm run ios

# TypeScript typechecking
npx tsc --noEmit
```

### Web Portal (`web/`)
```bash
cd web

# Install dependencies (use --legacy-peer-deps for npm 10 compatibility)
npm install --legacy-peer-deps

# Start Vite local development server on http://localhost:3000
npm run dev

# Run TypeScript typechecking
npm run typecheck

# Run linter
npm run lint

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## 15. Pending Tasks & Future Roadmap

1. **Digital Proof of Delivery (POD) (Planned / Pending)**:
   - Recipient signature capture on mobile glass, photo capture of delivered cargo, and offline queueing before finalizing trip arrival. *(Note: Explicitly NOT yet implemented in mobile or backend).*
2. **Production OCR Integration (Planned / Pending)**:
   - Replace the mock extraction handler in `backend/src/modules/ocr/routes.ts` with Google Cloud Vision or Tesseract OCR for physical driver licenses. *(Note: Regula Document Reader integration was explicitly abandoned and must not be reintroduced).*
3. **Multiple Gemini API Key Pool Rotation (Planned / Pending)**:
   - Implement round-robin key rotation across a pool of configured Gemini API keys to multiply daily rate limits during multi-user demos.
4. **Root-Level `llm/` Architecture & Local Ollama Support (Planned / Pending)**:
   - Create root-level `llm/` directory housing providers (Ollama + Gemini fallback), hybrid orchestrator, prompts, schemas, tests, and demo documentation.
   - Enable local MacBook-powered offline LLM demonstrations via Ollama (`127.0.0.1:11434`) without duplicating backend routes or breaking production Render deployments.
5. **Local Demo Mode Mobile Profile (Planned / Pending)**:
   - Provide a clean IP configuration toggle in `App/src/api/apiPath.ts` for phone-hotspot-to-MacBook presentations while preserving production Render URLs.
6. **Native Background Location Service (Planned / Pending)**:
   - Implement Android Foreground Service (`LocationForegroundService`) to guarantee continuous GPS updates when the app is completely backgrounded or screen locked.
7. **Background Push Notifications (Planned / Pending)**:
   - Integrate Firebase Cloud Messaging (FCM) or Apple APNs for critical dispatch alerts and chat messages when the app is killed.

---

## 16. Architectural Guidelines for Future AI Coding Agents

When developing, refactoring, or extending this codebase, future AI coding agents **MUST** strictly adhere to these rules:

1. **Verify Before Documenting**: Never mark a feature as implemented without verifying the source code, routes, stores, and tests.
2. **Preserve Dual-Mode Database Abstraction**: Always interact with the database via `db.list()`, `db.find()`, `db.insert()`, `db.update()`, `db.upsert()`, and `db.remove()` in `backend/src/config/database.ts`. Never invoke `supabase.from()` directly in route handlers.
3. **Mandatory Deterministic Fallbacks**: All AI-powered features must compute their core metrics deterministically first. LLM calls must remain strictly advisory enrichments executed through `executeResilientAi`. If Gemini/Ollama fails, the system must return a 100% valid response with zero downtime.
4. **Single Row per Trip for Live Tracking**: Maintain strictly 1 row per active trip in `tracking_locations` using `db.upsert('tracking_locations', 'tripID', ...)`.
5. **Role Segregation & RBAC**: Always enforce role boundaries on the backend using `authenticate` and `authorize()`. Ensure Drivers cannot access fleet-wide data or other drivers' records.
6. **Maintain Axios Interceptors**: Always use the shared client from `App/src/api/axiosClient.ts`. Do not instantiate parallel Axios clients that bypass token attachment.
7. **No Blank White Screens**: Ensure `RootNavigator.tsx` maintains the splash screen state during session hydration. Never render `null` during initialization.
8. **Zero Exposed Credentials**: Never hardcode private keys, service-role keys, or JWT secrets in code or documentation. Always read from environment schemas.
9. **Run Typecheck & Tests**: Verify changes with `npm run build` in `backend` and `npx tsc --noEmit` in `App`.

---

## 17. Multi-Organization Database Architecture & Safe Migration (Step 2 Completed)

### 17.1 Architecture Foundation
LogiSphere AI supports multi-organization SaaS operations through three core tables created in Migration `008_create_multi_organization_tables.sql`:
1. `organizations`: Companies / fleet tenants with UUID primary keys, registration timestamps, coordinate checks (`-90 <= latitude <= 90`, `-180 <= longitude <= 180`), and approval statuses (`pending`, `approved`, `rejected`, `suspended`). New registrations default to `pending`.
2. `organization_memberships`: Scopes authenticated users to organizations with assigned operational roles (`ROLE_MANAGER`, `ROLE_DISPATCHER`, `ROLE_SAFETY_OFFICER`, `ROLE_FINANCE`, `ROLE_DRIVER`) and membership statuses (`pending`, `active`, `suspended`). Enforces `UNIQUE(organization_id, user_id)`.
3. `platform_admins`: Dedicated platform administrator table for approving/rejecting organizations. Isolated from organization memberships so that organization managers and public registrations cannot grant themselves platform-admin privileges.

### 17.2 Default Organization & Safe Backfill Strategy
Migration `009_safe_data_migration_and_rls.sql` safely backfills existing single-tenant data into a well-defined default organization:
- **Default Organization ID**: `00000000-0000-0000-0000-000000000001` (`default-org`).
- **Organization-Owned Tables Backfilled**:
  - `users`: Assigned `organization_id`, existing users mapped to active `organization_memberships`. Initial manager (`usr-manager`) provisioned as bootstrap platform admin.
  - `vehicles`, `trips`: `organization_id` column added with foreign key; backfilled to default org.
  - `attendance_records`: Inherits from user's organization.
  - `maintenance_records`, `fuel_logs`, `expense_records`: Inherits from vehicle/trip's organization.
  - `emergency_alerts`: Maps existing `business_id = 'default_org'` to default org UUID.
  - `tracking_locations`, `conversations`, `messages`, `notifications`: Backfilled to default org.
- **Cross-Organization Integrity**: Trigger `trg_trip_cross_org_integrity` prevents dispatching trips with vehicles or drivers from a different organization.

### 17.3 Row Level Security (RLS) & Client vs. Backend Authorization
- **Non-Recursive Helper Functions**: `is_platform_admin()`, `has_org_membership()`, `get_user_approved_org_ids()` defined with `SECURITY DEFINER SET search_path = public` to prevent recursive RLS policy lookups.
- **Client-Side (Anon Key / User JWT)**: Directly guarded by PostgreSQL RLS. Active membership in an approved organization is strictly required to read/write records.
- **Backend Service-Role Guarantee**: Express backend connects via `SUPABASE_SERVICE_ROLE_KEY` (which bypasses RLS in PostgreSQL). Consequently, **application-level tenant filtering (`organization_id` query scoping) remains strictly mandatory** in Step 3 backend routes and handlers.

### 17.4 Step 3 Status
- **Status**: Completed in Step 3. Backend authorization middleware, public registration APIs, platform admin workflows, tenant-scoped business modules, and automated tests are fully implemented and verified.

---

## 18. Multi-Organization Backend Authorization & Approval Workflow (Step 3 Completed)

### 18.1 Centralized Authorization Architecture & Middleware
Step 3 implements zero-trust server-side multi-organization tenancy in the Express backend (`backend/src/`):

1. **Trusted Context Resolution (`getTrustedOrgId(req)`)**:
   - Organization context is **never** accepted from untrusted client-supplied query parameters, headers, or request body fields as proof of authorization.
   - For authenticated requests, the server resolves verified membership in `organization_memberships` directly against trusted server-side state.
   - When an authenticated user belongs to multiple organizations, client header `X-Organization-Id` is verified against the user's active memberships. If invalid, the request is rejected with `403 Forbidden`.
   - Legacy mobile app sessions without explicit membership safely fall back to `DEFAULT_ORG_ID` (`00000000-0000-0000-0000-000000000001`), ensuring 100% backward compatibility.

2. **Core Middleware Functions (`backend/src/middleware/auth.ts`)**:
   - `authenticate`: Validates JWT token from Bearer header or query parameter, attaching decoded claims to `req.user`.
   - `optionalAuth`: Resolves JWT claims if present, without failing unauthenticated requests (used for backwards compatibility).
   - `requireOrgMembership(allowedRoles?)`: Enforces that caller belongs to an `approved` organization with `active` membership status. Rejects pending or suspended organizations with `403 Forbidden`. Enforces RBAC roles when specified.
   - `requirePlatformAdmin`: Queries `platform_admins` table using authenticated `req.user.userId`. Client-supplied flags (e.g. `is_admin`, `role: admin`) are strictly ignored.
   - `getTrustedOrgId(req)`: Returns verified organization UUID.

### 18.2 Public Organization Registration Workflow (`/api/org`)
Mount: `/api/org` (Public & Authenticated endpoints in `backend/src/modules/organizations/routes.ts`):
- `POST /api/org/register`: Public registration endpoint for prospective tenant organizations.
  - Validates organization name, Google Places place ID, formatted address, coordinate bounds (`-90 <= lat <= 90`, `-180 <= lng <= 180`), and manager credentials.
  - Automatically creates organization in strictly `pending` status (`status: 'pending'`).
  - Creates manager user account and links initial `organization_memberships` record with `status: 'pending'`.
  - Atomically rolls back organization creation if membership creation fails.
  - Enforces duplicate check: Rejects already registered manager emails with `409 Conflict`.
  - **Security Guarantee**: Public registration **never** creates an approved organization, active manager, or platform administrator.
  - Emits audit log event `ORG_REGISTERED`.
- `GET /api/org/status/:slugOrId`: Public endpoint allowing prospective managers to inspect registration review status (`pending`, `approved`, `rejected`, `suspended`).
- `GET /api/org/my-organizations`: Authenticated endpoint listing organizations the user is actively a member of.

### 18.3 Platform Admin Approval & Governance Workflow (`/api/admin`)
Mount: `/api/admin` (Guarded by `authenticate` + `requirePlatformAdmin` in `backend/src/modules/admin/routes.ts`):
- `GET /api/admin/orgs`: List all organizations with optional `?status=` query filter and enriched manager contact profiles.
- `GET /api/admin/orgs/pending`: List all applications currently awaiting administrator review.
- `GET /api/admin/orgs/:id`: Retrieve detailed organization application information including member roster.
- `POST /api/admin/orgs/:id/approve`: Approves a pending organization. Atomically sets organization `status = 'approved'` and activates initial manager membership (`status = 'active'`). Handled idempotently for repeated requests.
- `POST /api/admin/orgs/:id/reject`: Rejects an organization application with reviewer ID, timestamp, and review reason (`review_reason`). Keeps organization and data inaccessible to users.
- `POST /api/admin/orgs/:id/suspend`: Suspends an active organization and immediately cuts off API access across all members.
- `GET /api/admin/audit-logs`: Audit trail endpoint returning chronological log of governance actions.

### 18.4 Organization-Scoped Business APIs
All business domain modules enforce strict server-side organization isolation:
- **Vehicles** (`/api/vehicle`, `/api/vehicles`): Read queries filtered by `organization_id`. Vehicle creation assigns `organization_id = getTrustedOrgId(req)` and validates registration number uniqueness strictly within caller's tenant. Updates/deletes reject cross-organization manipulation with `404 Vehicle not found`.
- **Trips** (`/api/trip`, `/api/trips`): Trip listings scoped to `organization_id`. Trip creation strictly validates that both assigned vehicle and driver belong to caller's organization; cross-tenant assignments rejected with `400 Bad Request`. Status updates and delay insights verify organization ownership.
- **Users / Driver Management** (`/api/user`, `/api/users`): Manager-created drivers/staff automatically inherit manager's authorized organization. Tampered `organization_id` in request body is ignored. User roster filtered to caller's organization.
- **Dashboard & KPIs** (`/api/dashboard`): Fleet metrics, active trip tallies, safety scores, and maintenance alerts computed strictly from caller's tenant data.
- **Chat & WebSockets** (`/api/chat`, `/ws/chat`): Chat user roster filtered to caller's organization. Direct cross-organization chat initiation rejected with `404 Participant user not found`. Real-time WebSocket messages and status events broadcast exclusively to peers within the same organization.
- **Live GPS Tracking & SOS** (`/api/tracking`, `/api/alerts`, `/api/sos`, `/ws/tracking`): GPS location submissions validate that the caller's assigned trip belongs to caller's organization. Manager tracking dashboard and live updates cannot receive GPS coordinates or panic SOS alerts from other organizations.
- **AI Fleet Intelligence** (`/api/ai`): Fleet intelligence queries (`/api/ai/query`) scope all database KPI context to caller's organization. In-memory cache keys isolated using `org_${orgId}_${hash}` to prevent cross-tenant cache pollution. Route intelligence (`/api/ai/route-recommendation`) rejects trips belonging to another organization.
- **Operations & Bookkeeping** (`/api/attendance`, `/api/fuel`, `/api/maintenance`, `/api/expenses`, `/api/analytics`): Records filtered and assigned server-side by `organization_id`.

### 18.5 Platform Admin Provisioning Procedure
1. Create user account via `db.insert('users', { ... })` or backend signup.
2. Insert platform administrator record into `platform_admins`:
   ```sql
   INSERT INTO platform_admins (user_id, is_active, notes)
   VALUES ('usr-id-here', true, 'Designated platform administrator')
   ON CONFLICT (user_id) DO UPDATE SET is_active = true;
   ```
3. Once inserted, the user is authorized for `/api/admin/*` endpoints without needing organization memberships.

### 18.6 Audit Logging & Sanitization
- Implemented in `backend/src/utils/auditLogger.ts`.
- Actions logged: `ORG_REGISTERED`, `ORG_APPROVED`, `ORG_REJECTED`, `ORG_SUSPENDED`.
- Every audit entry captures: `actorUserId`, `actorEmail`, `actorRole`, `action`, `targetOrgId`, `reason`, `timestamp`, and sanitized metadata.
- Zero credentials, passwords, Bearer tokens, or internal stack traces are logged or returned to clients.

### 18.7 Automated Verification Test Suite
- Comprehensive suite: `backend/tests/multi_org_authorization.test.ts` (30 test cases across 2 independent tenants: Titan Logistics & Apex Freight).
- Test execution command:
  ```bash
  npx vitest run tests/multi_org_authorization.test.ts --testTimeout=20000
  ```
- **Test Results**: **30 passed out of 30 tests (100% pass rate)**.
- Full suite regression status:
  - `multi_org_authorization.test.ts`: 30/30 passed
  - `database_multi_org_migration.test.ts`: 8/8 passed
  - `chat_flow.test.ts`: 10/10 passed
  - `smoke.test.ts`: 4/4 passed
  - `route_intelligence.test.ts`: 4/4 passed
  - **Total: 56/56 passing tests across all test suites**.

### 18.8 Step 4 Prerequisites: React Organization-Registration Portal
1. **Public API Contract**:
   - `POST /api/org/register`: Consumes form submission with company details, Google Places address/coordinates, and manager contact/password.
   - `GET /api/org/status/:slugOrId`: Consumes real-time approval status checking.
2. **Environment Variable**: `VITE_API_BASE_URL` pointing to backend port (e.g. `http://localhost:5001`).
3. **Web Portal Directory**: `web/src/` (Clean Vite + React 19 + TypeScript + Vanilla CSS setup created in Step 1).

---

## 19. Step 4: Organization Registration Web Portal (Completed)

### 19.1 Architecture and Directory Structure
The multi-organization registration portal is implemented directly inside the existing `web/` directory using React 19, TypeScript, Vite, and Vanilla CSS conforming strictly to the LogiSphere AI design system:

```
web/
├── .env.example                               # Documents VITE_API_BASE_URL (http://localhost:5001)
├── package.json                               # Added "test": "npx --prefix ../backend vitest run"
├── tsconfig.app.json                          # App TypeScript config (excludes src/__tests__)
├── src/
│   ├── types/index.ts                         # Added OrgApprovalStatus, OrgRegistrationPayload, OrgRegistrationResponseData, OrgStatusData, PlaceSuggestion, PlaceDetails
│   ├── styles/
│   │   ├── main.css                           # Core tokens and layout
│   │   └── registration.css                   # Registration form layout, coordinate pills, timeline stepper, status cards
│   ├── services/
│   │   ├── endpoints.ts                       # Added ORGANIZATION and LOCATIONS routes
│   │   ├── apiClient.ts                       # Axios base client
│   │   └── organizationService.ts             # Centralized registration, status, and places proxy service
│   ├── components/
│   │   ├── Header.tsx                         # Header with view titles and branding
│   │   ├── Sidebar.tsx                        # Sidebar with Register and Status Lookup navigation items
│   │   └── PlaceAutocompleteInput.tsx         # Accessible debounced Google Places autocomplete with auto-clearing invariant
│   ├── pages/
│   │   ├── OrganizationRegistration.tsx       # Main registration view with slug generation, validation, conflict handling
│   │   ├── RegistrationConfirmation.tsx       # Pending approval confirmation screen with review timeline
│   │   ├── RegistrationStatusLookup.tsx       # Real-time status lookup view (pending, approved, rejected, suspended)
│   │   └── ModuleView.tsx                     # Added module definitions for register and status views
│   ├── App.tsx                                # Hash router supporting #/register, #/status, #/dashboard with deep-linking
│   └── __tests__/
│       └── organization_registration.test.ts  # 19 unit tests verifying registration, status lookup, places proxy, and validation invariants
```

### 19.2 API Contract & Backend Integration
1. **Organization Registration (`POST /api/org/register`)**:
   - **Request Payload**:
     ```json
     {
       "orgName": "Apex Freight Logistics",
       "slug": "apex-freight-logistics",
       "address": "452 Cargo Way, Logistics Hub, Ahmedabad",
       "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
       "latitude": 23.0225,
       "longitude": 72.5714,
       "managerName": "Sarah Jenkins",
       "managerEmail": "sarah.j@apexlogistics.com",
       "managerPhone": "+91 98765 43210",
       "password": "SecurePassword123!"
     }
     ```
   - **Success Response (201 Created)**:
     ```json
     {
       "status": "success",
       "message": "Organization registration submitted successfully and is pending platform administrator approval.",
       "data": {
         "organizationId": "0e5b7b9e-648c-4f76-9d33-4f1cf27dfc89",
         "name": "Apex Freight Logistics",
         "slug": "apex-freight-logistics",
         "status": "pending",
         "manager": {
           "id": "usr-apex-mgr-01",
           "name": "Sarah Jenkins",
           "email": "sarah.j@apexlogistics.com",
           "membershipStatus": "pending"
         }
       }
     }
     ```
   - **Conflict Handling (409 Conflict)**:
     - Detects existing manager email conflicts or slug collisions.
     - Displays actionable guidance: *"This email is already registered with another organization. Please sign in or use a different work email."*
   - **Validation Error Handling (400 Bad Request)**:
     - Surfaces backend field validation errors cleanly without unhandled crashes.

2. **Registration Status Lookup (`GET /api/org/status/:slugOrId`)**:
   - Accepts either organization UUID or URL slug.
   - Evaluates the 4 platform-supported states:
     - `pending`: Displays amber warning banner, timeline step 2 (Under Administrative Review), and guidance on expected review turnaround.
     - `approved`: Displays emerald success banner, timeline step 3 (Approved & Active), and clear instructions to launch the mobile app or sign in.
     - `rejected`: Displays rose alert banner, explains the rejection, and safely displays the administrative review reason (`reviewReason`) if provided by the reviewer.
     - `suspended`: Displays slate/gray alert explaining administrative access suspension and provides contact instructions.
   - **Security Guarantee**: Endpoint response is strictly sanitized; returns only safe organizational metadata (`id`, `name`, `slug`, `status`, `reviewReason`, `createdAt`). Never leaks user passwords, JWT tokens, manager contact lists, or internal database metadata.

### 19.3 Google Places Proxy Architecture
- **Zero Client Credential Exposure**: The web portal makes zero direct calls to Google Maps or Google Places APIs from the browser. It never imports `@googlemaps/*` SDKs or requires `VITE_GOOGLE_MAPS_KEY`.
- **Backend Proxies Reused**:
  - `GET /api/locations/autocomplete?query=...` -> Returns place suggestions with `place_id`, `description`, `main_text`.
  - `GET /api/locations/details/:id` -> Resolves selected place to `formatted_address`, `latitude`, and `longitude`.
- **Strict Invalidation Invariant**: Whenever the user edits or modifies the address input text, any previously resolved `placeId`, `latitude`, and `longitude` are immediately wiped. Form submission is prevented until an address suggestion is explicitly chosen or valid coordinates are resolved, eliminating coordinate spoofing and mismatched addresses.
- **Debounced Keyboard Navigation**: The autocomplete dropdown debounces requests by 300ms, supports `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` keyboard shortcuts, and renders loading and empty states cleanly.

### 19.4 Routing, Navigation, & User Experience
- **Hash-Based Client Routing**:
  - `#/register`: Loads the organization registration form.
  - `#/status`: Loads the status check lookup form.
  - `#/status?id=<slugOrId>`: Deep-links directly to the real-time status of a specific organization.
  - `#/dashboard`: Default fleet overview.
- **Brand Consistency**: Styled using LogiSphere AI design tokens: `#090D16` canvas, `#0F172A` glass cards, `#2563EB` primary accents, `#10B981` emerald highlights, `#F59E0B` amber status badges, and `#F43F5E` critical badges.
- **Accessible UI States**:
  - Accessible masked password field with unmask toggle button and ARIA attributes.
  - Field-level validation for work email format, organization name, slug formatting, and password minimum length (8 characters).
  - Clear loading spinners on submission buttons with double-submission guards.

### 19.5 Verification Results
- **Oxlint**: 0 warnings, 0 errors across 21 files.
- **TypeScript Typecheck**: 0 errors (`tsc --noEmit`).
- **Production Build**: 0 errors (`tsc -b && vite build`), production bundle generated in 239ms.
- **Unit Test Suite (`web/src/__tests__/organization_registration.test.ts`)**:
  - 19 passed tests out of 19 (100% pass rate) in 355ms.
  - Covers:
    1. Registration API success and response payload handling.
    2. Conflict (409) handling for duplicate manager email.
    3. Backend validation error (400) handling.
    4. Offline/server error (500) resilience.
    5. Status lookup across all 4 lifecycle states (`pending`, `approved`, `rejected`, `suspended`).
    6. Organization not found (404) friendly error.
    7. Empty query client-side short-circuiting.
    8. Google Places autocomplete and details backend proxy integration.
    9. Coordinate range validation (`[-90, 90]`, `[-180, 180]`).
    10. Slug normalization.
    11. Automatic coordinate clearing invariant upon address change.

### 19.6 Prerequisites for Step 5: Platform-Admin Dashboard
1. **Administrative Authentication**: Step 5 web portal will require manager/platform-admin authentication session management in the web app (JWT login storing token in memory/storage).
2. **Platform Admin Routes**: Consuming protected endpoints under `/api/admin/*`:
   - `GET /api/admin/orgs/pending`: Fetch queue of pending applications.
   - `GET /api/admin/orgs`: List all organizations with status filtering.
   - `POST /api/admin/orgs/:id/approve`: Approve pending organization.
   - `POST /api/admin/orgs/:id/reject`: Reject with reviewer reason.
   - `POST /api/admin/orgs/:id/suspend`: Suspend active organization.
   - `GET /api/admin/audit-logs`: View administrative audit trail.
3. **Platform Administrator Provisioning**: At least one user account in Supabase database marked as active platform admin in `platform_admins` table.

---

## 20. Step 5: Secure Platform Admin Login & Organization Management Dashboard (Completed)

### 20.1 Architecture and Directory Structure
The platform administrator authentication and organization governance portal is implemented inside `web/src/pages/admin/` and integrated directly into the web application:

```
web/
├── src/
│   ├── types/index.ts                         # Added AdminUser, AdminOrgMember, AdminOrgSummary, AdminOrgDetails, AuditLogEntry, AdminDashboardStats
│   ├── styles/
│   │   ├── admin.css                          # Dedicated stylesheet for admin login, dashboard cards, tables, badges, modals
│   │   └── index.css                          # Imported admin.css globally
│   ├── services/
│   │   ├── endpoints.ts                       # Added ADMIN routes (ME, ORGS, PENDING_ORGS, ORG_DETAILS, APPROVE_ORG, REJECT_ORG, SUSPEND_ORG, AUDIT_LOGS)
│   │   ├── apiClient.ts                       # Updated interceptors to support adminToken and clear on 401
│   │   └── adminService.ts                    # Centralized platform admin authentication, session verification, and governance operations
│   ├── components/
│   │   ├── Header.tsx                         # Header with platform admin title mapping
│   │   └── Sidebar.tsx                        # Sidebar with Platform Admin Portal navigation item
│   ├── pages/
│   │   ├── ModuleView.tsx                     # Module definition for admin view
│   │   └── admin/
│   │       ├── AdminLogin.tsx                 # Secure platform admin login with credential & role verification
│   │       ├── AdminLayout.tsx                # Administrative container with top bar, sub-nav tabs, session badge, logout
│   │       ├── AdminDashboard.tsx             # Overview KPI metrics (Total, Pending, Approved, Rejected, Suspended) & audit stream
│   │       ├── AdminPendingApplications.tsx   # Review queue with search, detail inspection, approve modal, reject modal
│   │       ├── AdminOrgRegistry.tsx           # Multi-tenant directory with status filter tabs, search, and suspension modal
│   │       ├── AdminAuditLogs.tsx             # Audit trail viewer with action filtering and timestamp tracking
│   │       └── AdminModals.tsx                # Reusable modals: OrgDetailsModal, ApproveModal, RejectModal, SuspendModal
│   ├── App.tsx                                # Hash router supporting #/admin-login, #/admin, #/admin/applications, #/admin/registry, #/admin/audit-logs
│   └── __tests__/
│       ├── organization_registration.test.ts  # Step 4 unit tests (19 tests)
│       └── platform_admin.test.ts             # Step 5 unit tests (17 tests covering admin auth, session, approvals, and audits)
```

### 20.2 Authentication Flow & Server-Side Security Verification
1. **Login Request (`POST /api/auth/login`)**:
   - Takes `{ email, password }` and authenticates using standard bcrypt password verification.
   - Extracts JWT bearer token from response `serviceResult.token`.
2. **Server-Side Admin Verification Guard (`GET /api/admin/me`)**:
   - The frontend **never** trusts client-supplied roles, boolean flags, or token payload claims.
   - Immediately invokes `GET /api/admin/me` with `Authorization: Bearer <token>`.
   - The backend `requirePlatformAdmin` middleware checks whether the authenticated `user_id` exists in the `platform_admins` table with `is_active = true`.
   - If `GET /api/admin/me` returns `200 OK`, the user is confirmed as an active administrator and the session token is saved to `adminToken`.
   - If `GET /api/admin/me` returns `403 Forbidden` (ordinary fleet manager or driver attempting to sign into the admin portal), the token is immediately discarded, `adminToken` is wiped from storage, and access is firmly denied:
     *"Access Denied: This account is not authorized as a platform administrator. Ordinary fleet managers and drivers cannot access this portal."*
   - Plaintext passwords are never stored in localStorage or logged.
3. **Session Restoration & Invalidation**:
   - On page boot/reload, `adminService.verifyAdminSession()` checks the stored `adminToken` against `GET /api/admin/me`.
   - If expired or revoked in `platform_admins`, `adminToken` is deleted and the user is redirected to `#/admin-login`.
   - Unauthenticated visitors directly accessing `#/admin*` routes are automatically routed to `#/admin-login`.

### 20.3 Platform Admin Endpoints & Contracts
All administrative endpoints are protected by `requirePlatformAdmin`:
1. `GET /api/admin/me`: Returns verified platform admin user profile (`id`, `userId`, `name`, `email`, `isPlatformAdmin`).
2. `GET /api/admin/orgs`: Returns all organizations with optional `?status=` query filter and manager profile details.
3. `GET /api/admin/orgs/pending`: Returns pending organization applications for review.
4. `GET /api/admin/orgs/:id`: Returns comprehensive organization details, Google Place ID, GPS coordinates, review reason, and member roster.
5. `POST /api/admin/orgs/:id/approve`: Atomically updates organization `status = 'approved'` and activates initial manager membership (`status = 'active'`). Handled idempotently.
6. `POST /api/admin/orgs/:id/reject`: Sets organization `status = 'rejected'` and stores administrative review reason (`review_reason`). Keeps company data locked.
7. `POST /api/admin/orgs/:id/suspend`: Sets organization `status = 'suspended'` and terminates operational access across all members.
8. `GET /api/admin/audit-logs`: Returns chronological audit records with actor email, action (`ORG_REGISTERED`, `ORG_APPROVED`, `ORG_REJECTED`, `ORG_SUSPENDED`), target org ID, and timestamp.

### 20.4 First Platform Administrator Provisioning Procedure
To provision the initial platform administrator securely without public registration endpoints:
1. Create or register a base user account in the `users` table:
   ```sql
   INSERT INTO users (id, name, email, passwordHash, role, status)
   VALUES (
     'usr-platform-admin-01',
     'Primary Platform Administrator',
     'admin@logisphere.ai',
     '$2a$10$...bcrypt_hash_here...',
     'ROLE_ADMIN',
     'ACTIVE'
   )
   ON CONFLICT (email) DO NOTHING;
   ```
2. Insert an active record into the `platform_admins` table:
   ```sql
   INSERT INTO platform_admins (id, user_id, is_active, notes)
   VALUES (
     'padm-00000000-0001',
     'usr-platform-admin-01',
     true,
     'Designated initial platform administrator'
   )
   ON CONFLICT (user_id) DO UPDATE SET is_active = true;
   ```
3. Navigate to `#/admin-login` on the web portal and sign in with the provisioned credentials.

### 20.5 Verification Results
- **Oxlint**: 0 warnings, 0 errors across 30 files in 9ms.
- **TypeScript Typecheck**: 0 errors (`tsc --noEmit`).
- **Production Build**: 0 errors (`tsc -b && vite build`), production bundle generated in 105ms.
- **Web Unit Tests (`npm test` / `vitest`)**:
  - **36 passed out of 36 tests (100% pass rate)** in 230ms.
  - `src/__tests__/organization_registration.test.ts`: 19/19 passed.
  - `src/__tests__/platform_admin.test.ts`: 17/17 passed (covers admin login, 403 non-admin denial, session restoration, logout, review queue listing, org details, approval, rejection with reason, suspension, audit logs, and stats aggregation).
- **Backend Multi-Organization Security Suite**:
  - `backend/tests/multi_org_authorization.test.ts`: 31 passed out of 31 tests (including `GET /api/admin/me` verification).
- **Preserved Functionality**:
  - Mobile application and backend continue to operate normally.
  - Public registration (`#/register`) and status lookup (`#/status`) remain fully functional.

### 20.6 Prerequisites for Step 6: Mobile App Multi-Tenant Session & Data Isolation
1. **Mobile Multi-Tenant Store & Session Hydration**: Update `AuthStore.ts` in `App/` to store and restore `organizationId` alongside user credentials.
2. **Mobile API Client Tenant Header**: Ensure `App/src/api/` attaches `X-Organization-Id` to all outgoing requests.
3. **Pending/Suspended Status Interceptor**: Add mobile navigation guards handling HTTP 403 when an organization is pending approval or suspended.
4. **Tenant-Aware Mobile UI**: Display active company/organization name in header and drawer.

---

## 21. Clean Web Portal and Minimal Admin Approval Portal (Completed)

### 21.1 Overview & Requirements Fulfilled
The `web/` application has been refactored into a focused, minimal web portal containing only two functional spaces:
1. **Public Organization Registration Portal** (`#/register` and `#/registration-success`).
2. **Separate Protected Admin Approval Portal** (`#/admin`).

All unrequested modules, mock fleet metrics, live GPS dispatchers, fake vehicle/driver/trip dashboards, API inspector widgets, generic sidebars, and unnecessary screens have been cleanly deleted from the filesystem and bundle.

### 21.2 Exact Application Routing Architecture
Hash-based client routing in `web/src/App.tsx` strictly routes as follows:
- `#/register`: Public organization registration form.
  - Full company registration form with Google Places backend autocomplete integration.
  - Manager credentials validation (matching passwords, email format, phone, address).
  - Genuine backend submission to `POST /api/org/register` with error handling.
  - Link to Admin Portal (`#/admin`).
- `#/registration-success`: Registration confirmation screen.
  - Shown **only** after genuine backend creation returns pending status.
  - Displays Organization Name, Application Reference / Slug, Status ("Pending Admin Approval"), and access explanation.
  - "Register Another Organization" CTA button resetting state.
- `#/admin`: Dedicated platform admin portal.
  - Unauthenticated users: Renders clean, standalone `AdminLogin` form.
  - Authenticated administrators: Renders `AdminApprovalDashboard`.
  - No public admin registration endpoint or page exists.
- `#/` (Root) and unknown/legacy routes (e.g. `#/dashboard`, `#/status`, `#/vehicles`, `#/trips`, `#/admin/registry`, etc.):
  - Automatically redirected to `#/register`.

### 21.3 Server-Side Fixed Admin Credentials & Security Architecture
- **Environment Configuration**:
  - `PLATFORM_ADMIN_USERNAME`: Fixed username configured in backend environment (default dev: `admin`).
  - `PLATFORM_ADMIN_PASSWORD_HASH`: Secure bcrypt hash (cost factor >= 10).
- **Password Hash Generation Guide**:
  Application owners configure the password hash securely using Node.js without writing plaintext secrets to code:
  ```bash
  node -e "console.log(require('bcryptjs').hashSync('YourStrongPasswordHere', 10))"
  ```
  Set the resulting `$2a$10$...` string as `PLATFORM_ADMIN_PASSWORD_HASH` in `backend/.env`.
- **Server-Side Credential Verification**:
  - Authentication is handled exclusively on the backend via `POST /api/admin/login`.
  - Zero admin credentials or password hashes exist in frontend bundles or `VITE_` variables.
  - Server verifies credentials against `PLATFORM_ADMIN_USERNAME` and `PLATFORM_ADMIN_PASSWORD_HASH`, or active database `platform_admins`.
  - Rate limiting: Max 5 failed attempts per 15 minutes per IP address (returns 429 Too Many Requests).
  - Signs a short-lived (8 hours) platform admin JWT token.
- **Protected Admin Endpoints**:
  - All admin endpoints (`/api/admin/*`) require server-side verification with `requirePlatformAdmin` middleware.
  - Ordinary manager or driver tokens are rejected with `403 Forbidden`.
  - Tokens are validated upon page reload via `GET /api/admin/me`; invalid tokens are wiped from browser storage.

### 21.4 Minimal Admin Approval Dashboard
The authenticated dashboard (`AdminApprovalDashboard.tsx`) contains:
1. **Compact Branding Header**: LogiSphere AI logo, active admin email/name badge, and Logout button.
2. **Authoritative Summary Cards**:
   - Total Organizations
   - Pending Approval
   - Approved Organizations
   - Rejected Organizations
   - Data fetched from real backend endpoint `GET /api/admin/stats` (truthfully aggregated, zero hardcoded values).
3. **Organization Applications Table**:
   - Organization Name, Slug/Reference, Address, Manager Name & Email, Registration Date, Status Badge.
   - Filter tabs: All, Pending, Approved, Rejected.
   - Real-time search by organization name or manager.
   - Actions:
     - **View Details**: Modal inspecting real backend payload (slug, address, coordinates, place ID, manager info, review notes).
     - **Approve**: Confirmation modal calling `POST /api/admin/orgs/:id/approve`, activating organization and manager membership.
     - **Reject**: Rejection modal requiring a non-empty review reason calling `POST /api/admin/orgs/:id/reject`.
4. **Authoritative Refresh**: Dashboard stats and list refresh directly from real backend API calls upon any status mutation.

### 21.5 Removed Modules & Dead Code Cleanup
The following 23 unused files and mock assets were permanently removed from the project:
1. `src/pages/DashboardOverview.tsx` (mock fleet metrics, vehicles, trips)
2. `src/pages/ModuleView.tsx` (unused wrapper)
3. `src/pages/RegistrationStatusLookup.tsx` (unrequested standalone lookup page)
4. `src/components/BackendInspector.tsx` (fake latency & connectivity cards)
5. `src/components/Sidebar.tsx` (generic navigation drawer)
6. `src/components/Header.tsx` (unnecessary navigation header)
7. `src/components/StatsCard.tsx` (generic card)
8. `src/components/AppLayout.tsx` (unnecessary multi-pane layout)
9. `src/hooks/useApiHealth.ts` (fake ping probe)
10. `src/pages/admin/AdminAuditLogs.tsx` (unrequested audit browser)
11. `src/pages/admin/AdminOrgRegistry.tsx` (unrequested org registry)
12. `src/pages/admin/AdminLayout.tsx` (unnecessary multi-tab navigation layout)
13. `src/pages/admin/AdminPendingApplications.tsx` (consolidated into minimal dashboard)
14. `src/pages/admin/AdminDashboard.tsx` (replaced by minimal dashboard)
15. `src/pages/admin/AdminModals.tsx` (inlined into minimal dashboard)
16. `src/styles/shell.css` (779 lines of dead CSS from deleted modules)
17. `src/App.css` (empty placeholder stylesheet)
18. `src/utils/formatters.ts` & `src/utils/` (unused formatting helpers for odometer, currency, etc.)
19. `src/assets/hero.png` (unused marketing image)
20. `src/assets/logo.png` (unused in `src/assets/`; favicon served from `public/logo.png`)
21. `src/assets/react.svg` (default Vite asset, unused)
22. `src/assets/vite.svg` (default Vite asset, unused)
23. `public/icons.svg` & `public/favicon.svg` (unused icon sprites; `lucide-react` is used exclusively)

Unused types (`UserRole`, `User`, `VehicleStatus`, `VehicleType`, `Vehicle`, `TripStatus`, `Trip`, `EmergencyAlert`, `BackendHealthResponse`, `DashboardSummary`) and endpoints (`VEHICLES`, `TRIPS`, `USERS`, `TRACKING`, `ANALYTICS`, `ATTENDANCE`, `MAINTENANCE`, `FUEL`, `EXPENSES`, `ALERTS`, `WS`) were also removed from `types/index.ts` and `services/endpoints.ts`.

### 21.6 Verification & Test Results
- **Oxlint**: 0 errors, 0 warnings across 16 files.
- **TypeScript Typecheck**: 0 errors (`npm run typecheck`).
- **Production Build**: 0 errors (`npm run build`), built in 152ms:
  - `dist/assets/index-BGZEnspu.css`: 21.95 kB (reduced from 33.20 kB, -34%).
  - `dist/assets/index-DmkMNsn4.js`: 333.70 kB.
- **Web Test Suites (`npm test`)**:
  - `src/__tests__/clean_web_portal.test.ts`: **13 passed out of 13** (covering all 13 Section 8 criteria).
  - `src/__tests__/organization_registration.test.ts`: **19 passed out of 19**.
  - `src/__tests__/platform_admin.test.ts`: **17 passed out of 17**.
  - Total Web Tests: **49 passed out of 49** (100% pass rate).
- **Backend Multi-Organization Security Suite**:
  - `backend/tests/multi_org_authorization.test.ts`: **31 passed out of 31** (100% pass rate).

---

## 22. Organization-Configurable Geofence & Active Trip-Based Attendance Exception (Completed)

### 22.1 Background & Objective
Prior to this feature, attendance clock-in and clock-out were strictly restricted to a fixed 200m radius around head office coordinates. However, in real-world fleet logistics:
1. Each organization operates from distinct physical headquarters with unique depot sizes and premises requirements.
2. Drivers are routinely outside the organization's physical geofence because they are already en route, performing deliveries, or returning from assigned trips.

To resolve these operational constraints without creating an unrestricted geofence bypass, LogiSphere AI implemented:
- **Organization-Configurable Geofence Radius** (Migration 010): Enables each organization to define its authorized geofence radius (50m to 5000m, default 200m).
- **Active Trip-Based Geofence Attendance Exception** (Migration 012): A secure, reason-capture exception allowing drivers outside the geofence to clock in or clock out if and only if they have a verified, active operational trip assigned to them.

### 22.2 Mandatory Eligibility & Security Invariants
The exception modal and backend authorization apply **strictly** when ALL of the following conditions are met:
1. **Authenticated Role**: The user must have role `ROLE_DRIVER` or `DRIVER`. Non-driver roles (`MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCE`, `ADMIN`) are rejected with `403 Forbidden` and remain subject to standard geofence enforcement.
2. **Assigned Active Operational Trip**: The driver must have a trip assigned to their authenticated user ID (`driver_id = req.user.id`) scoped to their organization (`organization_id = req.user.organizationId`) with one of the active lifecycle statuses:
   - `ACCEPTED`, `ASSIGNED`, `DISPATCHED`, `GOING_TO_PICKUP`, `ARRIVED_AT_PICKUP`, `PICKED_UP`, `IN_TRANSIT`, `ARRIVED_AT_DROP`.
   - Trips with status `COMPLETED`, `CANCELLED`, `DRAFT`, or trips belonging to another driver are strictly rejected.
3. **Outside Geofence Verification**: The server calculates the Haversine distance between the submitted GPS coordinates and the organization's headquarters coordinates. The distance must exceed `organization.geofence_radius`. If a client attempts to submit an exception flag while inside the geofence, the request is rejected (`400 Bad Request`) to prevent falsifying audit records.
4. **Mandatory Location Description**: The driver must describe their current location and operational purpose. Empty strings or whitespace-only inputs are rejected with `400 Bad Request`.
5. **Attendance State Machine Integrity**: Normal clock-in/out sequencing rules apply (cannot clock in twice, cannot clock out when not clocked in). Zero duplicate records are created.

### 22.3 Database Schema & Audit Trail (Migration 012)
The `attendance_records` table was extended via [012_add_geofence_exception_to_attendance.sql](file:///Users/sakshamojha/Documents/Projects/Minor/backend/supabase/migrations/012_add_geofence_exception_to_attendance.sql):
- `is_geofence_exception` (`boolean DEFAULT false`): Audit flag indicating whether attendance was recorded via active trip exception.
- `exception_reason` (`text`): Driver-provided location description.
- `trip_id` (`text REFERENCES trips(tripID) ON DELETE SET NULL`): Active trip authorizing the exception.
- `exception_distance` (`numeric`): Server-calculated distance in meters from organization geofence center at time of submission.
- `exception_action` (`text`): Action performed (`CLOCK_IN` or `CLOCK_OUT`).
- Partial index `idx_attendance_records_is_exception` on `is_geofence_exception` where `true` for fast compliance audits.

### 22.4 Mobile User Experience (`ClockInWidget.tsx`)
Implemented in `App/src/components/ClockInWidget.tsx` using LogiSphere AI iOS-inspired glassmorphism design:
- **Outside Location Detection**: When tapping Clock In or Clock Out, the widget retrieves GPS coordinates and evaluates distance against the organization's geofence.
- **Exception Modal**: If outside geofence and an active trip is found (`GET /api/attendance/active-trip`), opens modal:
  - **Title**: Outside Organization Location
  - **Message**: "You are currently outside your organization's permitted geofence radius. Are you outside the geofence because you have gone out for a delivery or another authorized trip?"
  - **Required Input**: "Describe Your Current Location" (multiline, accessible placeholder).
  - **Primary Action**: "Submit and Clock In" or "Submit and Clock Out" (reflects selected action).
  - **Secondary Action**: "Cancel" (aborts cleanly with zero attendance recording).
- **Inline Validation & Resilience**: Whitespace-only submissions display inline error feedback without closing modal. If a network or backend error occurs, input text is preserved for safe retry without duplicate submissions.
- **State Refresh**: Upon confirmed success, refreshes `AttendanceStore` and `TripStore` immediately.

### 22.5 Automated Verification Results
- **Acceptance Test Suite**: `backend/tests/attendance_geofence_exception.test.ts` (16 test cases).
  - Test command: `npx vitest run tests/attendance_geofence_exception.test.ts --test-timeout=20000`
  - Result: **16 passed out of 16 tests (100% pass rate)**.
- **Organization Geofencing Suite**: `backend/tests/organization_geofencing_e2e.test.ts` (12 test cases).
  - Result: **12 passed out of 12 tests (100% pass rate)**.
- **Mobile TypeScript Validation**: `npx tsc --noEmit` in `App/`: **0 errors**.

---

## 23. AI Carbon Intelligence & Sustainability Module (Completed)

### 23.1 Objectives & Scope
The Carbon Intelligence & Sustainability module provides automated, audit-grade carbon accounting, fleet emissions benchmarking, periodic target budgeting, and AI-driven decarbonization advisory across LogiSphere AI.

### 23.2 Scientific Emissions Calculation Methodology
Adheres to Greenhouse Gas (GHG) Protocol, DEFRA, and EPA standards implemented in `backend/src/modules/carbon/calculations.ts`:
- **Fuel-Based Factors**:
  - Diesel: 2.68 kg CO2e / liter
  - Petrol: 2.31 kg CO2e / liter
  - CNG: 1.82 kg CO2e / kg
  - Electric: 0.82 kg CO2e / kWh (regional grid baseline)
- **Calculation Precision**:
  - `ACTUAL_FUEL`: Derived from verified fuel logs and starting/ending odometer readings: $\text{fuelConsumed} \times \text{factor}$.
  - `ESTIMATED_DISTANCE`: When direct fuel receipt data is pending, models emissions from vehicle baseline consumption: $(\text{distanceKm} / \text{baselineKmPerL}) \times \text{factor}$.
- **Intensity KPI**: Measures carbon intensity per freight movement in grams of CO2e per tonne-km ($g\text{CO}_2\text{e} / t\text{-km}$).

### 23.3 Database Schema: Sustainability Targets (Migration 011)
Created in [011_create_sustainability_targets.sql](file:///Users/sakshamojha/Documents/Projects/Minor/backend/supabase/migrations/011_create_sustainability_targets.sql):
- `id` (`uuid PRIMARY KEY DEFAULT gen_random_uuid()`): Target record identifier.
- `organization_id` (`uuid REFERENCES organizations(id) ON DELETE CASCADE`): Tenant isolation.
- `period` (`text NOT NULL`): Reporting period (e.g. `'2026-10'`, `'MONTHLY'`).
- `target_co2_kg` (`numeric NOT NULL CHECK (target_co2_kg > 0)`): Target CO2 ceiling in kg.
- `alert_threshold_percent` (`numeric DEFAULT 80`): Warning threshold before budget exhaustion.
- `notes` (`text`): Operational context.
- `created_by` (`text REFERENCES users(id)`): Configuring manager.
- Row-Level Security: Strict tenant isolation ensuring managers can only inspect and configure targets for their own organization.

### 23.4 Multi-Vector Anomaly Detection & Eco-Routing
Implemented in `backend/src/modules/carbon/analytics.ts`:
1. **Fleet Carbon Anomalies**: Flags vehicles exceeding baseline emissions by >25%, excessive stationary idle fuel burn, and route detour emissions.
2. **Vehicle Efficiency Profiles**: Ranks vehicles into performance tiers (`EXCELLENT`, `GOOD`, `AVERAGE`, `POOR`) to prioritize servicing or route reassignment.
3. **Eco-Route Compare Engine** (`POST /api/carbon/eco-route-compare`): Compares candidate routes on distance, fuel consumption, emissions footprint, and operational cost, recommending the lowest-carbon trajectory.

### 23.5 Resilient AI Carbon Advisor
Implemented in `backend/src/modules/carbon/carbonService.ts`:
- Evaluates fleet-wide carbon metrics and invokes Google Gemini (`models/gemini-3.8-flash`) via `executeResilientAi`.
- Generates tailored executive decarbonization advisories covering route adjustments, preventive maintenance, and fleet electrification priority.
- Protected by 1800s TTL cache (`CARBON_INTELLIGENCE`), single-flight request coalescing, and circuit breaker.
- **100% Deterministic Mathematical Fallback**: If Gemini is unreachable or quota is exhausted, generates rule-based operational advisories based on vehicle rankings and target budget status without downtime.

### 23.6 Mobile Interface (`CarbonIntelligenceScreen.tsx` & `CarbonStore.ts`)
- **Screen**: `App/src/screens/CarbonIntelligenceScreen.tsx` integrated into `MainTabsNavigator.tsx` and custom animated bottom navigation `CustomTabBar.tsx`.
- **UI Components**:
  - Executive Carbon KPI Summary Card (Total kg CO2e, Fleet Intensity, Active Vehicles, Efficiency Rating).
  - Monthly Sustainability Target Progress Bar with visual alert threshold indicator.
  - Vehicle Emissions Ranking list with fuel-type badges and emissions/km ratings.
  - Detected Carbon Anomalies review section.
  - AI Carbon Advisor Insights card with refresh action and deterministic fallback indicator.
  - Set Sustainability Target modal allowing managers to adjust monthly carbon budgets.
- **State Store**: `App/src/store/CarbonStore.ts` (Zustand v5) managing overview state, period filtering, target updating, and offline caching.

### 23.7 Verification Results
- **Test Suite**: `backend/tests/carbon_intelligence.test.ts` (14 test cases).
  - Test command: `npx vitest run tests/carbon_intelligence.test.ts --test-timeout=20000`
  - Result: **14 passed out of 14 tests (100% pass rate)**.
- **Mobile TypeScript Check**: `npx tsc --noEmit` in `App/`: **0 errors**.


