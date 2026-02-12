'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface ApiKey {
  id: number;
  user_id: number;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateForm {
  name: string;
  scopes: string[];
  expiresInDays: number | null;
}

const SCOPE_OPTIONS = [
  { value: 'read', label: 'Read', description: 'Read-only access to data' },
  { value: 'write', label: 'Write', description: 'Read and write access' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
];

const EXPIRATION_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: 365, label: '365 days' },
  { value: null, label: 'Never' },
];

export default function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: '', scopes: ['read'], expiresInDays: 90 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newPlaintextKey, setNewPlaintextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/api-keys', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setApiKeys(data.apiKeys || []);
      }
    } catch (err) {
      logger.error('Failed to fetch API keys', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (form.scopes.length === 0) {
      setError('Select at least one scope');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          scopes: form.scopes,
          expiresInDays: form.expiresInDays,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setNewPlaintextKey(data.plaintextKey);
        fetchApiKeys();
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch {
      setError('Failed to create API key');
    }
    setSaving(false);
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('Revoke this API key? It will stop working immediately but remain in the list.')) return;
    try {
      const response = await fetch(`/api/admin/api-keys?id=${id}&action=revoke`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        fetchApiKeys();
      } else {
        alert('Failed to revoke API key');
      }
    } catch {
      alert('Failed to revoke API key');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this API key? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/api-keys?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        fetchApiKeys();
      } else {
        alert('Failed to delete API key');
      }
    } catch {
      alert('Failed to delete API key');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleScope = (scope: string) => {
    setForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewPlaintextKey(null);
    setForm({ name: '', scopes: ['read'], expiresInDays: 90 });
    setError('');
    setCopied(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (key: ApiKey) => {
    if (!key.is_active) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Revoked</span>;
    }
    if (isExpired(key.expires_at)) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Expired</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-600">Manage API keys for external integrations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-p3-cyan hover:bg-p3-cyan-dark text-p3-navy-darkest px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
        >
          <PlusIcon />
          <span>Create API Key</span>
        </button>
      </div>

      {/* API Keys Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-800">Loading API keys...</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <KeyIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No API keys</p>
            <p className="text-sm mt-1">Create an API key to authenticate external services</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Scopes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Last Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{apiKey.name}</div>
                      <div className="text-xs text-gray-500">Created {formatDate(apiKey.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{apiKey.key_prefix}...</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {apiKey.scopes.map(scope => (
                          <span key={scope} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            scope === 'admin' ? 'bg-red-50 text-red-700' :
                            scope === 'write' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(apiKey)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {apiKey.expires_at ? formatDate(apiKey.expires_at) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {apiKey.is_active && (
                          <button
                            onClick={() => handleRevoke(apiKey.id)}
                            className="text-orange-600 hover:text-orange-800 transition-colors"
                            title="Revoke key"
                          >
                            <BanIcon />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(apiKey.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete key permanently"
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

      {/* Create Modal / Key Display */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {newPlaintextKey ? 'API Key Created' : 'Create API Key'}
              </h2>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {newPlaintextKey ? (
              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Copy your API key now</p>
                  <p className="text-xs text-yellow-600">This key will not be shown again. Store it securely.</p>
                </div>

                <div className="relative">
                  <code className="block w-full p-3 bg-gray-900 text-green-400 rounded-lg text-sm font-mono break-all select-all">
                    {newPlaintextKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newPlaintextKey)}
                    className="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors flex items-center space-x-1"
                  >
                    {copied ? (
                      <>
                        <CheckIcon />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    Use this key in the <code className="font-mono bg-blue-100 px-1 rounded">X-API-Key</code> header when making API requests.
                  </p>
                </div>

                <button
                  onClick={closeCreateModal}
                  className="w-full py-2 px-4 bg-p3-cyan text-p3-navy-darkest rounded-lg font-bold hover:bg-p3-cyan-dark shadow-md transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Key Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                    placeholder="e.g. n8n Integration Key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Scopes</label>
                  <div className="space-y-2">
                    {SCOPE_OPTIONS.map(scope => (
                      <label key={scope.value} className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={form.scopes.includes(scope.value)}
                          onChange={() => toggleScope(scope.value)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 mt-0.5"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">{scope.label}</span>
                          <p className="text-xs text-gray-500">{scope.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Expiration</label>
                  <select
                    value={form.expiresInDays ?? 'never'}
                    onChange={e => setForm({ ...form, expiresInDays: e.target.value === 'never' ? null : Number(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                  >
                    {EXPIRATION_OPTIONS.map(opt => (
                      <option key={String(opt.value)} value={opt.value ?? 'never'}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 px-4 bg-p3-cyan text-p3-navy-darkest rounded-lg font-bold hover:bg-p3-cyan-dark disabled:opacity-50 shadow-md transition-all"
                  >
                    {saving ? 'Creating...' : 'Create Key'}
                  </button>
                </div>
              </form>
            )}
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

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}
