# GoWater Monorepo - Next Steps & Testing Guide

> **Created:** 2026-01-27
> **Last Updated:** 2026-01-27
> **Purpose:** Guide for running, testing, and continuing development on the monorepo

---

## Quick Start

### Prerequisites
- Node.js 18+ installed
- pnpm installed globally (`npm install -g pnpm`)
- Supabase project configured (credentials in `apps/web/.env.local`)

### Running the Project

```bash
# Navigate to monorepo root
cd gowater-monorepo

# Install all dependencies
pnpm install

# Run web app only
pnpm run dev:web

# Run mobile app only
pnpm run dev:mobile

# Run both (parallel)
pnpm run dev
```

---

## Testing If It's Running

### 1. Web App (Next.js)

```bash
# Start the web app
pnpm run dev:web
```

**Expected output:**
```
@gowater/web:dev: ▲ Next.js 15.x
@gowater/web:dev: - Local: http://localhost:3000
@gowater/web:dev: ✓ Ready in Xs
```

**Verify in browser:**
- Open http://localhost:3000
- You should see the login page
- Test login with existing credentials

**Test API endpoint:**
```bash
curl http://localhost:3000/api/auth/verify
```
Expected: `{"error":"No token provided"}` (this confirms API is working)

### 2. Mobile App (Expo)

```bash
# Start the mobile app
cd apps/mobile
npx expo start --clear
```

**Expected output:**
```
› Metro waiting on exp://...
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**Verify mobile app:**
1. Install Expo Go app on your phone
2. Scan the QR code shown in terminal
3. App should load with login screen

**Important:** Update `apps/mobile/.env` with your computer's IP:
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
```

To find your IP:
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr`

### 3. Build Verification

```bash
# Test that web app builds without errors
pnpm run build
```

**Expected output:**
```
@gowater/web:build: ✓ Compiled successfully
@gowater/web:build: Route (app) ... Size ... First Load JS
```

---

## Project Status

### Completed ✅

#### Monorepo Setup
- [x] Turborepo monorepo setup with pnpm workspaces
- [x] Web app migrated to `apps/web/`
- [x] Mobile app created in `apps/mobile/`
- [x] Shared types package at `packages/types/`
- [x] Documentation updated for monorepo structure
- [x] `.npmrc` configured for pnpm hoisting (required for Expo)

#### Mobile App Screens
- [x] Login screen (`app/index.tsx`)
- [x] Dashboard screen (`app/(auth)/dashboard.tsx`) - with auto-refresh on focus
- [x] Attendance screen (`app/(auth)/attendance.tsx`) - full check-in/check-out flow
- [x] Tasks screen (`app/(auth)/tasks.tsx`) - with subtasks, dates, sorting

#### Mobile App Features
- [x] AuthContext with SecureStore token storage
- [x] Attendance service with Bearer token auth
- [x] Tasks service with Bearer token auth
- [x] Check-in modal with task review (like web)
- [x] Add task functionality during check-in
- [x] Work location selection (WFH/Onsite/Field)
- [x] WhatsApp report generation (matching web format)
- [x] Clipboard copy functionality
- [x] Break start/end functionality
- [x] Dashboard auto-refresh using `useFocusEffect`

#### API Updates for Mobile
- [x] `/api/auth/login` - returns token in response body
- [x] `/api/attendance/today` - supports Bearer token
- [x] `/api/attendance/checkin` - supports Bearer token
- [x] `/api/attendance/checkout` - supports Bearer token
- [x] `/api/attendance/break/start` - supports Bearer token
- [x] `/api/attendance/break/end` - supports Bearer token
- [x] `/api/tasks` (GET, POST, PUT, DELETE) - supports Bearer token

#### Bug Fixes
- [x] Fixed timezone issue - attendance now uses Philippine time (UTC+8)
- [x] Fixed isCheckedIn logic - now correctly checks both checkIn AND checkOut times
- [x] Fixed duplicate User type export in shared types package

---

## Next Steps

### Phase 1: Mobile App Enhancements

#### 1.1 Task Management
- [ ] Add task status update from mobile (change status dropdown)
- [ ] Add subtask completion toggle from mobile
- [ ] Add task detail view screen
- [ ] Add task search/filter functionality

#### 1.2 Attendance History
- [ ] Add attendance history view (past days)
- [ ] Add weekly/monthly attendance summary
- [ ] Add leave request functionality

#### 1.3 Profile & Settings
- [ ] Add user profile screen
- [ ] Add settings screen
- [ ] Add notification preferences

### Phase 2: Mobile App Polish

#### 2.1 UI/UX Improvements
- [ ] Add loading skeletons
- [ ] Add error toast notifications
- [ ] Add offline mode indicators
- [ ] Add haptic feedback

#### 2.2 Authentication Enhancements
- [ ] Add biometric authentication (fingerprint/face)
- [ ] Add session timeout handling
- [ ] Add "Remember me" functionality
- [ ] Add password change screen

### Phase 3: Testing & Deployment

#### 3.1 Testing
- [ ] Test on Android device/emulator
- [ ] Test on iOS device/simulator
- [ ] Test API error scenarios
- [ ] Test network offline scenarios

#### 3.2 Build for Production
```bash
# Build Android APK (EAS Build)
cd apps/mobile
npx eas build --platform android

# Build iOS (requires Mac + Apple Developer account)
npx eas build --platform ios
```

---

## Common Issues & Solutions

### Issue: "pnpm not found"
```bash
npm install -g pnpm
```

### Issue: Mobile app can't connect to API
1. Make sure web app is running on port 3000
2. Update `apps/mobile/.env` with correct IP address
3. Ensure phone/emulator is on same network as computer
4. Check firewall isn't blocking port 3000

### Issue: "Cannot find module 'expo/bin/cli'" or Metro errors
The monorepo needs pnpm hoisting for Expo. Ensure `.npmrc` exists in root:
```bash
# Create .npmrc in monorepo root
echo "node-linker=hoisted" > .npmrc
echo "shamefully-hoist=true" >> .npmrc

# Clean and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Issue: React Native version mismatch
Make sure Expo SDK version matches your Expo Go app version:
```bash
cd apps/mobile
npx expo install expo@latest --fix
```

### Issue: "Module not found" errors
```bash
# Clean and reinstall dependencies
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Issue: TypeScript errors about User type
The shared types package has both `User` (auth) and `AttendanceUser` types. Import the correct one:
```typescript
// For auth/login - use User from auth.ts
import { User } from '@gowater/types';

// For attendance features - use AttendanceUser if needed
import { AttendanceUser } from '@gowater/types';
```

### Issue: Attendance shows wrong status (stuck on "checked in")
The mobile determines status by checking both checkInTime AND checkOutTime:
- `isCheckedIn = !!checkInTime && !checkOutTime`
If both exist, user has already checked out.

### Issue: "Already checked out for this session"
This was caused by timezone mismatch. The server now uses Philippine time (UTC+8) for all date calculations via `getPhilippineDateString()`.

---

## Folder Reference

```
gowater-monorepo/
├── apps/
│   ├── web/                    # Next.js web app
│   │   ├── src/
│   │   │   ├── app/            # Pages and API routes
│   │   │   ├── lib/            # Services (auth, attendance, etc.)
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── hooks/          # React hooks
│   │   │   └── contexts/       # React contexts
│   │   ├── public/             # Static assets
│   │   └── .env.local          # Environment variables
│   │
│   └── mobile/                 # React Native Expo app
│       ├── app/                # Expo Router pages
│       │   ├── index.tsx       # Login screen
│       │   ├── _layout.tsx     # Root layout
│       │   └── (auth)/         # Protected screens
│       │       ├── _layout.tsx # Auth layout with tabs
│       │       ├── dashboard.tsx
│       │       ├── attendance.tsx
│       │       └── tasks.tsx
│       ├── src/
│       │   ├── contexts/       # AuthContext
│       │   └── services/       # API service wrappers
│       │       ├── attendance.ts
│       │       └── tasks.ts
│       └── .env                # Mobile environment variables
│
├── packages/
│   └── types/                  # Shared TypeScript types
│       └── src/
│           ├── index.ts        # Re-exports all types
│           ├── attendance.ts   # AttendanceUser, Task, SubTask, etc.
│           ├── auth.ts         # User, Permission, AuthResponse
│           └── leads.ts        # Lead types
│
├── docs/                       # Documentation
│   ├── CODE_REFERENCE.md       # API & service reference
│   ├── DATABASE_FIELDS_REFERENCE.md
│   ├── REUSABLE_REFERENCE.md
│   └── NEXT_STEPS.md           # This file
│
├── .npmrc                      # pnpm hoisting config (required for Expo)
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # Workspace configuration
└── turbo.json                  # Turborepo configuration
```

---

## WhatsApp Report Format

The mobile app generates reports matching the web format:

### Start of Day Report
```
GoWater Start of Day Report

Date: Monday, January 27, 2025
Employee: John Doe
Position: Sales Manager
Work Arrangement: WFH
Login Time: 08:45 AM
Logout Time: N/A
Hours Worked: 0.00 hours
Break Time: 0m

Today's Planned Tasks:
1. Project Name [PENDING]
   Sub-task title [Pending]
   [Optional notes]
```

### End of Day Report
```
GoWater End of Day Report

Date: Monday, January 27, 2025
Employee: John Doe
Position: Sales Manager
Work Arrangement: WFH
Login Time: 08:45 AM
Logout Time: 05:30 PM
Hours Worked: 8.75 hours
Break Time: 30m

Today's Task Updates:
1. Project Name [COMPLETED]
   Sub-task title [Done]
```

---

## Useful Commands

```bash
# Install dependencies
pnpm install

# Run development
pnpm run dev              # All apps
pnpm run dev:web          # Web only
pnpm run dev:mobile       # Mobile only (or cd apps/mobile && npx expo start)

# Build
pnpm run build            # Build all

# Clean (if needed)
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# Check for TypeScript errors
cd apps/web && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit

# Add dependency to specific app
pnpm add <package> --filter @gowater/web
pnpm add <package> --filter @gowater/mobile
```

---

**Last Updated:** 2026-01-27
