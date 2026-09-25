# Project Context: LogiSphere AI (TransitOps)

This document provides a complete, accurate, and AI-readable context of the entire **LogiSphere AI** repository (`/Users/sakshamojha/Documents/Projects/Minor`). It serves as an authoritative architectural reference for developers and AI agents working on this codebase.

---

## 1. Project Overview

**LogiSphere AI** (also referenced in codebase as **TransitOpsMobile2**) is an enterprise-grade Fleet Management & Logistics Operations Platform. It consists of a mobile client built with React Native and an Express/TypeScript backend supported by Supabase PostgreSQL database capabilities.

### Key Capabilities
- **Fleet Management & Vehicle Registry**: Registration, status tracking (Available, On Trip, In Shop, Retired), load capacity management, and odometer tracking.
- **Driver Roster & Voice Onboarding**: Driver profiles, safety scores, license tracking with expiration warnings, and multi-modal voice-assisted driver registration.
- **Trip Dispatching & Live Tracking**: Dispatching trips, cargo weight vs. vehicle load validation, trip lifecycle management (Draft, Dispatched, Completed, Cancelled), and real-time interactive vector map tracking.
- **Attendance & Geofencing**: GPS-verified attendance clock-in with Haversine distance validation against office geofence boundaries (200m radius).
- **Maintenance & Expense Tracking**: Fuel logging, vehicle service records, toll/other expense tracking, and cost analytics.
- **AI Assistant & Analytics**: Conversational AI chatbot for natural language fleet queries and KPI analytics dashboard.
- **Safety & Emergency SOS**: Panic SOS trigger in mobile navigation bar for instant emergency notifications.

---

## 2. Technology Stack

### Frontend (`/App`)
- **Framework**: React Native 0.86.0 (React 19.2.3) bootstrapped with `@react-native-community/cli`.
- **Language**: TypeScript 5.8.3.
- **Navigation**: React Navigation v7 (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/drawer`, `@react-navigation/bottom-tabs`).
- **State Management**: Zustand v5.0.14.
- **Storage**: `@react-native-async-storage/async-storage` v3.1.1.
- **UI & Iconography**: Custom Vanilla React Native StyleSheet, `lucide-react-native` v1.27.0, `react-native-svg` v15.15.5, `react-native-reanimated` v4.5.3, `react-native-safe-area-context` v5.8.0.
- **Maps & Geolocation**: `@maplibre/maplibre-react-native` v11.3.6, `@react-native-community/geolocation` v3.4.0, MapTiler vector tiles.
- **HTTP Client**: Axios v1.18.1.
- **Voice Recognition**: Custom `NativeSpeechService` wrapping Android `RECORD_AUDIO` native permissions and speech event listeners.

### Backend (`/backend`)
- **Runtime & Framework**: Node.js (>=22.11.0), Express 4.21.0.
- **Language & Execution**: TypeScript 5.6.2 executed in dev via `tsx watch src/server.ts` or compiled via `tsc`.
- **Database & ORM**: Dual-mode database layer in `backend/src/config/database.ts`:
  - **Supabase Integration**: `@supabase/supabase-js` v2.45.4 REST API client when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided.
  - **In-Memory Fallback**: In-memory JS array database with pre-seeded data when Supabase credentials are not configured.
- **Authentication & Security**: `jsonwebtoken` v9.0.2 (JWT token signing & verification), `bcryptjs` v2.4.3 (password hashing), `helmet` v7.1.0, `cors` v2.8.5.
- **File Uploads & Validation**: `multer` v2.4.0 (multipart document handling for OCR), `zod` v3.23.8 (environment validation).
- **Testing**: `vitest` v2.1.1 and `supertest` v7.0.0.

---

## 3. Repository Structure

```text
Minor/
├── App/                          # React Native Mobile Application
│   ├── android/                  # Android Native project & Gradle configuration
│   ├── ios/                      # iOS Native project & Podfile configuration
│   ├── src/
│   │   ├── api/                  # Axios HTTP client & API route definitions
│   │   │   ├── apiPath.ts        # Endpoint URL constants
│   │   │   └── axiosClient.ts   # Axios instance with Bearer auth token interceptor
│   │   ├── assets/               # Application logo and static assets
│   │   ├── components/           # Shared & feature UI components
│   │   │   ├── DriverVoiceRegistration/ # Voice registration modal & step components
│   │   │   ├── AttendanceHistory.tsx
│   │   │   ├── ClockInWidget.tsx
│   │   │   ├── FleetMap.tsx
│   │   │   ├── LiveMap.tsx
│   │   │   ├── MapPreview.tsx
│   │   │   ├── RoleSelector.tsx
│   │   │   ├── SOSButton.tsx
│   │   │   └── ...
│   │   ├── config/               # Frontend environment settings (MapTiler API key)
│   │   ├── constants/            # Role mappings and navigation constants
│   │   ├── data/                 # Mock vehicles and seed data
│   │   ├── hooks/                # Custom React hooks (e.g. useGlobalLoading)
│   │   ├── navigation/           # Navigation setup
│   │   │   ├── AuthNavigator.tsx
│   │   │   ├── CustomTabBar.tsx  # Animated tab bar with expanded grid menu
│   │   │   ├── MainDrawerNavigator.tsx
│   │   │   ├── MainTabsNavigator.tsx
│   │   │   ├── RootNavigator.tsx
│   │   │   └── linking.ts        # Deep linking configuration (transitops://)
│   │   ├── screens/              # 16 Screen views
│   │   ├── services/             # Core client services
│   │   │   ├── attendanceService.ts
│   │   │   ├── geofenceService.ts
│   │   │   ├── locationService.ts
│   │   │   ├── mockAiAssistantService.ts
│   │   │   ├── sosService.ts
│   │   │   ├── speech/           # Native speech recognition service
│   │   │   └── storage/          # AsyncStorage token wrapper
│   │   ├── store/                # Zustand state stores
│   │   │   ├── AttendanceStore.ts
│   │   │   ├── AuthStore.ts
│   │   │   ├── DriverStore.ts
│   │   │   ├── TripStore.ts
│   │   │   └── VehicleStore.ts
│   │   ├── theme/                # Global color palette, typography & responsiveness
│   │   ├── types/                # TypeScript interfaces (driverVoice.ts)
│   │   └── utils/                # Validation, voice normalization & Haversine distance
│   ├── App.tsx                   # Main React Native application component
│   ├── index.js                  # Entry point registering App component
│   └── package.json
│
└── backend/                      # Express TypeScript Backend Service
    ├── src/
    │   ├── config/               # Database fallback abstraction, env schema & Supabase setup
    │   │   ├── database.ts
    │   │   ├── env.ts
    │   │   └── supabase.ts
    │   ├── middleware/           # Express authentication & authorization middleware
    │   │   └── auth.ts
    │   ├── modules/              # Feature domain route handlers
    │   │   ├── ai/
    │   │   ├── analytics/
    │   │   ├── attendance/
    │   │   ├── auth/
    │   │   ├── chat/
    │   │   ├── dashboard/
    │   │   ├── expenses/
    │   │   ├── fuel/
    │   │   ├── maintenance/
    │   │   ├── notifications/
    │   │   ├── ocr/
    │   │   ├── tracking/
    │   │   ├── trips/
    │   │   ├── users/
    │   │   └── vehicles/
    │   ├── utils/                # HTTP response helpers, distance & ID generators
    │   ├── app.ts                # Express app initialization & route mounting
    │   └── server.ts             # Node HTTP server entry point
    ├── supabase/
    │   ├── migrations/
    │   │   └── 001_initial_schema.sql # Complete PostgreSQL schema definition
    │   └── seed.sql              # Initial database seed records
    ├── tests/
    │   └── smoke.test.ts         # Backend integration smoke tests
    ├── API_DOCUMENTATION.md
    └── package.json
```

---

## 4. System Architecture

```text
React Native Mobile App (App/)
   │
   ├── [Zustand Stores] (AuthStore, TripStore, VehicleStore, DriverStore, AttendanceStore)
   │        │
   │        ▼
   ├── [Axios Client & Interceptor] (App/src/api/axiosClient.ts)
   │        │ (Authorization: Bearer <JWT>)
   │        ▼
Express HTTP API Server (backend/src/app.ts)
   │
   ├── [JWT Auth & Role Authorization Middleware] (backend/src/middleware/auth.ts)
   │        │
   │        ▼
   ├── [Modular Domain Routers] (auth, user, vehicle, trip, attendance, maintenance, fuel, expenses, etc.)
   │        │
   │        ▼
   └── [Unified Database Abstraction: db] (backend/src/config/database.ts)
            │
            ├──────► Supabase PostgreSQL (via @supabase/supabase-js REST client) [If configured]
            │
            └──────► In-Memory Seeded Storage (Record<Table, any[]>) [Local Fallback]
```

### Layer Responsibilities
- **Frontend Layer (`App/`)**: Handles UI rendering, user interaction, navigation flow, local state, GPS hardware access, voice capture, and API calls via Axios.
- **State Management Layer**: Zustand stores manage cached application state, authentication tokens, active user session, vehicles list, drivers list, and trips list.
- **API Interceptor Layer**: Injects JWT Bearer tokens into request headers and intercepts 401/403 authorization failures.
- **Backend API Layer (`backend/`)**: Receives HTTP requests, executes input validation, authenticates JWT tokens, checks role authorizations (`ROLE_MANAGER`, `ROLE_DRIVER`, etc.), executes business logic, and communicates with the database layer.
- **Data Access Layer (`backend/src/config/database.ts`)**: Wraps Supabase queries and provides transparent in-memory fallback for offline/local development without requiring an active Supabase project.

---

## 5. Frontend Architecture

### Structure & Organization
The mobile application follows a modular presentation-service-store architecture:
- `screens/`: Top-level screen views mounted into stack/tab/drawer navigators.
- `components/`: UI components categorized into core inputs (`AppTextInput`, `PrimaryButton`, `RoleSelector`), domain components (`ClockInWidget`, `AttendanceHistory`, `FleetMap`, `SOSButton`), and feature modals (`DriverVoiceRegistrationModal`).
- `store/`: Zustand state modules providing async actions and reactive state hooks.
- `services/`: Low-level native hardware wrappers (GPS location, voice recognition, AsyncStorage).

---

## 6. Navigation

### Navigation Hierarchy
```text
App Start
   │
   ▼
Hydrate Auth Session (AsyncStorage token check)
   │
   ├── Token Missing ──► [AuthNavigator] (Native Stack)
   │                       ├── LoginScreen ('Login')
   │                       ├── SignupScreen ('Signup')
   │                       └── ResetPasswordScreen ('ResetPassword')
   │
   └── Token Present ──► [RootNavigator]
                           └── [MainDrawerNavigator] ('Main')
                                 ├── Custom Drawer Header (User Name, SOS Button, Profile Icon)
                                 ├── Operations ('MainTabsNavigator')
                                 │     ├── [Primary Tabs] (CustomTabBar)
                                 │     │     ├── DashboardScreen ('Dashboard')
                                 │     │     ├── VehicleRegistryScreen ('VehicleRegistry')
                                 │     │     ├── AIAssistantScreen ('AIAssistant' - FAB Center Button)
                                 │     │     └── DriversScreen ('Drivers')
                                 │     │
                                 │     └── [Secondary Grid Menu - "More"]
                                 │           ├── TripDispatcherScreen ('TripDispatcher')
                                 │           ├── MaintenanceScreen ('Maintenance')
                                 │           ├── FuelExpenseScreen ('FuelExpense')
                                 │           ├── AnalyticsScreen ('Analytics')
                                 │           ├── ChatScreen ('Chat')
                                 │           └── LiveTrackingScreen ('LiveTracking')
                                 │
                                 ├── SettingsScreen ('Settings')
                                 └── ProfileScreen ('Profile') [Stack Group]
```

### Deep Linking Scheme
Configured in `App/src/navigation/linking.ts` using prefix `transitops://`:
- `transitops://signup` -> `Auth -> Signup`
- `transitops://reset-password/:token` -> `Auth -> ResetPassword`
- `transitops://dashboard` -> `Main -> Operations -> Dashboard`
- `transitops://vehicle-registry` -> `Main -> Operations -> VehicleRegistry`
- `transitops://drivers` -> `Main -> Operations -> Drivers`
- `transitops://trip-dispatcher` -> `Main -> Operations -> TripDispatcher`
- `transitops://maintenance` -> `Main -> Operations -> Maintenance`
- `transitops://fuel-expense` -> `Main -> Operations -> FuelExpense`
- `transitops://analytics` -> `Main -> Operations -> Analytics`
- `transitops://settings` -> `Main -> Settings`

---

## 7. State Management

The frontend uses **Zustand** for state management across 5 stores:

| Store Name | File Path | Controlled State | Key Actions | Persisted via |
| --- | --- | --- | --- | --- |
| `AuthStore` | `App/src/store/AuthStore.ts` | `user`, `token`, `loading`, `error` | `hydrate()`, `login()`, `signup()`, `logout()`, `requestResetPassword()`, `resetUserPassword()` | `AsyncStorage` (`tokenStorage.ts`) |
| `TripStore` | `App/src/store/TripStore.ts` | `trips`, `trip`, `loading`, `error` | `getTrips()`, `registerTrip()`, `dispatchTrip()`, `completeTrip()`, `cancelTrip()` | In-Memory (Zustand) |
| `VehicleStore` | `App/src/store/VehicleStore.ts` | `vehicles`, `vehicle`, `loading`, `error` | `getVehicles()`, `registerVehicle()`, `updateVehicle()`, `deleteVehicle()` | In-Memory (Zustand) |
| `AttendanceStore` | `App/src/store/AttendanceStore.ts` | `status`, `clockInTime`, `latitude`, `longitude`, `distanceFromOffice`, `history` | `setStatus()`, `clockIn()`, `clockOut()` | In-Memory (Zustand) |
| `DriverStore` | `App/src/store/DriverStore.ts` | `drivers`, `driver`, `loading`, `error` | `fetchDrivers()`, `getDrivers()` | In-Memory (Zustand) |

---

## 8. Backend Architecture

The backend is built as a RESTful Express service organized by domain modules in `backend/src/modules/`.

```text
HTTP Request
     │
     ▼
Express Middleware Pipeline
  ├── helmet() [Security Headers]
  ├── cors() [CORS Configuration]
  ├── express.json({ limit: '5mb' }) [JSON Parser]
  ├── morgan() [HTTP Logger]
     │
     ▼
Route Matching (/api/<module>/...)
     │
     ├── Authentication Middleware (authenticate / optionalAuth)
     │     └── jwt.verify(token, env.JWT_SECRET)
     │
     ├── Authorization Middleware (authorize('ROLE_MANAGER', ...))
     │     └── Checks req.user.role
     │
     ▼
Route Handler Execution
     │
     ├── Input Validation & Business Logic
     │
     ▼
Database Layer (db.list / db.find / db.insert / db.update / db.remove)
     │
     ├── Supabase Client (if SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY configured)
     └── In-Memory Store (memory fallback)
     │
     ▼
HTTP Response JSON ({ success: true, serviceResult: ... } or standard payload)
```

---

## 9. API Architecture

- **Base Path**: `/api`
- **Protocol**: HTTP / JSON (except `POST /api/ocr/scan-license` which accepts `multipart/form-data`).
- **Authentication**: `Authorization: Bearer <token>` in headers.
- **Error Format**: JSON response `{ success: false, message: "Error message" }` via helper `fail(res, statusCode, message)`.

---

## 10. API Inventory

Below is the exhaustive inventory of all API endpoints defined in the repository:

| Endpoint Path | HTTP Method | Auth Required | Module File | Description | Current Backend Status |
| --- | --- | --- | --- | --- | --- |
| `/health` | GET | No | `app.ts` | Health check endpoint returning service status | Fully Implemented |
| `/api/auth/login` | POST | No | `modules/auth/routes.ts` | Authenticates user by email, password & optional role. Returns JWT token and user details. | Fully Implemented |
| `/api/auth/request-reset-password` | GET/POST | No | `modules/auth/routes.ts` | Generates a password reset token for an email. | Fully Implemented (Dev token returned) |
| `/api/auth/reset-password` | POST | No | `modules/auth/routes.ts` | Resets user password given token and new password. | Fully Implemented |
| `/api/user/create` | POST | Optional | `modules/users/routes.ts` | Registers a new user/driver (creates Supabase auth user if available and inserts user record). | Fully Implemented |
| `/api/user` | GET | No | `modules/users/routes.ts` | Fetches list of users, optional query parameter `?role=ROLE_DRIVER`. | Fully Implemented |
| `/api/vehicle` | GET | No | `modules/vehicles/routes.ts` | Fetches all vehicles from database. | Fully Implemented |
| `/api/vehicle/create` | POST | No | `modules/vehicles/routes.ts` | Registers a new vehicle with registration number, name, type, etc. | Fully Implemented |
| `/api/vehicle/update/` | PUT | No | `modules/vehicles/routes.ts` | Updates vehicle record by query parameter `?id=...`. | Fully Implemented |
| `/api/vehicle/delete/` | DELETE | No | `modules/vehicles/routes.ts` | Deletes vehicle record by query parameter `?id=...`. | Fully Implemented |
| `/api/trip` | GET | No | `modules/trips/routes.ts` | Fetches all trips from database. | Fully Implemented |
| `/api/trip/create` | POST | No | `modules/trips/routes.ts` | Creates and dispatches a new trip if cargo weight does not exceed vehicle capacity. | Fully Implemented |
| `/api/trip/dispatch/:tripID` | PUT | No | `modules/trips/routes.ts` | Updates trip status to DISPATCHED and marks vehicle and driver ON_TRIP. | Fully Implemented |
| `/api/trip/complete/:tripID` | PUT | No | `modules/trips/routes.ts` | Completes trip, updates final odometer, and frees vehicle and driver status to AVAILABLE. | Fully Implemented |
| `/api/trip/cancel/:tripID` | PUT | No | `modules/trips/routes.ts` | Cancels trip and frees vehicle and driver status to AVAILABLE. | Fully Implemented |
| `/api/attendance/clock-in` | POST | Optional | `modules/attendance/routes.ts` | Verifies user GPS coordinates against office geofence and creates attendance record. | Fully Implemented |
| `/api/attendance/clock-out` | POST | No | `modules/attendance/routes.ts` | Clocks out open attendance record. | Fully Implemented |
| `/api/attendance/history` | GET | No | `modules/attendance/routes.ts` | Returns list of attendance records. | Fully Implemented |
| `/api/maintenance` | GET | No | `modules/maintenance/routes.ts` | Returns maintenance records with decorated vehicle names. | Fully Implemented |
| `/api/maintenance/create` | POST | No | `modules/maintenance/routes.ts` | Creates a new maintenance record. | Fully Implemented |
| `/api/fuel` | GET | No | `modules/fuel/routes.ts` | Returns fuel logs decorated with vehicle names. | Fully Implemented |
| `/api/fuel/create` | POST | No | `modules/fuel/routes.ts` | Creates a fuel log entry. | Fully Implemented |
| `/api/expenses` | GET | No | `modules/expenses/routes.ts` | Returns expense records decorated with vehicle names. | Fully Implemented |
| `/api/expenses/create` | POST | No | `modules/expenses/routes.ts` | Creates an expense record (toll, misc, maint). | Fully Implemented |
| `/api/dashboard/summary` | GET | No | `modules/dashboard/routes.ts` | Computes fleet summary KPI metrics, status breakdowns, and recent trips. | Fully Implemented |
| `/api/tracking/live` | GET | No | `modules/tracking/routes.ts` | Returns live locations for all dispatched trips. | Fully Implemented |
| `/api/tracking/location` | POST | No | `modules/tracking/routes.ts` | Pushes a new GPS location entry for a trip. | Fully Implemented |
| `/api/analytics` | GET | No | `modules/analytics/routes.ts` | Computes fuel efficiency, fleet utilization, total operational costs, and costliest vehicles. | Fully Implemented |
| `/api/ai/query` | POST | No | `modules/ai/routes.ts` | Processes natural language query against live db tables and returns structured intent response. | Fully Implemented |
| `/api/chat/messages` | GET | No | `modules/chat/routes.ts` | Retrieves chat message history. | Fully Implemented |
| `/api/chat/messages` | POST | Optional | `modules/chat/routes.ts` | Posts a chat message to team room. | Fully Implemented |
| `/api/ocr/scan-license` | POST | No | `modules/ocr/routes.ts` | Accepts multipart image upload and returns mock extracted driver's license metadata. | Fully Implemented (Mock OCR result) |
| `/api/notifications` | GET | No | `modules/notifications/routes.ts` | Returns user notifications. | **Unmounted in `app.ts`** |

---

## 11. Database Architecture

The backend implements a PostgreSQL database schema using Supabase migrations (`backend/supabase/migrations/001_initial_schema.sql`). When Supabase environment keys are absent, operations fallback to `memory` object in `backend/src/config/database.ts`.

---

## 12. Database Schema

### Tables & Definitions

#### 1. `users`
- **`id`** (`text`, PK): Unique user identifier (`usr-...`, `drv-...` or Supabase UUID).
- **`name`** (`text`, NOT NULL): Full user name.
- **`email`** (`text`, UNIQUE, NOT NULL): User email address.
- **`phoneNo`** (`text`): Contact phone number.
- **`passwordHash`** (`text`, NOT NULL): Bcrypt password hash.
- **`role`** (`text`, NOT NULL): Enum check (`ROLE_MANAGER`, `ROLE_DISPATCHER`, `ROLE_SAFETY_OFFICER`, `ROLE_FINANCE`, `ROLE_DRIVER`).
- **`licenseNo`** (`text`): Driver's license number (Driver role only).
- **`licenseExpiryDate`** (`text`): License expiry date.
- **`trips`** (`integer`, Default `0`): Total trips completed.
- **`safetyScore`** (`numeric`, Default `95`): Driver safety score percentage.
- **`status`** (`text`, Default `'ACTIVE'`): Status (`ACTIVE`, `AVAILABLE`, `ON_TRIP`, `OFF_DUTY`, `SUSPENDED`).
- **`createdAt`**, **`updatedAt`** (`timestamptz`): Timestamps.

#### 2. `vehicles`
- **`vehicleID`** (`text`, PK): Unique vehicle ID (`veh-...`).
- **`registrationNumber`** (`text`, UNIQUE, NOT NULL): License plate number (e.g. `GJ01AB1234`).
- **`name`** (`text`, NOT NULL): Vehicle callsign/name (e.g. `VAN-05`).
- **`type`** (`text`, NOT NULL): Enum check (`VAN`, `TRUCK`, `MINI`, `Van`, `Truck`, `Mini`).
- **`maxLoadCapacity`** (`numeric`, NOT NULL): Maximum cargo load in kg.
- **`odometer`** (`numeric`, Default `0`): Odometer reading in km.
- **`acquisitionCost`** (`numeric`, Default `0`): Vehicle acquisition cost in INR.
- **`status`** (`text`, Default `'AVAILABLE'`): Status (`AVAILABLE`, `ON_TRIP`, `IN_SHOP`, `RETIRED`).
- **`createdAt`**, **`updatedAt`** (`timestamptz`).

#### 3. `trips`
- **`tripID`** (`text`, PK): Unique trip identifier (`trp-...`).
- **`source`** (`text`, NOT NULL): Trip origin depot/location.
- **`destination`** (`text`, NOT NULL): Trip destination.
- **`status`** (`text`, Default `'DRAFT'`): Status (`DRAFT`, `DISPATCHED`, `COMPLETED`, `CANCELLED`).
- **`vehicleID`** (`text`, FK -> `vehicles.vehicleID` ON DELETE SET NULL).
- **`driverID`** (`text`, FK -> `users.id` ON DELETE SET NULL).
- **`cargoWeight`** (`numeric`, Default `0`): Cargo load weight in kg.
- **`plannedDistance`** (`numeric`, Default `0`): Distance in km.
- **`startingOdometer`** (`numeric`, Default `0`): Starting odometer value.
- **`finalOdometer`** (`numeric`): Ending odometer value.
- **`fuelConsumed`** (`numeric`): Fuel consumed in liters.
- **`createdAt`**, **`updatedAt`** (`timestamptz`).

#### 4. `attendance_records`
- **`id`** (`text`, PK): Unique record ID (`att-...`).
- **`userId`** (`text`, FK -> `users.id` ON DELETE SET NULL).
- **`date`** (`text`, NOT NULL): Date string.
- **`clockInTime`** (`text`, NOT NULL): Clock-in time string.
- **`clockOutTime`** (`text`): Clock-out time string.
- **`latitude`**, **`longitude`** (`numeric`): GPS coordinates.
- **`locationName`** (`text`): Name of office/geofence.
- **`distanceFromOffice`** (`numeric`): Calculated distance in meters.
- **`status`** (`text`, NOT NULL): Verification status (`Verified Location`, `Manual Override`).
- **`createdAt`**, **`updatedAt`** (`timestamptz`).

#### 5. `maintenance_records`
- **`id`** (`text`, PK): Unique ID (`mnt-...`).
- **`vehicleID`** (`text`, FK -> `vehicles.vehicleID` ON DELETE CASCADE).
- **`serviceType`** (`text`, NOT NULL): Service description (e.g. `Oil Change`).
- **`cost`** (`numeric`, Default `0`): Service cost in INR.
- **`date`** (`date`, NOT NULL): Service date.
- **`status`** (`text`, NOT NULL): Status (`ACTIVE`, `COMPLETED`).
- **`createdAt`**, **`updatedAt`** (`timestamptz`).

#### 6. `fuel_logs`
- **`fuelLogId`** (`text`, PK): Unique ID (`fuel-...`).
- **`vehicleID`** (`text`, FK -> `vehicles.vehicleID` ON DELETE CASCADE).
- **`date`** (`date`, NOT NULL): Fueling date.
- **`liters`** (`numeric`, Default `0`): Fuel volume in liters.
- **`cost`** (`numeric`, Default `0`): Cost in INR.
- **`createdAt`**, **`updatedAt`** (`timestamptz`).

#### 7. `expense_records`
- **`expenseId`** (`text`, PK): Unique ID (`exp-...`).
- **`tripID`** (`text`, FK -> `trips.tripID` ON DELETE CASCADE).
- **`vehicleID`** (`text`, FK -> `vehicles.vehicleID` ON DELETE CASCADE).
- **`toll`** (`numeric`, Default `0`): Toll charges.
- **`other`** (`numeric`, Default `0`): Miscellaneous expenses.
- **`maint`** (`numeric`, Default `0`): Maintenance expenses.
- **`createdAt`**, **`updatedAt`** (`timestamptz`).

#### 8. `chat_messages`
- **`messageId`** (`text`, PK): Message ID (`msg-...`).
- **`text`** (`text`, NOT NULL): Message content.
- **`senderId`** (`text`, FK -> `users.id` ON DELETE SET NULL).
- **`senderName`** (`text`, NOT NULL): Sender name.
- **`createdAt`** (`timestamptz`, Default `now()`).

#### 9. `tracking_locations`
- **`id`** (`text`, PK): Location ID (`loc-...`).
- **`tripID`** (`text`, FK -> `trips.tripID` ON DELETE CASCADE).
- **`vehicleID`** (`text`, FK -> `vehicles.vehicleID` ON DELETE CASCADE).
- **`driverID`** (`text`, FK -> `users.id` ON DELETE SET NULL).
- **`latitude`**, **`longitude`** (`numeric`, NOT NULL): Coordinates.
- **`speed`** (`numeric`, Default `0`): Vehicle speed in km/h.
- **`createdAt`** (`timestamptz`, Default `now()`).

#### 10. `notifications`
- **`id`** (`text`, PK): Notification ID.
- **`userId`** (`text`, FK -> `users.id` ON DELETE CASCADE).
- **`title`**, **`body`** (`text`, NOT NULL).
- **`read`** (`boolean`, Default `false`).
- **`createdAt`** (`timestamptz`, Default `now()`).

---

## 13. Supabase Architecture

- **Initialization**: `createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)` in `backend/src/config/supabase.ts`.
- **Database Access**: When enabled, `backend/src/config/database.ts` delegates CRUD operations to `supabase.from(table).select() / insert() / update() / delete()`.
- **User Administration**: In `backend/src/modules/users/routes.ts`, `supabase.auth.admin.createUser()` provisions Supabase Auth user accounts alongside database insertion.
- **Environment Variables**:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 14. Authentication

### Authentication Flow
```text
1. Login Screen (App/src/screens/LoginScreen.tsx)
   │ User enters Email, Password, Role -> presses "Sign In"
   ▼
2. AuthStore.login(email, password, role) (App/src/store/AuthStore.ts)
   │ HTTP POST /api/auth/login
   ▼
3. Backend Auth Router (backend/src/modules/auth/routes.ts)
   │ Query 'users' table by email
   │ Verify bcrypt password hash
   │ Validate role matching
   │ Generate JWT Token via signToken(user)
   ▼
4. Response to Mobile Client
   │ Returns { success: true, serviceResult: { id, email, role, name, token } }
   ▼
5. Mobile Client Session Persistence
   │ Store JWT Token & User JSON in AsyncStorage (tokenStorage.ts)
   │ Update Zustand AuthStore state (token, user)
   ▼
6. Navigation Transition
   │ RootNavigator detects 'token' present -> renders MainDrawerNavigator
```

---

## 15. Authorization & RBAC

### Defined System Roles
1. `ROLE_MANAGER` ("Fleet Manager")
2. `ROLE_DISPATCHER` ("Dispatcher")
3. `ROLE_SAFETY_OFFICER` ("Safety Officer")
4. `ROLE_FINANCE` ("Financial Analyst")
5. `ROLE_DRIVER` ("Driver")

### Frontend Role Normalization
`App/src/constants/roles.ts` maps human-readable role labels to backend enum constants:
```typescript
export const roleMap: Record<string, string> = {
  'Fleet Manager': 'ROLE_MANAGER',
  'Dispatcher': 'ROLE_DISPATCHER',
  'Safety Officer': 'ROLE_SAFETY_OFFICER',
  'Financial Analyst': 'ROLE_FINANCE',
  'Driver': 'ROLE_DRIVER',
};
```

---

## 16. Feature Inventory

| Feature Name | Primary Purpose | Implementation Status |
| --- | --- | --- |
| **Authentication & Reset** | Login, Signup, Token Persistence, Password Reset | **Fully Implemented** |
| **Vehicle Registry** | List, Add, Edit, Delete Vehicles | **Fully Implemented (API Integrated)** |
| **Driver Roster** | List, Add Driver, License Validation | **Fully Implemented (API Integrated)** |
| **Driver Voice Registration** | Multi-modal voice interview to fill driver profile | **Fully Implemented (Frontend UI + Voice Service)** |
| **Trip Dispatcher** | Create Trip, Load Weight Validation, Dispatch, Complete, Cancel | **Fully Implemented (API Integrated)** |
| **Attendance & Geofencing** | GPS Clock-in with office radius distance check | **Partially Implemented (Frontend Local + Backend API exists)** |
| **Emergency SOS Alert** | Top-bar panic button triggering location emergency alert | **Partially Implemented (Frontend UI + Mock Fallback, Backend API route missing)** |
| **AI Fleet Assistant** | Conversational chat for fleet queries | **Partially Implemented (Frontend Mock Service + Backend API `/api/ai/query` exists)** |
| **Live Tracking & Maps** | Interactive vector map tracking dispatched trips | **Fully Implemented (MapLibre / MapTiler / Mock Fallback)** |
| **Maintenance Logging** | Vehicle service record management | **Partially Implemented (Frontend Local State + Backend API exists)** |
| **Fuel & Expense Logs** | Refueling and trip expense tracking | **Partially Implemented (Frontend Local State + Backend API exists)** |
| **Analytics Dashboard** | Revenue charts and costliest vehicle KPIs | **Partially Implemented (Frontend Static Constants + Backend API exists)** |
| **Team Chat** | Inter-team messaging board | **Partially Implemented (Frontend Mock State + Backend API exists)** |
| **License OCR Scanning** | License image upload scanning | **Backend Mock Endpoint (`/api/ocr/scan-license`)** |
| **Notifications** | Operational push notifications | **Backend Router Unmounted** |

---

## 17. Feature-by-Feature Implementation Details

### 1. Driver Voice Registration Modal
- **Files**: `App/src/components/DriverVoiceRegistration/*`, `App/src/services/speech/speechRecognition.ts`, `App/src/utils/driverVoiceNormalizer.ts`.
- **Flow**: Modal steps through interactive questions (Full Name, License Number, License Expiry, Contact Phone). Captures native microphone audio, converts speech to text transcript, normalizes numbers/dates using `driverVoiceNormalizer.ts`, presents a final review card, and pre-fills manual driver registration.

### 2. Geofence Attendance Verification
- **Files**: `App/src/components/ClockInWidget.tsx`, `App/src/services/locationService.ts`, `App/src/services/geofenceService.ts`, `App/src/utils/distanceUtils.ts`.
- **Flow**: Fetches live device GPS via `@react-native-community/geolocation`, calculates Haversine distance to Head Office (`23.05288, 72.61891`), verifies against `200m` radius, and updates `AttendanceStore`.

### 3. Emergency SOS System
- **Files**: `App/src/components/SOSButton.tsx`, `App/src/services/sosService.ts`.
- **Flow**: Prompts user confirmation via Alert modal, fetches current GPS coordinates, posts payload via `sosService.ts`. If endpoint `/api/sos/trigger` fails (since route is unmounted on backend), gracefully falls back to displaying a mock alert notification.

---

## 18. AI Architecture

### Backend AI (`backend/src/modules/ai/routes.ts`)
- Implements keyword intent routing over database records:
  - `"driver"` -> `DRIVER_PERFORMANCE`
  - `"maintenance"` -> `MAINTENANCE_ALERTS`
  - `"fuel"` -> `FUEL_SUMMARY`
  - `"trip"` -> `TRIP_SUMMARY`
  - Default -> `ACTIVE_VEHICLES`

### Frontend AI (`App/src/services/mockAiAssistantService.ts`)
- Client uses `mockAiAssistantService` with predefined NLP intent mapping (`NLP_MAP`) to render structured message bubbles and rich UI cards (vehicle status list, maintenance alerts).

---

## 19. Maps & GPS

- **Library**: `@maplibre/maplibre-react-native` v11.3.6 and `@react-native-community/geolocation` v3.4.0.
- **Provider API Key**: `MAPTILER_API_KEY = '1x1gmikEnr5F2g6rVcgR'` in `App/src/config/env.ts`.
- **Map Components**:
  - `FleetMap.tsx`: Vector map displaying vehicle markers and trip routes.
  - `LiveMap.tsx`: Interactive tracking view.
  - `MapPreview.tsx`: SVG canvas preview rendering office geofence radius and user position.

---

## 20. OCR & Camera

- **Library**: `react-native-image-picker` v8.2.1 installed on frontend.
- **Backend OCR Endpoint**: `POST /api/ocr/scan-license` accepts `multipart/form-data` with field `image` and returns extracted mock license metadata:
```json
{
  "fullName": "Raj Patel",
  "licenseNumber": "DL-14202300123",
  "dateOfBirth": "15/04/1998",
  "expiryDate": "14/04/2038"
}
```

---

## 21. Voice Features

- **Files**: `App/src/services/speech/speechRecognition.ts`, `App/src/utils/driverVoiceNormalizer.ts`.
- **Permissions**: Requests Android `RECORD_AUDIO` native permission dynamically.
- **Normalizer Rules**: Converts spoken number strings ("nine eight seven six...") to digits, handles license number patterns, and normalizes date expressions.

---

## 22. Offline & Synchronization

- **Session Persistence**: JWT auth token and user profile cached in `AsyncStorage` (`App/src/services/storage/tokenStorage.ts`).
- **Database Fallback**: Backend database helper (`backend/src/config/database.ts`) keeps in-memory state when Supabase connection is offline or unconfigured.

---

## 23. Notifications

- **Backend Schema**: `notifications` table (`id`, `userId`, `title`, `body`, `read`, `createdAt`).
- **Status**: Route handler defined in `backend/src/modules/notifications/routes.ts`, but route mount statement in `backend/src/app.ts` is omitted.

---

## 24. Storage

- **Local App Storage**: `@react-native-async-storage/async-storage` keys: `'token'`, `'user'`.
- **Backend File Uploads**: Multer uploads stored in `backend/uploads/`.

---

## 25. Environment Variables

> [!IMPORTANT]
> Secret credential values are strictly omitted in compliance with security guidelines.

| Environment Variable | Purpose | Used By | Required? |
| --- | --- | --- | --- |
| `NODE_ENV` | Application environment (`development`, `test`, `production`) | Backend (`config/env.ts`) | Optional (Default `development`) |
| `PORT` | Server listening port | Backend (`config/env.ts`, `server.ts`) | Optional (Default `5000`) |
| `SUPABASE_URL` | Supabase project REST URL | Backend (`config/env.ts`, `config/supabase.ts`) | Optional (Triggers Supabase mode) |
| `SUPABASE_ANON_KEY` | Supabase anonymous API key | Backend (`config/env.ts`) | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase administrative service role key | Backend (`config/env.ts`, `config/supabase.ts`) | Optional (Enables Supabase DB) |
| `JWT_SECRET` | Secret key for signing authentication JWT tokens | Backend (`config/env.ts`, `middleware/auth.ts`) | Required (Default `development-secret`) |
| `JWT_EXPIRES_IN` | Token expiration duration (e.g. `7d`) | Backend (`config/env.ts`, `middleware/auth.ts`) | Optional (Default `7d`) |
| `CORS_ORIGIN` | Allowed CORS origins | Backend (`config/env.ts`, `app.ts`) | Optional (Default `*`) |
| `AI_PROVIDER` | AI service provider mode (`local` / external) | Backend (`config/env.ts`) | Optional |
| `AI_API_KEY` | AI provider API key | Backend (`config/env.ts`) | Optional |
| `OCR_PROVIDER` | OCR service provider mode | Backend (`config/env.ts`) | Optional |
| `OCR_API_KEY` | OCR provider API key | Backend (`config/env.ts`) | Optional |
| `OFFICE_LATITUDE` | Latitude coordinate for Head Office geofence | Backend (`config/env.ts`) | Optional (Default `23.05288`) |
| `OFFICE_LONGITUDE` | Longitude coordinate for Head Office geofence | Backend (`config/env.ts`) | Optional (Default `72.61891`) |
| `OFFICE_GEOFENCE_RADIUS` | Radius in meters for attendance geofence | Backend (`config/env.ts`) | Optional (Default `200`) |
| `MAPTILER_API_KEY` | MapTiler API Key for vector tiles | Frontend (`App/src/config/env.ts`) | Required for Map rendering |

---

## 26. Dependencies

### Key Frontend Dependencies (`App/package.json`)
- `react`: `19.2.3`
- `react-native`: `0.86.0`
- `@react-navigation/native`: `^7.3.14`
- `@react-navigation/native-stack`: `^7.18.6`
- `@react-navigation/drawer`: `^7.13.5`
- `@react-navigation/bottom-tabs`: `^7.18.14`
- `zustand`: `^5.0.14`
- `axios`: `^1.18.1`
- `@react-native-async-storage/async-storage`: `^3.1.1`
- `@maplibre/maplibre-react-native`: `^11.3.6`
- `@react-native-community/geolocation`: `^3.4.0`
- `lucide-react-native`: `^1.27.0`
- `react-native-reanimated`: `^4.5.3`
- `react-native-gesture-handler`: `^3.1.0`
- `react-native-safe-area-context`: `^5.8.0`
- `react-native-screens`: `^4.26.2`
- `react-native-svg`: `^15.15.5`
- `react-native-image-picker`: `^8.2.1`

### Key Backend Dependencies (`backend/package.json`)
- `express`: `^4.21.0`
- `@supabase/supabase-js`: `^2.45.4`
- `jsonwebtoken`: `^9.0.2`
- `bcryptjs`: `^2.4.3`
- `zod`: `^3.23.8`
- `multer`: `^2.4.0`
- `cors`: `^2.8.5`
- `helmet`: `^7.1.0`
- `morgan`: `^1.10.0`
- `dotenv`: `^16.4.5`
- `tsx`: `^4.19.1` (Dev execution runner)
- `vitest`: `^2.1.1` & `supertest`: `^7.0.0` (Testing)

---

## 27. Build & Run Configuration

### Backend Execution Commands
```bash
cd backend
npm install
npm run dev        # Runs tsx watch src/server.ts on http://localhost:5000
npm run build      # Compiles TypeScript to dist/
npm start          # Runs compiled dist/server.js
npm test           # Executes vitest test suite (smoke.test.ts)
npm run typecheck  # Validates TypeScript types (tsc --noEmit)
```

### Mobile App Execution Commands
```bash
cd App
npm install
npm start          # Starts Metro Dev Server on port 8081
npm run android    # Builds and launches Android APK on emulator/device
npm run ios        # Installs pods and launches iOS Simulator
```

---

## 28. Data Flows

### Vehicle Dispatch & Trip Complete Data Flow
```text
1. Dispatcher Screen (App/src/screens/TripDispatcherScreen.tsx)
   │ Inputs Source, Destination, selects Vehicle & Driver, enters Cargo Weight
   ▼
2. Cargo Weight Validation
   │ Checks Cargo Weight against selected Vehicle maxLoadCapacity
   ▼
3. TripStore.registerTrip(payload) (App/src/store/TripStore.ts)
   │ HTTP POST /api/trip/create
   ▼
4. Backend Trip Controller (backend/src/modules/trips/routes.ts)
   │ Verifies Vehicle exists and Capacity >= Cargo Weight
   │ Inserts new Trip record into 'trips' table (status: 'DISPATCHED')
   │ Updates 'vehicles' status to 'ON_TRIP'
   │ Updates 'users' (driver) status to 'ON_TRIP'
   ▼
5. Mobile Client State Update
   │ TripStore appends trip to 'trips' list
   │ Re-fetches updated Vehicles & Drivers
   │ Dashboard & Live Tracking screens automatically update statuses
```

---

## 29. Feature Relationships

```text
Authentication (users)
      │
      ├── Manager / Dispatcher User
      │         │
      │         ▼
      │   Trip Dispatcher ────────► Vehicle Registry (vehicles)
      │         │                         │
      │         │ (Assigns)               │ (Linked via vehicleID)
      │         ▼                         ▼
      └── Driver User (ROLE_DRIVER) ──► Maintenance Logs & Fuel Logs
                │                         │
                │ (Assigned to)           │ (Calculates)
                ▼                         ▼
            Live Trip (trips) ─────► Analytics & Expense Records
                │
                ▼
         Tracking Locations (tracking_locations)
```

---

## 30. Current Implementation Status

| Module / Feature | Frontend | Backend | Database | API | Status Summary |
| --- | --- | --- | --- | --- | --- |
| **Authentication** | Completed | Completed | Completed | Completed | **Fully Functional**: Login, Signup, Token Refresh, Role Validation. |
| **Vehicles** | Completed | Completed | Completed | Completed | **Fully Functional**: CRUD operations integrated with backend. |
| **Drivers** | Completed | Completed | Completed | Completed | **Fully Functional**: Roster list, Add Driver, Voice Registration. |
| **Trips** | Completed | Completed | Completed | Completed | **Fully Functional**: Dispatch, capacity validation, Complete, Cancel. |
| **Attendance** | Completed | Completed | Completed | Partial | **Partially Functional**: UI + GPS geofencing works; client uses local state instead of calling `/api/attendance/clock-in`. |
| **SOS Alert** | Completed | Missing | Schema Ready | Missing | **UI Functional / API Fallback**: Panic button works; backend `/api/sos` route missing. |
| **Live Tracking** | Completed | Completed | Completed | Partial | **Fully Functional**: MapLibre vector map renders trip markers; client falls back to active trips list. |
| **AI Assistant** | Completed | Completed | Completed | Partial | **UI Functional**: Chat UI renders rich cards; client uses `mockAiAssistantService` instead of `/api/ai/query`. |
| **Maintenance** | Completed | Completed | Completed | Partial | **UI Functional**: Screen manages local state; backend `/api/maintenance` endpoints exist. |
| **Fuel & Expenses** | Completed | Completed | Completed | Partial | **UI Functional**: Screen manages local state; backend `/api/fuel` and `/api/expenses` exist. |
| **Analytics** | Completed | Completed | Completed | Partial | **UI Functional**: Charts render mock constants; backend `/api/analytics` endpoint exists. |
| **Chat** | Completed | Completed | Completed | Partial | **UI Functional**: Local message state; backend `/api/chat/messages` exists. |
| **OCR License** | Partial | Completed | Schema Ready | Completed | **Mock Endpoint**: Backend provides mock extraction endpoint. |

---

## 31. Known Issues

### Confirmed Issues (Visible in Code)
1. **Port Mismatch between Frontend & Backend**:
   - `App/src/api/apiPath.ts` defines `BASE_URL` as `http://10.0.2.2:5001` (Android) / `http://localhost:5001` (iOS).
   - `backend/src/config/env.ts` sets default backend port to `5000`.
   - *Result*: Mobile app network calls will fail with connection refused unless backend `PORT=5001` is specified or `apiPath.ts` is updated to port `5000`.
2. **Missing SOS Route on Backend**:
   - `App/src/api/apiPath.ts` defines `TriggerSOS = ${BASE_URL}/api/sos/trigger`.
   - `backend/src/app.ts` does NOT import or mount an `/api/sos` route.
   - *Result*: `sosService.ts` catches 404 errors and returns a mock alert fallback payload.
3. **Unmounted Notification Router on Backend**:
   - `backend/src/modules/notifications/routes.ts` defines `notificationRouter`.
   - `backend/src/app.ts` does not mount `app.use('/api/notifications', notificationRouter)`.
4. **Disconnected Frontend Services**:
   - `MaintenanceScreen.tsx`, `FuelExpenseScreen.tsx`, `AnalyticsScreen.tsx`, and `ChatScreen.tsx` use local component state instead of dispatching Axios calls to their respective live backend endpoints (`/api/maintenance`, `/api/fuel`, `/api/expenses`, `/api/analytics`, `/api/chat`).

---

## 32. Mock / Placeholder Implementations

- **`App/src/services/mockAiAssistantService.ts`**: Frontend AI service returning simulated delay and intent responses for active vehicles, trip summaries, driver performance, and maintenance alerts.
- **`backend/src/modules/ocr/routes.ts`**: OCR endpoint returning static extracted license data for any uploaded file.
- **`App/src/components/DriverVoiceRegistration`**: Voice listening indicator simulates speech capture steps if native voice engine is unavailable.

---

## 33. TODO / Pending Work

1. Align `BASE_URL` port in `App/src/api/apiPath.ts` with backend port `5000`.
2. Create and mount `/api/sos/trigger` router in `backend/src/app.ts`.
3. Mount `notificationRouter` in `backend/src/app.ts`.
4. Connect frontend screens (`MaintenanceScreen`, `FuelExpenseScreen`, `AnalyticsScreen`, `ChatScreen`, `AIAssistantScreen`, `ClockInWidget`) to live Axios calls targeting their corresponding backend endpoints.
5. Integrate real OCR processing (e.g. Tesseract or Vision API) in `backend/src/modules/ocr/routes.ts`.

---

## 34. Important Architectural Decisions

- **Dual Database Strategy**: Designed in `backend/src/config/database.ts` to allow full development, testing, and CI execution without requiring a live Supabase database instance.
- **Unified Custom Tab Bar with Expandable Grid**: Custom Animated Tab Bar (`CustomTabBar.tsx`) handles secondary navigation items gracefully via a glassmorphic pop-up grid without cluttering bottom tabs.
- **Role Normalization**: Double translation layer (`roles.ts` on frontend, `normalizeRole()` on backend) ensures human-friendly UI titles ("Fleet Manager") safely map to backend RBAC constants (`ROLE_MANAGER`).

---

## 35. Important Files Reference

| File Path | Primary Purpose | Architectural Importance |
| --- | --- | --- |
| `backend/src/app.ts` | Express server initialization & router mounting | **High** |
| `backend/src/config/database.ts` | Database access abstraction (Supabase + In-Memory) | **High** |
| `backend/supabase/migrations/001_initial_schema.sql` | PostgreSQL database schema definition | **High** |
| `App/src/api/apiPath.ts` | API Base URL & endpoint route constants | **High** |
| `App/src/api/axiosClient.ts` | Axios HTTP client with Bearer auth token interceptor | **High** |
| `App/src/navigation/RootNavigator.tsx` | Root authentication condition routing | **High** |
| `App/src/navigation/CustomTabBar.tsx` | Custom animated bottom tab bar and drawer grid | **High** |
| `App/src/store/AuthStore.ts` | Zustand session authentication & token storage | **High** |
| `App/src/store/TripStore.ts` | Zustand trip dispatcher state & API calls | **High** |
| `App/src/store/VehicleStore.ts` | Zustand vehicle registry state & API calls | **High** |
| `App/src/screens/DashboardScreen.tsx` | Main fleet overview & attendance widget | **Medium** |
| `App/src/components/ClockInWidget.tsx` | GPS geofence clock-in component | **Medium** |
| `App/src/services/speech/speechRecognition.ts` | Native microphone & speech listener service | **Medium** |

---

## 36. AI Agent Development Guidelines

When modifying or extending this codebase, future AI agents **MUST** strictly adhere to the following directives:

1. **Do NOT Duplicate APIs or Endpoints**: Check `backend/src/app.ts` and `API_DOCUMENTATION.md` before creating new backend routers. Reuse existing modules in `backend/src/modules/`.
2. **Respect Dual-Mode Database Abstraction**: Always use `db.list()`, `db.find()`, `db.insert()`, `db.update()`, and `db.remove()` inside backend routes. Do NOT invoke `supabase.from()` directly inside controllers; keep data operations inside `database.ts`.
3. **Preserve Role Normalization & RBAC**: Always normalize role names using `normalizeRole()` or `roleMap` from `App/src/constants/roles.ts`. Always protect sensitive backend routes using `authenticate` and `authorize('ROLE_...')` middleware.
4. **Do NOT Expose Credentials or Secrets**: Never hardcode API keys, JWT secrets, or Supabase service role keys in source files or git commits. Use `env.ts` schemas.
5. **Maintain Axios Interceptors**: Always use the shared Axios instance from `App/src/api/axiosClient.ts` for frontend API requests so JWT headers are automatically attached.
6. **Verify Native Permissions**: When modifying GPS or speech features, ensure Android permissions (`ACCESS_FINE_LOCATION`, `RECORD_AUDIO`) are properly requested via `PermissionsAndroid`.
7. **Test Endpoints After Editing**: Always run `npm run typecheck` in `backend` and `npm test` (`vitest`) to confirm system stability.

---

## 37. Final Project Summary

- **Total Major Modules Identified**: 15 backend domain modules (`ai`, `analytics`, `attendance`, `auth`, `chat`, `dashboard`, `expenses`, `fuel`, `maintenance`, `notifications`, `ocr`, `tracking`, `trips`, `users`, `vehicles`).
- **Frontend Architecture**: React Native (0.86.0) Monorepo App with Zustand state management, MapLibre vector maps, custom reanimated bottom tabs, and native voice recognition.
- **Backend Architecture**: Express + TypeScript REST API featuring JWT authentication, role authorization, and dual Supabase/In-Memory database access.
- **Database Architecture**: PostgreSQL schema containing 10 tables with foreign keys and index optimizations.
- **Authentication**: JWT token authentication stored in `AsyncStorage` on mobile and checked via Express middleware.
- **APIs Identified**: 33 REST endpoints identified and documented.
- **Features Identified**: 15 major business features documented.
- **Known Issues**: Port mismatch (5001 vs 5000), unmounted backend `/api/sos` and `/api/notifications` routes, and local state usage in 4 frontend screens.
- **Context Document Location**: `/Users/sakshamojha/Documents/Projects/Minor/PROJECT_CONTEXT.md`.
