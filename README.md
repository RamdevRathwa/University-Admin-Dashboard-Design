# University Transcript Management System

This repository contains a full-stack Transcript Management System with:
- Backend: ASP.NET Core Web API (`transcript-backend`)
- Frontend: React + Vite (`transcript-frontend`)
- Database: SQL Server

This guide explains how to run the project on any device (Windows, macOS, Linux).

## 1. Prerequisites

Install these tools first:

1. .NET SDK (8.0+ recommended)
2. Node.js (18+ recommended)
3. npm (comes with Node.js)
4. SQL Server (local or remote)
5. Git

Optional but recommended:
- VS Code with C# and ESLint extensions

## 2. Clone Repository

```bash
git clone <your-repo-url>
cd "University Admin Dashboard Design"
```

## 3. Backend Setup (`transcript-backend`)

### 3.1 Restore and Build

```bash
cd transcript-backend
dotnet restore
dotnet build TranscriptManagement.sln
```

### 3.2 Configure Backend Settings

Edit:
- `transcript-backend/API/appsettings.json`
- `transcript-backend/API/appsettings.Development.json`

Important values:
- `ConnectionStrings:DefaultConnection`
- `Jwt:Issuer`, `Jwt:Audience`, `Jwt:SigningKey`
- `Otp:HashKey` (and optional `Otp:FixedCode` in Development)
- SMTP/SMS provider settings if using real OTP delivery

Notes:
- For local testing, you can use `Otp:FixedCode` in `appsettings.Development.json`.
- Keep production secrets out of source code (use environment variables or secret manager).

### 3.3 Database

The API expects a SQL Server database configured in `DefaultConnection`.

If your team has an existing DB backup/schema for this project, restore/apply it first.

If you are bootstrapping from scripts, use files under:
- `transcript-backend/scripts/sql/`

Then ensure the API can connect to the target DB instance.

### 3.4 Run Backend

```bash
cd transcript-backend/API
dotnet run
```

By default, API runs at:
- `http://localhost:5185`

Quick checks:
- Swagger JSON: `http://localhost:5185/swagger/v1/swagger.json`
- OTP diagnostics: `http://localhost:5185/api/diagnostics/otp`

## 4. Frontend Setup (`transcript-frontend`)

### 4.1 Install Dependencies

```bash
cd transcript-frontend
npm install
```

### 4.2 Configure Frontend Environment

Create or verify `.env` in `transcript-frontend`:

```env
VITE_API_BASE_URL=http://localhost:5185
```

### 4.3 Run Frontend

```bash
cd transcript-frontend
npm run dev
```

Default frontend URL:
- `http://localhost:5173`

## 5. Run Full Project (2 Terminals)

Terminal 1 (Backend):
```bash
cd transcript-backend/API
dotnet run
```

Terminal 2 (Frontend):
```bash
cd transcript-frontend
npm run dev
```

Then open:
- `http://localhost:5173`

## 6. Build for Production

### Backend publish

```bash
cd transcript-backend/API
dotnet publish -c Release -o ./publish
```

### Frontend build

```bash
cd transcript-frontend
npm run build
```

Built frontend files are in:
- `transcript-frontend/dist`

## 7. Recommended Cross-Platform Command Notes

Use equivalent terminal per OS:
- Windows: PowerShell
- macOS/Linux: bash/zsh

All commands in this README are shell-compatible with minor path differences.

## 8. Troubleshooting

### Issue: API port already in use

Symptoms:
- API fails to start, port conflict error.

Fix:
1. Stop old `dotnet` process/terminal running the API.
2. Or change `applicationUrl` in:
   - `transcript-backend/API/Properties/launchSettings.json`

### Issue: Frontend shows network/CORS errors

Fix:
1. Confirm backend is running at `http://localhost:5185`.
2. Confirm frontend `.env` has correct `VITE_API_BASE_URL`.
3. Restart frontend dev server after `.env` changes.

### Issue: Database connection errors

Fix:
1. Verify SQL Server instance name and credentials.
2. Confirm DB exists and schema is initialized.
3. Re-check `ConnectionStrings:DefaultConnection`.

### Issue: OTP not received

Fix:
1. For development, set `Otp:FixedCode` in `appsettings.Development.json`.
2. For real delivery, verify SMTP/SMS keys and sender config.

### Issue: Lint fails

The app can still run in dev/build mode, but fix lint errors for CI stability:

```bash
cd transcript-frontend
npm run lint
```

## 9. Project Structure

```text
University Admin Dashboard Design/
  transcript-backend/
    API/
    Application/
    Domain/
    Infrastructure/
    scripts/
  transcript-frontend/
    src/
    public/
```

## 10. One-Command Health Check (Optional)

After starting both apps:

1. Open frontend login page.
2. Request OTP.
3. Verify login/register flow.
4. Open backend swagger endpoint.
5. Confirm API logs show successful requests.

---

If needed, add deployment-specific sections later (IIS, Nginx reverse proxy, Docker, cloud hosting).
