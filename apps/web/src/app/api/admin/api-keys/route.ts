import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getApiKeyService } from '@/lib/apiKeys';
import { logger } from '@/lib/logger';

// ============================================================
// API KEY MANAGEMENT ROUTES
// ============================================================
// Admin-only endpoints for creating and managing API keys.
//
// API keys let workflow tools (n8n, Zapier, GHL) authenticate
// with GoWater without needing a JWT token. They're long-lived
// credentials the admin copies into their automation tool.
//
// SECURITY:
// - The plaintext key is returned ONCE at creation (POST response)
// - After that, only the prefix is visible (e.g. "gw_a1b2c...")
// - Keys are hashed with SHA-256 before storage
// - Keys can be scoped: read-only, read-write, or admin
// - Keys can be revoked instantly
//
// ENDPOINTS:
//   GET    /api/admin/api-keys         - List all API keys
//   POST   /api/admin/api-keys         - Create new API key
//   DELETE /api/admin/api-keys?id=123  - Revoke/delete an API key
// ============================================================

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

// ----------------------------------------------------------
// GET: List all API keys
// ----------------------------------------------------------
// Returns key metadata only (name, prefix, scopes, last used).
// NEVER returns the full key or its hash.
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const apiKeyService = getApiKeyService();
    const keys = await apiKeyService.getApiKeys();

    return NextResponse.json({
      apiKeys: keys,
      message: 'API keys retrieved successfully'
    });
  } catch (error) {
    logger.error('Get API keys error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ----------------------------------------------------------
// POST: Create a new API key
// ----------------------------------------------------------
// This is the ONLY time the plaintext key is returned.
// The admin must copy it immediately - it cannot be retrieved later.
//
// Example request:
//   {
//     "name": "n8n Production Workflows",
//     "scopes": ["read", "write"],
//     "expiresInDays": 90
//   }
//
// Example response:
//   {
//     "apiKey": { "id": 1, "name": "n8n ...", "key_prefix": "gw_a1b2c" },
//     "plaintextKey": "gw_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0..."
//   }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, scopes, expiresInDays } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 });
    }

    const apiKeyService = getApiKeyService();
    const result = await apiKeyService.createApiKey(decoded.userId, {
      name,
      scopes,
      expiresInDays
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return the plaintext key - this is the ONLY time it's available
    return NextResponse.json({
      apiKey: result.apiKey,
      plaintextKey: result.plaintextKey,
      message: 'API key created successfully. Save this key now - it cannot be retrieved later.'
    });
  } catch (error) {
    logger.error('Create API key error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ----------------------------------------------------------
// DELETE: Revoke and delete an API key
// ----------------------------------------------------------
// The key immediately stops working. Any workflow tool using
// this key will start getting 401 errors.
//
// Query parameter: ?id=123&action=revoke (soft disable)
//                  ?id=123              (permanent delete)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const keyId = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const apiKeyService = getApiKeyService();
    let result;

    if (action === 'revoke') {
      // Soft disable - key row stays in DB for audit trail
      result = await apiKeyService.revokeApiKey(parseInt(keyId), decoded.userId);
    } else {
      // Permanent delete
      result = await apiKeyService.deleteApiKey(parseInt(keyId), decoded.userId);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: action === 'revoke'
        ? 'API key revoked successfully'
        : 'API key deleted successfully'
    });
  } catch (error) {
    logger.error('Delete API key error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
