# LogiSphere AI API

Base path: `/api`

Frontend-compatible endpoints:

- `POST /auth/login` -> `{ success, message, serviceResult: { token, id, email, role, name } }`
- `GET /auth/request-reset-password?email=...`
- `POST /auth/reset-password?token=...&newPassword=...`
- `POST /user/create`
- `GET /user?role=ROLE_DRIVER`
- `GET /vehicle/`, `POST /vehicle/create`, `PUT /vehicle/update/?id=...`, `DELETE /vehicle/delete/?id=...`
- `GET /trip`, `POST /trip/create`, `PUT /trip/dispatch/:tripID`, `PUT /trip/complete/:tripID`, `PUT /trip/cancel/:tripID`

New backend endpoints:

- `POST /attendance/clock-in`, `POST /attendance/clock-out`, `GET /attendance/history`
- `GET /dashboard/summary`
- `GET /maintenance`, `POST /maintenance/create`
- `GET /fuel`, `POST /fuel/create`
- `GET /expenses`, `POST /expenses/create`
- `GET /tracking/live`, `POST /tracking/location`
- `GET /analytics`
- `POST /ai/query`
- `GET /chat/messages`, `POST /chat/messages`
- `POST /ocr/scan-license` with multipart file field `image`

Seed login:

- Email: `manager@logisphere.ai`
- Password: `Password123`
- Role: `ROLE_MANAGER`
