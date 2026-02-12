# GoWater Monorepo - Development Guidelines

> **Purpose:** Standard development rules and best practices
> **Last Updated:** 2026-01-28

---

## Project Structure

```
gowater-monorepo/
├── apps/
│   ├── web/                 # Next.js 15 web application
│   └── mobile/              # Expo React Native application
├── packages/
│   └── types/               # Shared TypeScript types (@gowater/types)
├── docs/                    # Documentation and references
│   ├── CODE_REFERENCE.md
│   ├── DATABASE_FIELDS_REFERENCE.md
│   ├── REUSABLE_REFERENCE.md
│   └── NEXT_STEPS.md
└── CLAUDE.md                # This file
```

---

## Critical Rules

### 1. No AI Attribution
- **Never mention AI, Claude, or any AI assistant** in commit messages, code comments, documentation, or anywhere in the codebase
- **No Co-Authored-By lines** referencing AI in commits
- Keep all contributions anonymous as standard developer work

### 2. Always Read Documentation First
Before making ANY changes, read the relevant docs:
- `docs/CODE_REFERENCE.md` - API endpoints, services, types
- `docs/DATABASE_FIELDS_REFERENCE.md` - Database schema, field names
- `docs/REUSABLE_REFERENCE.md` - Existing components, hooks, patterns

### 3. Never Hallucinate
- **Database fields:** Always use exact field names from `DATABASE_FIELDS_REFERENCE.md`
- **API endpoints:** Always verify endpoints exist in `CODE_REFERENCE.md`
- **Types:** Always import from `@gowater/types` or check existing type definitions
- **Components:** Check if component exists before creating new ones

### 4. Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Database fields | snake_case | `user_id`, `check_in_time`, `break_duration` |
| TypeScript/JS variables | camelCase | `userId`, `checkInTime`, `breakDuration` |
| React components | PascalCase | `TaskCard`, `AttendanceModal` |
| CSS classes (web) | kebab-case | `task-card`, `modal-header` |
| API routes | kebab-case | `/api/attendance/edit-requests` |
| File names (components) | PascalCase | `TaskCard.tsx` |
| File names (utilities) | camelCase | `formatDate.ts` |

---

## Mobile App (Expo/React Native)

### File Structure
```
apps/mobile/
├── app/                     # Expo Router pages
│   ├── index.tsx           # Login screen (entry)
│   ├── _layout.tsx         # Root layout
│   └── (auth)/             # Protected routes
│       ├── _layout.tsx     # Tab layout
│       ├── dashboard.tsx
│       ├── attendance.tsx
│       └── tasks.tsx
├── src/
│   ├── contexts/           # React contexts
│   ├── services/           # API service wrappers
│   ├── components/         # Reusable components
│   ├── hooks/              # Custom hooks
│   └── utils/              # Utility functions
└── assets/                 # Images, fonts
```

### Component Patterns

#### Standard Screen Template
```tsx
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';

export default function ScreenName() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<DataType | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await service.getData();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
          colors={['#3b82f6']}
        />
      }
    >
      {/* Content */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1824',
  },
});
```

#### Service Pattern
```tsx
// src/services/example.ts
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const exampleService = {
  async getData(): Promise<DataType[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/endpoint`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    return data.items || [];
  },
};
```

### Mobile UI Standards

#### Color Palette
```tsx
const colors = {
  // Backgrounds
  bgPrimary: '#0f1824',      // Main background
  bgSecondary: '#1a2332',    // Card background
  bgTertiary: '#374151',     // Input background

  // Brand
  primary: '#3b82f6',        // Blue - primary actions
  success: '#22c55e',        // Green - success, check-in
  danger: '#ef4444',         // Red - danger, check-out
  warning: '#f59e0b',        // Orange - warnings, break

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  // Status
  pending: '#fef3c7',
  inProgress: '#dbeafe',
  completed: '#dcfce7',
};
```

#### Spacing Standards
```tsx
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
```

#### Typography
```tsx
const typography = {
  // Sizes
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,

  // Weights
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};
```

### Modal Pattern (iOS Compatible)
```tsx
// IMPORTANT: iOS has issues with multiple modals
// Always close one modal before opening another

const openSecondModal = () => {
  setShowFirstModal(false);
  setTimeout(() => setShowSecondModal(true), 100);
};

const closeSecondModal = () => {
  setShowSecondModal(false);
  setTimeout(() => setShowFirstModal(true), 100);
};
```

---

## Web App (Next.js)

### File Structure
```
apps/web/
├── src/
│   ├── app/                # App Router pages
│   │   ├── api/           # API routes
│   │   ├── dashboard/     # Dashboard pages
│   │   └── layout.tsx     # Root layout
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Services, utilities
│   └── types/             # TypeScript types
└── public/                # Static assets
```

### API Route Pattern
```tsx
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

function getTokenFromRequest(request: NextRequest): string | null {
  // Check cookies first (web), then Authorization header (mobile)
  let token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  return token || null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    // Your logic here

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Shared Types (@gowater/types)

### Usage
```tsx
// Always import from @gowater/types for shared types
import { User, Task, AttendanceRecord } from '@gowater/types';

// For app-specific types, define locally
interface LocalComponentProps {
  // ...
}
```

### Adding New Types
1. Add to `packages/types/src/`
2. Export from `packages/types/src/index.ts`
3. Run `pnpm install` to update workspace links

---

## State Management

### Context Pattern
```tsx
// contexts/ExampleContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface ExampleContextType {
  data: DataType | null;
  setData: (data: DataType) => void;
}

const ExampleContext = createContext<ExampleContextType | undefined>(undefined);

export function ExampleProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataType | null>(null);

  return (
    <ExampleContext.Provider value={{ data, setData }}>
      {children}
    </ExampleContext.Provider>
  );
}

export function useExample() {
  const context = useContext(ExampleContext);
  if (!context) {
    throw new Error('useExample must be used within ExampleProvider');
  }
  return context;
}
```

---

## Error Handling

### Mobile
```tsx
try {
  const result = await service.doSomething();
  if (result.success) {
    // Handle success
  } else {
    Alert.alert('Error', result.error || 'Something went wrong');
  }
} catch (error) {
  console.error('Operation failed:', error);
  Alert.alert('Error', 'An unexpected error occurred');
}
```

### Web
```tsx
try {
  const result = await service.doSomething();
  if (!result.success) {
    toast.error(result.error || 'Something went wrong');
    return;
  }
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('An unexpected error occurred');
}
```

---

## Performance Best Practices

### 1. Memoization
```tsx
// Use useCallback for functions passed as props
const handlePress = useCallback(() => {
  // handler logic
}, [dependencies]);

// Use useMemo for expensive computations
const filteredData = useMemo(() => {
  return data.filter(item => item.status === filter);
}, [data, filter]);
```

### 2. List Optimization
```tsx
// For long lists, use FlatList instead of ScrollView + map
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemComponent item={item} />}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

### 3. Image Optimization
```tsx
// Web: Use next/image
import Image from 'next/image';
<Image src="/image.png" alt="..." width={100} height={100} />

// Mobile: Use expo-image for better performance
import { Image } from 'expo-image';
<Image source={{ uri: imageUrl }} style={styles.image} />
```

---

## Security Guidelines

### 1. Token Storage
- **Mobile:** Use `expo-secure-store` (encrypted storage)
- **Web:** Use httpOnly cookies (set by server)

### 2. API Security
- Always validate JWT tokens on API routes
- Always check user ownership before data access
- Never expose sensitive data in error messages

### 3. Input Validation
- Validate all user inputs before API calls
- Sanitize data before database operations
- Use parameterized queries (handled by Supabase)

---

## Git Workflow

### Commit Messages
```
feat(mobile): add pull-to-refresh to dashboard
fix(web): resolve timezone issue in attendance
refactor(types): reorganize shared type exports
docs: update API reference documentation
```

### Branch Naming
```
feature/mobile-checkout-flow
fix/attendance-timezone
refactor/shared-components
```

---

## Testing Checklist

Before marking a feature complete:

- [ ] Works on iOS (Expo Go)
- [ ] Works on Android (Expo Go)
- [ ] Works on Web (if applicable)
- [ ] Pull-to-refresh works
- [ ] Error states handled
- [ ] Loading states shown
- [ ] No console errors/warnings
- [ ] API errors handled gracefully

---

## Cloudinary Photo Watermark Rules

The app uses Cloudinary's `upload_stream` with the `transformation` option to apply text overlay watermarks on check-in/break/checkout photos. **These rules are critical — violating them causes silent upload failures.**

### Working Pattern (DO NOT CHANGE THE APPROACH)
```
transformations array = [
  { raw_transformation: "label with b_rgb colored bg" },   // 1st raw_transformation
  { overlay: { ... }, color, gravity, ... },                // SDK overlay object(s)
  { raw_transformation: "stats bar with b_rgb black bg" },  // 2nd raw_transformation (optional)
]
```

### Hard Rules
1. **Max 2 `raw_transformation` elements** in the transformations array. More than 2 causes Cloudinary to reject the upload silently. The upload API returns an error and the photo fails.
2. **Use `raw_transformation` ONLY for overlays that need `b_rgb:` background color** (colored label, dark stats bar). The SDK's `background` property applies to the base image, not text overlays.
3. **Use SDK overlay objects** (with `overlay`, `color`, `gravity`, `effect`) for plain text overlays (date, address, branding). These are reliable with `upload_stream`.
4. **Encode special chars in `raw_transformation` text**: spaces→`%20`, commas→`%2C`, colons→`%3A`, slashes→`%2F`, pipes→`%7C`, hash→`%23`, percent→`%25` (encode `%` first).
5. **Never change the upload approach** (e.g., URL-based transformations, eager transformations). The `transformation` option on `upload_stream` is the only approach that works and returns a clean Cloudinary URL.
6. **For multi-line info with background**, combine lines using `%0A` (newline) within a single `raw_transformation` instead of creating multiple raw_transformation elements.
7. **Philippines timezone (UTC+8)**: Always use manual offset `new Date(now.getTime() + (8 * 60 * 60 * 1000))` with `getUTCHours()`/`getUTCMinutes()`. Do NOT use `toLocaleTimeString` — it's unreliable on Vercel.

### File: `apps/web/src/lib/cloudinary.ts`

---

## Common Pitfalls to Avoid

1. **Don't create duplicate components** - Check `REUSABLE_REFERENCE.md` first
2. **Don't hardcode API URLs** - Use environment variables
3. **Don't skip loading states** - Always show loading indicators
4. **Don't ignore errors** - Always handle and display errors
5. **Don't use inline styles excessively** - Use StyleSheet.create()
6. **Don't forget pull-to-refresh** - Add to all scrollable screens
7. **Don't nest modals on iOS** - Close one before opening another
8. **Don't forget type safety** - Always define proper TypeScript types
9. **Don't use more than 2 `raw_transformation` elements in Cloudinary uploads** - See Cloudinary rules above

---

## Quick Reference Commands

```bash
# Install dependencies
pnpm install

# Run web app
pnpm run dev:web

# Run mobile app
cd apps/mobile && npx expo start --clear

# Build web
pnpm run build

# Type check
cd apps/web && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
```

---

## Environment Variables

### Mobile (.env)
```
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000
```

### Web (.env.local)
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...
```

---

*This document should be updated as new patterns and conventions are established.*
