import crypto from 'crypto';
import { getDb } from './supabase';
import { logger } from './logger';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

// What an API key row looks like in the database.
// Note: the actual key is NEVER stored - only its hash.
export interface ApiKey {
  id: number;
  user_id: number;
  name: string;
  key_prefix: string;     // First 8 chars for display (e.g. "gw_a1b2c")
  scopes: string[];       // What the key can do: read, write, admin
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Data needed to create a new API key
export interface CreateApiKeyData {
  name: string;
  scopes?: string[];
  expiresInDays?: number;  // null = never expires
}

// Returned only once at creation time (includes the plaintext key)
export interface ApiKeyCreateResult {
  success: boolean;
  apiKey?: ApiKey;
  plaintextKey?: string;  // ONLY returned here, never stored or shown again
  error?: string;
}

// Result of validating an API key during authentication
export interface ApiKeyValidation {
  valid: boolean;
  userId?: number;
  scopes?: string[];
  keyId?: number;
  error?: string;
}

// ============================================================
// API KEY SERVICE
// ============================================================
// Manages long-lived API keys for programmatic access.
//
// WHY THIS EXISTS:
// JWT tokens expire after a few hours and require login.
// Workflow tools (n8n, Zapier, GHL) need credentials that
// last for weeks or months and can authenticate via HTTP header.
//
// HOW IT WORKS:
// 1. Admin creates an API key via the dashboard
// 2. The plaintext key (e.g. "gw_a1b2c3d4...") is shown ONCE
// 3. The admin copies it into n8n/Zapier
// 4. On each API request, n8n sends the key in the X-API-Key header
// 5. We hash the incoming key and compare to stored hashes
// 6. If match found + not expired + is_active, the request is authenticated
//
// SECURITY:
// - Keys are 48 random bytes, base64url encoded (64 chars)
// - Prefixed with "gw_" for easy identification
// - Only the SHA-256 hash is stored in the database
// - Keys can be scoped (read-only, read-write, admin)
// - Keys can have expiration dates
// - Keys can be revoked instantly
// ============================================================

export class ApiKeyService {
  private db = getDb();

  // ----------------------------------------------------------
  // CREATE: Generate a new API key
  // ----------------------------------------------------------
  // Returns the plaintext key ONCE. After this, only the hash
  // is stored. If the admin loses the key, they must create a new one.
  async createApiKey(
    userId: number,
    data: CreateApiKeyData
  ): Promise<ApiKeyCreateResult> {
    try {
      if (!data.name?.trim()) {
        return { success: false, error: 'API key name is required' };
      }

      // Generate a cryptographically secure random key.
      // 48 bytes = 64 chars in base64url = extremely hard to guess.
      // The "gw_" prefix makes it easy to identify GoWater API keys
      // in config files and environment variables.
      const randomBytes = crypto.randomBytes(48);
      const keyBody = randomBytes.toString('base64url');
      const plaintextKey = `gw_${keyBody}`;

      // Store only the first 8 chars as a prefix.
      // This lets admins identify which key is which in the UI
      // without exposing the full key.
      const keyPrefix = plaintextKey.substring(0, 8);

      // Hash the full key with SHA-256.
      // When a request comes in, we'll hash the provided key
      // and compare it to this stored hash.
      const keyHash = crypto
        .createHash('sha256')
        .update(plaintextKey)
        .digest('hex');

      // Calculate expiration date if specified
      let expiresAt: Date | null = null;
      if (data.expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
      }

      const validScopes = ['read', 'write', 'admin'];
      const scopes = (data.scopes || ['read']).filter(s => validScopes.includes(s));

      const apiKey = await this.db.insert('api_keys', {
        user_id: userId,
        name: data.name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes: JSON.stringify(scopes),
        expires_at: expiresAt,
        is_active: true
      });

      return {
        success: true,
        apiKey: this.parseApiKey(apiKey),
        plaintextKey  // ONLY time the plaintext key is ever available
      };
    } catch (error) {
      logger.error('Create API key error', error);
      return { success: false, error: 'Failed to create API key' };
    }
  }

  // ----------------------------------------------------------
  // LIST: Get all API keys for a user (or all if admin)
  // ----------------------------------------------------------
  // The plaintext key is NEVER returned here - only metadata.
  async getApiKeys(userId?: number): Promise<ApiKey[]> {
    try {
      const conditions: Record<string, unknown> = {};
      if (userId) {
        conditions.user_id = userId;
      }

      const keys = await this.db.all('api_keys', conditions, 'created_at');
      return (keys || []).map((k: ApiKey) => this.parseApiKey(k));
    } catch (error) {
      logger.error('Get API keys error', error);
      return [];
    }
  }

  // ----------------------------------------------------------
  // REVOKE: Disable an API key immediately
  // ----------------------------------------------------------
  // Sets is_active to false. The key stops working instantly.
  // We don't delete the row so there's an audit trail.
  async revokeApiKey(
    keyId: number,
    userId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.db.get('api_keys', { id: keyId });
      if (!existing) {
        return { success: false, error: 'API key not found' };
      }

      // Verify ownership (unless admin - checked at route level)
      if (existing.user_id !== userId) {
        return { success: false, error: 'API key not found' };
      }

      await this.db.update('api_keys', {
        is_active: false,
        updated_at: new Date()
      }, { id: keyId });

      return { success: true };
    } catch (error) {
      logger.error('Revoke API key error', error);
      return { success: false, error: 'Failed to revoke API key' };
    }
  }

  // ----------------------------------------------------------
  // DELETE: Permanently remove an API key
  // ----------------------------------------------------------
  async deleteApiKey(
    keyId: number,
    userId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.db.get('api_keys', { id: keyId });
      if (!existing) {
        return { success: false, error: 'API key not found' };
      }

      if (existing.user_id !== userId) {
        return { success: false, error: 'API key not found' };
      }

      await this.db.delete('api_keys', { id: keyId });
      return { success: true };
    } catch (error) {
      logger.error('Delete API key error', error);
      return { success: false, error: 'Failed to delete API key' };
    }
  }

  // ----------------------------------------------------------
  // VALIDATE: Check if an API key is valid
  // ----------------------------------------------------------
  // Called on every API request that uses the X-API-Key header.
  //
  // HOW VALIDATION WORKS:
  // 1. Extract the prefix (first 8 chars) from the provided key
  // 2. Query the database for active keys with that prefix
  //    (the index on key_prefix makes this fast)
  // 3. Hash the provided key and compare to stored hash
  // 4. Check expiration date
  // 5. Update last_used_at timestamp
  //
  // This is designed to be FAST - typically one indexed query.
  async validateApiKey(plaintextKey: string): Promise<ApiKeyValidation> {
    try {
      if (!plaintextKey || !plaintextKey.startsWith('gw_')) {
        return { valid: false, error: 'Invalid API key format' };
      }

      // Extract prefix for indexed lookup
      const keyPrefix = plaintextKey.substring(0, 8);

      // Hash the provided key to compare with stored hashes
      const keyHash = crypto
        .createHash('sha256')
        .update(plaintextKey)
        .digest('hex');

      // Find matching active key by prefix, then verify full hash.
      // The prefix index narrows results to ~1 row, then we verify
      // the full hash to prevent prefix collisions.
      const results = await this.db.executeRawSQL<{
        id: number;
        user_id: number;
        key_hash: string;
        scopes: string;
        expires_at: string | null;
      }>(
        `SELECT id, user_id, key_hash, scopes, expires_at
         FROM api_keys
         WHERE key_prefix = $1 AND is_active = TRUE`,
        [keyPrefix]
      );

      if (!results || results.length === 0) {
        return { valid: false, error: 'API key not found' };
      }

      // Find the key with matching full hash
      const matchingKey = results.find(k => k.key_hash === keyHash);
      if (!matchingKey) {
        return { valid: false, error: 'Invalid API key' };
      }

      // Check if key has expired
      if (matchingKey.expires_at && new Date(matchingKey.expires_at) < new Date()) {
        return { valid: false, error: 'API key has expired' };
      }

      // Update last_used_at in background (don't block the response)
      this.db.update('api_keys', {
        last_used_at: new Date()
      }, { id: matchingKey.id }).catch(err => {
        logger.error('Failed to update API key last_used_at', err);
      });

      // Parse scopes
      const scopes = typeof matchingKey.scopes === 'string'
        ? JSON.parse(matchingKey.scopes)
        : matchingKey.scopes;

      return {
        valid: true,
        userId: matchingKey.user_id,
        scopes,
        keyId: matchingKey.id
      };
    } catch (error) {
      logger.error('Validate API key error', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  // ----------------------------------------------------------
  // HELPER: Parse JSONB fields from database rows
  // ----------------------------------------------------------
  private parseApiKey(key: ApiKey): ApiKey {
    return {
      ...key,
      scopes: typeof key.scopes === 'string'
        ? JSON.parse(key.scopes)
        : (key.scopes || ['read'])
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================
let apiKeyServiceInstance: ApiKeyService | null = null;

export function getApiKeyService(): ApiKeyService {
  if (!apiKeyServiceInstance) {
    apiKeyServiceInstance = new ApiKeyService();
  }
  return apiKeyServiceInstance;
}
