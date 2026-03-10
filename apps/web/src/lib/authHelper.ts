import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getApiKeyService } from './apiKeys';
import { logger } from './logger';

// ============================================================
// AUTH HELPER - Unified Authentication for All API Routes
// ============================================================
//
// PROBLEM:
// The web app uses JWT cookies. The mobile app uses Bearer tokens.
// Workflow tools (n8n, Zapier, GHL) need long-lived API keys.
// Each API route currently handles auth differently.
//
// SOLUTION:
// This helper checks ALL three auth methods in priority order:
// 1. X-API-Key header  (for workflow tools)
// 2. Authorization: Bearer <token>  (for mobile app)
// 3. auth-token cookie  (for web app)
//
// HOW TO USE IN AN API ROUTE:
//
//   import { authenticateRequest } from '@/lib/authHelper';
//
//   export async function GET(request: NextRequest) {
//     const auth = await authenticateRequest(request);
//     if (!auth.authenticated) {
//       return NextResponse.json({ error: auth.error }, { status: 401 });
//     }
//     const userId = auth.userId;
//     const userRole = auth.role;
//     // ... your logic
//   }
//
// For write endpoints, you can also check scopes:
//
//   if (!auth.scopes?.includes('write')) {
//     return NextResponse.json({ error: 'Insufficient scope' }, { status: 403 });
//   }
//
// ============================================================

// Standard JWT payload structure used across the app
export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  name?: string;
}

// What authenticateRequest returns
export interface AuthResult {
  authenticated: boolean;
  userId?: number;
  email?: string;
  role?: string;
  authMethod?: 'jwt' | 'api_key';  // Which method was used
  scopes?: string[];                 // Only set for API key auth
  error?: string;
}

// ============================================================
// MAIN FUNCTION: Authenticate any incoming request
// ============================================================
// Tries each auth method in order until one succeeds.
// Returns a standard AuthResult so routes don't need to know
// which method was used.
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  // ----- METHOD 1: API Key (X-API-Key header) -----
  // Checked first because workflow tools always send this header.
  // If present, we validate it and skip JWT checks entirely.
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
  if (apiKey) {
    try {
      const apiKeyService = getApiKeyService();
      const validation = await apiKeyService.validateApiKey(apiKey);

      if (validation.valid) {
        return {
          authenticated: true,
          userId: validation.userId,
          role: 'api_key',  // API keys don't have a "role" per se
          authMethod: 'api_key',
          scopes: validation.scopes
        };
      }

      return { authenticated: false, error: validation.error || 'Invalid API key' };
    } catch (error) {
      logger.error('API key authentication error', error);
      return { authenticated: false, error: 'Authentication failed' };
    }
  }

  // ----- METHOD 2: Bearer Token (Authorization header) -----
  // Used by the mobile app and manual API testing (Postman, curl).
  let token: string | null = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // ----- METHOD 3: Cookie (auth-token) -----
  // Used by the Next.js web app. Cookies are set by the login endpoint.
  if (!token) {
    token = request.cookies.get('auth-token')?.value || null;
  }

  // No credentials found at all
  if (!token) {
    return { authenticated: false, error: 'No authentication credentials provided' };
  }

  // ----- Verify JWT -----
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    return {
      authenticated: true,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      authMethod: 'jwt',
      scopes: ['read', 'write', 'admin']  // JWT users have full access
    };
  } catch (error) {
    // Token is expired or invalid
    return { authenticated: false, error: 'Invalid or expired token' };
  }
}

// ============================================================
// CONVENIENCE: Check if user has admin role
// ============================================================
export function isAdmin(auth: AuthResult): boolean {
  return auth.role === 'admin';
}

// ============================================================
// CONVENIENCE: Check if auth has a specific scope
// ============================================================
// For API key auth, scopes are limited. For JWT auth, all scopes.
export function hasScope(auth: AuthResult, scope: string): boolean {
  return auth.scopes?.includes(scope) || auth.scopes?.includes('admin') || false;
}
