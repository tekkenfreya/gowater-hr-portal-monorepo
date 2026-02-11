import crypto from 'crypto';
import { getDb } from './supabase';
import { logger } from './logger';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

// All possible events that webhooks can subscribe to.
// Organized by module (attendance, task, leave, lead, user).
// When you add a new event, add it here so TypeScript catches typos.
export type WebhookEvent =
  | 'attendance.checked_in'
  | 'attendance.checked_out'
  | 'attendance.break_started'
  | 'attendance.break_ended'
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.deleted'
  | 'leave.requested'
  | 'leave.approved'
  | 'leave.rejected'
  | 'lead.created'
  | 'lead.updated'
  | 'lead.status_changed'
  | 'lead.activity_logged'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted';

// What a webhook row looks like in the database
export interface Webhook {
  id: number;
  user_id: number;
  name: string;
  url: string;
  secret: string | null;
  events: string[];      // Array of WebhookEvent strings
  headers: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Data needed to create a new webhook subscription
export interface CreateWebhookData {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  headers?: Record<string, string>;
}

// Data allowed when updating an existing webhook
export interface UpdateWebhookData {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  headers?: Record<string, string>;
  is_active?: boolean;
}

// What a delivery log row looks like in the database
export interface WebhookLog {
  id: number;
  webhook_id: number;
  event: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// Filters for querying webhook logs
export interface WebhookLogFilters {
  webhookId?: number;
  event?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// WEBHOOK SERVICE
// ============================================================
// Follows the same singleton pattern as NotificationService.
// Two responsibilities:
//   1. CRUD operations for webhook subscriptions (admin UI)
//   2. Fire events to all matching webhooks (called from other services)
// ============================================================

export class WebhookService {
  private db = getDb();

  // ----------------------------------------------------------
  // CRUD: Create a new webhook subscription
  // ----------------------------------------------------------
  // An admin registers a URL and selects which events to listen for.
  // Example: "When attendance.checked_in fires, POST to https://hooks.zapier.com/abc"
  async createWebhook(
    userId: number,
    data: CreateWebhookData
  ): Promise<{ success: boolean; webhook?: Webhook; error?: string }> {
    try {
      // Validate the URL is actually a URL
      try {
        new URL(data.url);
      } catch {
        return { success: false, error: 'Invalid webhook URL' };
      }

      if (!data.events || data.events.length === 0) {
        return { success: false, error: 'At least one event is required' };
      }

      if (!data.name?.trim()) {
        return { success: false, error: 'Webhook name is required' };
      }

      const webhook = await this.db.insert('webhooks', {
        user_id: userId,
        name: data.name.trim(),
        url: data.url.trim(),
        secret: data.secret || null,
        events: JSON.stringify(data.events),
        headers: JSON.stringify(data.headers || {}),
        is_active: true
      });

      return { success: true, webhook: this.parseWebhook(webhook) };
    } catch (error) {
      logger.error('Create webhook error', error);
      return { success: false, error: 'Failed to create webhook' };
    }
  }

  // ----------------------------------------------------------
  // CRUD: List all webhooks (admin only)
  // ----------------------------------------------------------
  async getWebhooks(userId?: number): Promise<Webhook[]> {
    try {
      const conditions: Record<string, unknown> = {};
      if (userId) {
        conditions.user_id = userId;
      }

      const webhooks = await this.db.all<Webhook>('webhooks', conditions, 'created_at');
      return (webhooks || []).map(w => this.parseWebhook(w));
    } catch (error) {
      logger.error('Get webhooks error', error);
      return [];
    }
  }

  // ----------------------------------------------------------
  // CRUD: Get a single webhook by ID
  // ----------------------------------------------------------
  async getWebhookById(webhookId: number): Promise<Webhook | null> {
    try {
      const webhook = await this.db.get<Webhook>('webhooks', { id: webhookId });
      return webhook ? this.parseWebhook(webhook) : null;
    } catch (error) {
      logger.error('Get webhook by ID error', error);
      return null;
    }
  }

  // ----------------------------------------------------------
  // CRUD: Update webhook settings
  // ----------------------------------------------------------
  async updateWebhook(
    webhookId: number,
    data: UpdateWebhookData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.db.get<Webhook>('webhooks', { id: webhookId });
      if (!existing) {
        return { success: false, error: 'Webhook not found' };
      }

      if (data.url) {
        try {
          new URL(data.url);
        } catch {
          return { success: false, error: 'Invalid webhook URL' };
        }
      }

      const updateData: Record<string, unknown> = { updated_at: new Date() };

      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.url !== undefined) updateData.url = data.url.trim();
      if (data.secret !== undefined) updateData.secret = data.secret;
      if (data.events !== undefined) updateData.events = JSON.stringify(data.events);
      if (data.headers !== undefined) updateData.headers = JSON.stringify(data.headers);
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      await this.db.update('webhooks', updateData, { id: webhookId });
      return { success: true };
    } catch (error) {
      logger.error('Update webhook error', error);
      return { success: false, error: 'Failed to update webhook' };
    }
  }

  // ----------------------------------------------------------
  // CRUD: Delete a webhook and all its logs
  // ----------------------------------------------------------
  async deleteWebhook(webhookId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.db.get<Webhook>('webhooks', { id: webhookId });
      if (!existing) {
        return { success: false, error: 'Webhook not found' };
      }

      // Logs are cascade-deleted (ON DELETE CASCADE in schema)
      await this.db.delete('webhooks', { id: webhookId });
      return { success: true };
    } catch (error) {
      logger.error('Delete webhook error', error);
      return { success: false, error: 'Failed to delete webhook' };
    }
  }

  // ----------------------------------------------------------
  // CORE: Fire an event to all matching webhooks
  // ----------------------------------------------------------
  // This is the main function called by other services.
  // Example usage:
  //   await getWebhookService().fireEvent('attendance.checked_in', {
  //     userId: 1,
  //     userName: 'John',
  //     checkInTime: '2026-02-09T09:00:00Z',
  //     workLocation: 'WFH'
  //   });
  //
  // HOW IT WORKS:
  // 1. Query all active webhooks
  // 2. Filter to those subscribed to this event (or subscribed to '*')
  // 3. Send HTTP POST to each URL in parallel
  // 4. Log every delivery attempt (success or failure)
  //
  // This runs asynchronously - it does NOT block the original action.
  // If a webhook delivery fails, the user's action still succeeds.
  async fireEvent(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
    try {
      // Get all active webhooks
      // Wrapped in try/catch so if the webhooks table doesn't exist yet
      // (migration not run), it silently returns without breaking anything.
      let allWebhooks: Webhook[];
      try {
        allWebhooks = await this.db.all<Webhook>('webhooks', { is_active: true });
      } catch {
        // Table doesn't exist yet - migration hasn't been run. Skip silently.
        return;
      }

      if (!allWebhooks || allWebhooks.length === 0) return;

      // Filter to webhooks subscribed to this event
      // Each webhook's `events` array can contain specific events
      // or '*' to receive everything (useful for n8n catch-all triggers)
      const matchingWebhooks = allWebhooks.filter(webhook => {
        const events = typeof webhook.events === 'string'
          ? JSON.parse(webhook.events)
          : webhook.events;
        return events.includes(event) || events.includes('*');
      });

      if (matchingWebhooks.length === 0) return;

      // Build the standard payload envelope.
      // Every webhook delivery has the same structure so n8n/Zapier
      // can reliably parse it regardless of event type.
      const eventPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: payload
      };

      // Fire all webhooks in parallel (don't await - fire and forget)
      // We use Promise.allSettled so one failure doesn't block others
      const deliveryPromises = matchingWebhooks.map(webhook =>
        this.deliverWebhook(webhook, event, eventPayload)
      );

      // Run deliveries in background - don't block the caller
      Promise.allSettled(deliveryPromises).catch(err => {
        logger.error('Webhook delivery batch error', err);
      });
    } catch (error) {
      // Never let webhook errors break the main application flow
      logger.error('Fire webhook event error', error);
    }
  }

  // ----------------------------------------------------------
  // DELIVERY: Send HTTP POST to a single webhook URL
  // ----------------------------------------------------------
  // Handles:
  // - HMAC signature generation (if secret is set)
  // - Custom headers
  // - Timeout (10 seconds max)
  // - Response logging
  private async deliverWebhook(
    webhook: Webhook,
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const startTime = Date.now();
    const body = JSON.stringify(payload);

    try {
      // Build request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'GoWater-Webhooks/1.0',
        'X-Webhook-Event': event,
        'X-Webhook-Id': String(webhook.id)
      };

      // If the webhook has a shared secret, generate an HMAC signature.
      // The receiving end (n8n/Zapier) can verify this to ensure the
      // request actually came from GoWater and wasn't spoofed.
      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(body)
          .digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      // Merge any custom headers the admin configured
      const customHeaders = typeof webhook.headers === 'string'
        ? JSON.parse(webhook.headers)
        : (webhook.headers || {});
      Object.assign(headers, customHeaders);

      // Send the request with a 10-second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeout);

      // Read response (truncate to 1000 chars to avoid storing huge responses)
      const responseText = await response.text();
      const truncatedResponse = responseText.substring(0, 1000);
      const durationMs = Date.now() - startTime;

      // Log the delivery attempt
      await this.logDelivery({
        webhook_id: webhook.id,
        event,
        payload,
        response_status: response.status,
        response_body: truncatedResponse,
        success: response.ok,
        error_message: response.ok ? null : `HTTP ${response.status}`,
        duration_ms: durationMs
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failed delivery
      await this.logDelivery({
        webhook_id: webhook.id,
        event,
        payload,
        response_status: null,
        response_body: null,
        success: false,
        error_message: errorMessage,
        duration_ms: durationMs
      });
    }
  }

  // ----------------------------------------------------------
  // LOGGING: Record a delivery attempt
  // ----------------------------------------------------------
  private async logDelivery(logData: {
    webhook_id: number;
    event: string;
    payload: Record<string, unknown>;
    response_status: number | null;
    response_body: string | null;
    success: boolean;
    error_message: string | null;
    duration_ms: number;
  }): Promise<void> {
    try {
      await this.db.insert('webhook_logs', {
        ...logData,
        payload: JSON.stringify(logData.payload)
      });
    } catch {
      // Don't let logging errors cascade - table may not exist yet
    }
  }

  // ----------------------------------------------------------
  // LOGS: Get delivery logs with filtering and pagination
  // ----------------------------------------------------------
  // Admins use this to debug why a Zapier zap stopped working.
  // Shows: which webhook, what event, HTTP status, response, timing.
  async getWebhookLogs(
    filters: WebhookLogFilters = {}
  ): Promise<{ logs: WebhookLog[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      // Build WHERE clauses dynamically
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (filters.webhookId) {
        conditions.push(`wl.webhook_id = $${paramIndex++}`);
        params.push(filters.webhookId);
      }
      if (filters.event) {
        conditions.push(`wl.event = $${paramIndex++}`);
        params.push(filters.event);
      }
      if (filters.success !== undefined) {
        conditions.push(`wl.success = $${paramIndex++}`);
        params.push(filters.success);
      }
      if (filters.startDate) {
        conditions.push(`wl.created_at >= $${paramIndex++}`);
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        conditions.push(`wl.created_at <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Get total count for pagination
      const countResult = await this.db.executeRawSQL<{ count: string }>(
        `SELECT COUNT(*) as count FROM webhook_logs wl ${whereClause}`,
        params
      );
      const total = parseInt(countResult?.[0]?.count) || 0;

      // Get paginated logs
      const logs = await this.db.executeRawSQL<WebhookLog>(
        `SELECT wl.*, w.name as webhook_name, w.url as webhook_url
         FROM webhook_logs wl
         LEFT JOIN webhooks w ON w.id = wl.webhook_id
         ${whereClause}
         ORDER BY wl.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
      );

      return {
        logs: logs || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get webhook logs error', error);
      return { logs: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    }
  }

  // ----------------------------------------------------------
  // TEST: Send a test event to a specific webhook
  // ----------------------------------------------------------
  // Lets admins verify their webhook URL is reachable before
  // going live. Sends a "webhook.test" event with sample data.
  async testWebhook(
    webhookId: number
  ): Promise<{ success: boolean; statusCode?: number; responseBody?: string; error?: string }> {
    try {
      const webhook = await this.db.get<Webhook>('webhooks', { id: webhookId });
      if (!webhook) {
        return { success: false, error: 'Webhook not found' };
      }

      const parsed = this.parseWebhook(webhook);
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test event from GoWater',
          webhookId: parsed.id,
          webhookName: parsed.name
        }
      };

      const body = JSON.stringify(testPayload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'GoWater-Webhooks/1.0',
        'X-Webhook-Event': 'webhook.test',
        'X-Webhook-Id': String(parsed.id)
      };

      if (parsed.secret) {
        const signature = crypto
          .createHmac('sha256', parsed.secret)
          .update(body)
          .digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      const customHeaders = parsed.headers || {};
      Object.assign(headers, customHeaders);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(parsed.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeout);

      const responseText = await response.text();

      // Log the test delivery
      await this.logDelivery({
        webhook_id: parsed.id,
        event: 'webhook.test',
        payload: testPayload,
        response_status: response.status,
        response_body: responseText.substring(0, 1000),
        success: response.ok,
        error_message: response.ok ? null : `HTTP ${response.status}`,
        duration_ms: 0
      });

      return {
        success: response.ok,
        statusCode: response.status,
        responseBody: responseText.substring(0, 500)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // ----------------------------------------------------------
  // HELPER: Parse JSONB fields from database rows
  // ----------------------------------------------------------
  // Supabase returns JSONB columns as strings sometimes,
  // so we need to safely parse them into actual arrays/objects.
  private parseWebhook(webhook: Webhook): Webhook {
    return {
      ...webhook,
      events: typeof webhook.events === 'string'
        ? JSON.parse(webhook.events)
        : (webhook.events || []),
      headers: typeof webhook.headers === 'string'
        ? JSON.parse(webhook.headers)
        : (webhook.headers || {})
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================
// Same pattern as getNotificationService(), getAttendanceService(), etc.
// Use: const webhookService = getWebhookService();
let webhookServiceInstance: WebhookService | null = null;

export function getWebhookService(): WebhookService {
  if (!webhookServiceInstance) {
    webhookServiceInstance = new WebhookService();
  }
  return webhookServiceInstance;
}
