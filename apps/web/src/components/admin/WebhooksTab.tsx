'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface Webhook {
  id: number;
  user_id: number;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  headers: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WebhookLog {
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

interface WebhookForm {
  name: string;
  url: string;
  secret: string;
  events: string[];
  headers: string; // JSON string for editing
}

interface TestResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
}

const EVENT_GROUPS: Record<string, { label: string; events: string[] }> = {
  attendance: {
    label: 'Attendance',
    events: ['attendance.checked_in', 'attendance.checked_out', 'attendance.break_started', 'attendance.break_ended'],
  },
  tasks: {
    label: 'Tasks',
    events: ['task.created', 'task.updated', 'task.completed', 'task.deleted'],
  },
  leave: {
    label: 'Leave',
    events: ['leave.requested', 'leave.approved', 'leave.rejected'],
  },
  leads: {
    label: 'Leads',
    events: ['lead.created', 'lead.updated', 'lead.status_changed', 'lead.activity_logged'],
  },
  users: {
    label: 'Users',
    events: ['user.created', 'user.updated', 'user.deleted'],
  },
};

const emptyForm: WebhookForm = {
  name: '',
  url: '',
  secret: '',
  events: [],
  headers: '{}',
};

export default function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [form, setForm] = useState<WebhookForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [logsWebhookId, setLogsWebhookId] = useState<number | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/webhooks', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      logger.error('Failed to fetch webhooks', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const fetchLogs = async (webhookId: number) => {
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/admin/webhooks/logs?webhookId=${webhookId}&limit=20`, { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      logger.error('Failed to fetch webhook logs', err);
    }
    setLogsLoading(false);
  };

  const openCreate = () => {
    setEditingWebhook(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setForm({
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret || '',
      events: [...webhook.events],
      headers: JSON.stringify(webhook.headers || {}, null, 2),
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = JSON.parse(form.headers);
    } catch {
      setError('Headers must be valid JSON');
      setSaving(false);
      return;
    }

    if (form.events.length === 0) {
      setError('Select at least one event');
      setSaving(false);
      return;
    }

    try {
      const isEdit = !!editingWebhook;
      const body = isEdit
        ? { id: editingWebhook!.id, name: form.name, url: form.url, secret: form.secret || null, events: form.events, headers: parsedHeaders }
        : { name: form.name, url: form.url, secret: form.secret || undefined, events: form.events, headers: parsedHeaders };

      const response = await fetch('/api/admin/webhooks', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok) {
        setShowModal(false);
        fetchWebhooks();
      } else {
        setError(data.error || 'Failed to save webhook');
      }
    } catch {
      setError('Failed to save webhook');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this webhook? All delivery logs will also be deleted.')) return;
    try {
      const response = await fetch(`/api/admin/webhooks?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        fetchWebhooks();
        if (logsWebhookId === id) {
          setLogsWebhookId(null);
          setLogs([]);
        }
      } else {
        alert('Failed to delete webhook');
      }
    } catch {
      alert('Failed to delete webhook');
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    setTogglingId(webhook.id);
    try {
      const response = await fetch('/api/admin/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: webhook.id, is_active: !webhook.is_active }),
      });
      if (response.ok) {
        fetchWebhooks();
      }
    } catch (err) {
      logger.error('Failed to toggle webhook', err);
    }
    setTogglingId(null);
  };

  const handleTest = async (webhookId: number) => {
    setTestingId(webhookId);
    setTestResult(null);
    try {
      const response = await fetch('/api/admin/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ webhookId }),
      });
      const data = await response.json();
      setTestResult({ success: data.success, statusCode: data.statusCode, responseBody: data.responseBody, error: data.error });
    } catch {
      setTestResult({ success: false, error: 'Network error' });
    }
    setTestingId(null);
  };

  const toggleEvent = (event: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const toggleGroupAll = (events: string[]) => {
    const allSelected = events.every(e => form.events.includes(e));
    setForm(prev => ({
      ...prev,
      events: allSelected
        ? prev.events.filter(e => !events.includes(e))
        : [...new Set([...prev.events, ...events])],
    }));
  };

  const toggleLogs = (webhookId: number) => {
    if (logsWebhookId === webhookId) {
      setLogsWebhookId(null);
      setLogs([]);
    } else {
      setLogsWebhookId(webhookId);
      fetchLogs(webhookId);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatEventName = (event: string) => {
    return event.replace('.', ' → ').replace(/_/g, ' ');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Webhook Subscriptions</h2>
          <p className="text-sm text-gray-600">Manage outgoing webhook endpoints for event notifications</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-p3-cyan hover:bg-p3-cyan-dark text-p3-navy-darkest px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
        >
          <PlusIcon />
          <span>Add Webhook</span>
        </button>
      </div>

      {/* Webhooks Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-800">Loading webhooks...</p>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <WebhookIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No webhooks configured</p>
            <p className="text-sm mt-1">Create a webhook to start receiving event notifications</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Events</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{webhook.name}</div>
                      <div className="text-xs text-gray-500">Created {formatDate(webhook.created_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800 max-w-xs truncate" title={webhook.url}>{webhook.url}</div>
                      {webhook.secret && <div className="text-xs text-gray-400 mt-0.5">Signed with secret</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 3).map(event => (
                          <span key={event} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {event.split('.')[1]?.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {webhook.events.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            +{webhook.events.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggle(webhook)}
                        disabled={togglingId === webhook.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          webhook.is_active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={webhook.is_active ? 'Active — click to disable' : 'Inactive — click to enable'}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          webhook.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleTest(webhook.id)}
                          disabled={testingId === webhook.id}
                          className="text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                          title="Send test event"
                        >
                          {testingId === webhook.id ? <SpinnerIcon /> : <PlayIcon />}
                        </button>
                        <button
                          onClick={() => toggleLogs(webhook.id)}
                          className={`transition-colors ${logsWebhookId === webhook.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                          title="View delivery logs"
                        >
                          <LogsIcon />
                        </button>
                        <button
                          onClick={() => openEdit(webhook)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit webhook"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(webhook.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete webhook"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div className={`rounded-lg border p-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.success ? 'Test successful' : 'Test failed'}
                {testResult.statusCode && ` — HTTP ${testResult.statusCode}`}
              </p>
              {testResult.error && <p className="text-sm text-red-600 mt-1">{testResult.error}</p>}
              {testResult.responseBody && (
                <pre className="text-xs text-gray-600 mt-2 max-h-24 overflow-auto bg-white/50 rounded p-2">
                  {testResult.responseBody}
                </pre>
              )}
            </div>
            <button onClick={() => setTestResult(null)} className="text-gray-400 hover:text-gray-600">
              <XIcon />
            </button>
          </div>
        </div>
      )}

      {/* Delivery Logs */}
      {logsWebhookId !== null && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Delivery Logs — {webhooks.find(w => w.id === logsWebhookId)?.name}
            </h3>
            <button onClick={() => { setLogsWebhookId(null); setLogs([]); }} className="text-gray-400 hover:text-gray-600">
              <XIcon />
            </button>
          </div>
          {logsLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No delivery logs yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Event</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">HTTP</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Duration</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-800">{formatEventName(log.event)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? 'OK' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{log.response_status ?? '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{log.duration_ms != null ? `${log.duration_ms}ms` : '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{formatDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                  placeholder="e.g. n8n Attendance Sync"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Endpoint URL</label>
                <input
                  type="url"
                  required
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                  placeholder="https://example.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Secret (optional)</label>
                <input
                  type="text"
                  value={form.secret}
                  onChange={e => setForm({ ...form, secret: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                  placeholder="Shared secret for HMAC signature verification"
                />
                <p className="mt-1 text-xs text-gray-500">Used to sign payloads with HMAC-SHA256</p>
              </div>

              {/* Events Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Events</label>
                <div className="space-y-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {Object.entries(EVENT_GROUPS).map(([key, group]) => {
                    const allSelected = group.events.every(e => form.events.includes(e));
                    const someSelected = group.events.some(e => form.events.includes(e));
                    return (
                      <div key={key}>
                        <label className="flex items-center space-x-2 cursor-pointer mb-1">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={() => toggleGroupAll(group.events)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                          <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                        </label>
                        <div className="ml-6 flex flex-wrap gap-x-4 gap-y-1">
                          {group.events.map(event => (
                            <label key={event} className="flex items-center space-x-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.events.includes(event)}
                                onChange={() => toggleEvent(event)}
                                className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300"
                              />
                              <span className="text-xs text-gray-600">{event.split('.')[1]?.replace(/_/g, ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Headers */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Custom Headers (JSON)</label>
                <textarea
                  value={form.headers}
                  onChange={e => setForm({ ...form, headers: e.target.value })}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200 font-mono text-sm"
                  placeholder='{"Authorization": "Bearer ..."}'
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-4 bg-p3-cyan text-p3-navy-darkest rounded-lg font-bold hover:bg-p3-cyan-dark disabled:opacity-50 shadow-md transition-all"
                >
                  {saving ? 'Saving...' : editingWebhook ? 'Update Webhook' : 'Create Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Components
function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function WebhookIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}
