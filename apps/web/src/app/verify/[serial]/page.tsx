'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface VerifyResponse {
  found: boolean;
  status?: string;
  unitType?: string;
  modelName?: string;
  dispatchedAt?: string;
  message?: string;
  error?: string;
}

interface ServiceRequestForm {
  customerName: string;
  contactNumber: string;
  email: string;
  issueDescription: string;
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';

function formatUnitType(unitType: string): string {
  if (unitType === 'vending_machine') return 'Vending Machine';
  if (unitType === 'dispenser') return 'Dispenser';
  return unitType;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    registered: 'bg-gray-100 text-gray-800',
    dispatched: 'bg-blue-100 text-blue-800',
    verified: 'bg-green-100 text-green-800',
    decommissioned: 'bg-red-100 text-red-800',
  };

  const colors = colorMap[status] ?? 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium capitalize ${colors}`}>
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="mt-4 text-sm text-gray-500">Verifying unit...</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
      <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function XIcon() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
      <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

function WarningIcon() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
      <svg className="h-12 w-12 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    </div>
  );
}

function WhatsAppButton({ serial }: { serial: string }) {
  const message = encodeURIComponent(`Hi GoWater, I need assistance with unit ${serial}.`);
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-base font-semibold text-white shadow transition-colors hover:bg-[#1ebe57]"
    >
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      Chat on WhatsApp
    </a>
  );
}

export default function VerifyPage() {
  const params = useParams();
  const serial = typeof params.serial === 'string' ? params.serial : '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const [form, setForm] = useState<ServiceRequestForm>({
    customerName: '',
    contactNumber: '',
    email: '',
    issueDescription: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!serial) return;

    async function fetchVerification() {
      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(serial)}`);
        if (!res.ok) {
          setFetchError(true);
          return;
        }
        const json: VerifyResponse = await res.json();
        setData(json);
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchVerification();
  }, [serial]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');
      setSubmitting(true);

      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(serial)}/service-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: form.customerName,
            contactNumber: form.contactNumber,
            email: form.email || undefined,
            issueDescription: form.issueDescription,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const message = (json as { error?: string } | null)?.error ?? 'Something went wrong. Please try again.';
          setSubmitError(message);
          return;
        }

        setSubmitted(true);
        setForm({ customerName: '', contactNumber: '', email: '', issueDescription: '' });
      } catch {
        setSubmitError('Network error. Please check your connection and try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [serial, form]
  );

  const isGenuine = data?.found && data.status !== 'decommissioned';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-4 py-8">
        {/* Branding */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">GoWater</h1>
          <p className="mt-1 text-sm text-gray-500">Unit Verification</p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          {loading ? (
            <Spinner />
          ) : fetchError ? (
            <div className="py-10 text-center">
              <XIcon />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Verification Error</h2>
              <p className="mt-2 text-sm text-gray-600">
                Something went wrong while verifying this unit. Please try again later.
              </p>
            </div>
          ) : !data?.found ? (
            <div className="py-10 text-center">
              <XIcon />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Unit Not Registered</h2>
              <p className="mt-2 text-sm text-gray-600">
                This unit is not in our system. If you believe this is an error, please contact us.
              </p>
            </div>
          ) : data.status === 'decommissioned' ? (
            <div className="py-10 text-center">
              <WarningIcon />
              <h2 className="mt-4 text-xl font-semibold text-orange-700">Unit Retired</h2>
              <p className="mt-2 text-sm text-gray-600">
                This unit has been decommissioned and is no longer in service.
              </p>
              {data.unitType && (
                <div className="mt-4 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{formatUnitType(data.unitType)}</span>
                  {data.modelName && <span> &middot; {data.modelName}</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <CheckIcon />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Verified GoWater Unit</h2>
              <p className="mt-2 text-sm text-gray-500">This is a genuine, registered unit.</p>

              {/* Unit Details */}
              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Type</dt>
                    <dd className="font-medium text-gray-900">{data.unitType ? formatUnitType(data.unitType) : '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Model</dt>
                    <dd className="font-medium text-gray-900">{data.modelName ?? '-'}</dd>
                  </div>
                  {data.dispatchedAt && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Dispatched</dt>
                      <dd className="font-medium text-gray-900">{formatDate(data.dispatchedAt)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Status</dt>
                    <dd><StatusBadge status={data.status ?? 'unknown'} /></dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Service Request Form — only for genuine units */}
        {!loading && !fetchError && isGenuine && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Need Service?</h3>
            <p className="mt-1 text-sm text-gray-500">
              Submit a service request and we&apos;ll get back to you.
            </p>

            {submitted ? (
              <div className="mt-4 rounded-lg bg-green-50 p-4 text-center">
                <svg className="mx-auto h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-green-800">
                  Your request has been submitted. We&apos;ll contact you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-3 text-sm font-medium text-green-700 underline hover:text-green-900"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    name="customerName"
                    required
                    value={form.customerName}
                    onChange={handleInputChange}
                    placeholder="Your full name"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="contactNumber"
                    name="contactNumber"
                    required
                    value={form.contactNumber}
                    onChange={handleInputChange}
                    placeholder="09XX XXX XXXX"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email <span className="text-xs text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="you@example.com"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="issueDescription" className="block text-sm font-medium text-gray-700">
                    Issue Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="issueDescription"
                    name="issueDescription"
                    required
                    rows={4}
                    value={form.issueDescription}
                    onChange={handleInputChange}
                    placeholder="Describe the issue you're experiencing..."
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-red-600">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* WhatsApp Button — for genuine units */}
        {!loading && !fetchError && isGenuine && WHATSAPP_NUMBER && (
          <div className="mt-4">
            <WhatsAppButton serial={serial} />
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>&copy; {new Date().getFullYear()} GoWater. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
