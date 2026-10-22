# LogiSphere AI API Documentation & RBAC Specification

Base path: `/api`

## 1. Authentication & Tenant Security

All authenticated endpoints require a Bearer token in the `Authorization` header (`Authorization: Bearer <token>`).

- **Tenant Isolation**: User identity and organization membership are derived exclusively from verified JWT token claims (`id`, `role`, `organization_id`). Client-supplied headers or body parameters cannot override token claims.
- **Organization State Enforcement**: Requests from users belonging to pending or suspended organizations are rejected with `403 Forbidden`.

### Authentication Endpoints
- `POST /api/auth/login` -> `{ success, message, serviceResult: { token, id, email, role, name, organization_id } }`
- `GET /api/auth/request-reset-password?email=...` -> Send password reset instructions.
- `POST /api/auth/reset-password?token=...&newPassword=...` -> Complete password reset.
- `POST /api/auth/change-password` -> Mandatory or voluntary password update.

---

## 2. Canonical Roles & Permissions Matrix

### Roles
1. `ROLE_MANAGER` (Fleet Manager)
2. `ROLE_DISPATCHER` (Dispatcher)
3. `ROLE_SAFETY_OFFICER` (Safety Officer)
4. `ROLE_FINANCE` (Financial Analyst)
5. `ROLE_DRIVER` (Driver)
6. `PLATFORM_ADMIN` (Platform Administrator)

### Module Access Matrix

| Feature Module | Endpoint(s) | Authorized Roles | Driver Constraints / Scope |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `GET /api/dashboard/summary` | All Roles | Personal shift metrics for Driver; Fleet-wide KPIs for others |
| **Drivers** | `GET /api/user/` | `MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCE`, `DRIVER` | Driver can only view own profile |
| | `POST /api/user/create` | `MANAGER`, `PLATFORM_ADMIN` (or public signup) | Drivers/Dispatchers/Safety/Finance rejected with 403 |
| | `PUT /api/user/update` | `MANAGER`, `DRIVER` | Driver can only update own phone/contact |
| | `DELETE /api/user/delete` | `MANAGER`, `PLATFORM_ADMIN` | Forbidden for Driver, Dispatcher, Safety, Finance |
| **Vehicles** | `GET /api/vehicle/` | `MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCE`, `DRIVER` | Driver scoped to assigned vehicles only |
| | `POST /api/vehicle/create` | `MANAGER`, `PLATFORM_ADMIN` | Forbidden for Driver, Dispatcher, Safety, Finance |
| | `PUT /api/vehicle/update` | `MANAGER`, `PLATFORM_ADMIN` | Forbidden for Driver, Dispatcher, Safety, Finance |
| | `DELETE /api/vehicle/delete` | `MANAGER`, `PLATFORM_ADMIN` | Forbidden for Driver, Dispatcher, Safety, Finance |
| **Trips** | `GET /api/trip/` | `MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCE`, `DRIVER` | Driver scoped to assigned trips only |
| | `POST /api/trip/create` | `MANAGER`, `DISPATCHER` | Forbidden for Driver, Safety, Finance |
| | `PUT /api/trip/:tripID/status` | `MANAGER`, `DISPATCHER`, `DRIVER` | Driver strictly limited to in-transit states (`GOING_TO_PICKUP` through `DELIVERED`) |
| | `PUT /api/trip/dispatch/:tripID` | `MANAGER`, `DISPATCHER` | Forbidden for Driver, Safety, Finance |
| | `PUT /api/trip/cancel/:tripID` | `MANAGER`, `DISPATCHER` | Forbidden for Driver, Safety, Finance |
| **Tracking** | `GET /api/tracking/live` | `MANAGER`, `DISPATCHER`, `SAFETY_OFFICER` | Rejected for `FINANCE` (403) |
| | `GET /api/tracking/:tripID` | `MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `DRIVER` | Driver scoped to own assigned trip |
| | `POST /api/tracking/location` | `DRIVER` | Ingest GPS; caller must match trip's assigned driver |
| **Attendance** | `POST /api/attendance/clock-in` | `DRIVER`, `MANAGER` | Drivers outside geofence must provide active-trip exception reason |
| | `POST /api/attendance/clock-out` | `DRIVER`, `MANAGER` | Drivers outside geofence must provide active-trip exception reason |
| | `GET /api/attendance/history` | `MANAGER`, `SAFETY_OFFICER`, `DISPATCHER`, `DRIVER` | Driver scoped to own history; Dispatcher limited view |
| | `GET /api/attendance/export/pdf`| `MANAGER`, `SAFETY_OFFICER` | Compliance report download |
| **Maintenance**| `GET /api/maintenance` | `MANAGER`, `SAFETY_OFFICER`, `FINANCE`, `DISPATCHER`, `DRIVER` | Driver scoped to assigned vehicles; Dispatcher status-only |
| | `POST /api/maintenance/create`| `MANAGER`, `SAFETY_OFFICER` | Forbidden for Driver, Dispatcher, Finance |
| | `PUT /api/maintenance/:id/complete` | `MANAGER` | Forbidden for Driver, Safety, Finance, Dispatcher |
| **Fuel & Expense** | `GET /api/fuel`, `GET /api/expenses` | `MANAGER`, `FINANCE`, `DRIVER` | Driver scoped to assigned trips; Dispatcher/Safety rejected with 403 |
| | `POST /api/fuel/create` | `MANAGER`, `FINANCE` | Forbidden for Dispatcher, Safety, Driver |
| | `POST /api/expenses/create`| `MANAGER`, `FINANCE` | Forbidden for Dispatcher, Safety, Driver |
| **Analytics & AI** | `GET /api/analytics/fuel-anomalies` | `MANAGER`, `DISPATCHER`, `FINANCE` | Forbidden for Driver, Safety |
| | `GET /api/analytics/maintenance-forecast` | `MANAGER`, `FINANCE` | Forbidden for Driver, Dispatcher, Safety |
| | `POST /api/ai/query` | `MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCE`, `DRIVER` | Personal shift assistant for Driver; Fleet advisory for others |
| **Carbon** | `GET /api/carbon/summary` | `MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCE` | Forbidden for Driver |
| | `POST /api/carbon/targets` | `MANAGER` | Manage monthly sustainability budgets |
| **Chat** | `GET /api/chat/conversations` | All Roles | 1-on-1 conversations within same organization |
| | `POST /api/chat/messages` | All Roles | Real-time messages with 24h retention |
| **Emergency SOS**| `POST /api/sos/trigger` | All Roles (primarily `DRIVER`) | Triggers emergency broadcast and captures GPS location |
| | `GET /api/alerts` | `MANAGER`, `SAFETY_OFFICER`, `DISPATCHER`, `FINANCE` | Organization emergency alert board |
| | `PUT /api/alerts/:id/ack` | `MANAGER`, `SAFETY_OFFICER`, `DISPATCHER` | Incident acknowledgement and resolution |

---

## 3. Seed Credentials for Local Testing

- **Fleet Manager**: `manager@logisphere.ai` / `Password123` (`ROLE_MANAGER`)
- **Platform Admin**: `admin@logisphere.ai` / `AdminSecret!2026` (`PLATFORM_ADMIN`)
