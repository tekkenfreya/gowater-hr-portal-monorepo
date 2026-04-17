import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bwipjs = require('bwip-js') as {
  toSVG: (options: {
    bcid: string;
    text: string;
    scale: number;
    padding?: number;
    eclevel?: string;
    includetext?: boolean;
  }) => string;
};
import { authenticateRequest, isAdmin } from '@/lib/authHelper';
import { getUnitsService } from '@/lib/units';
import { logger } from '@/lib/logger';
import type { DispatchedUnit } from '@/types/units';

function formatUnitType(type: DispatchedUnit['unitType']): string {
  return type === 'vending_machine' ? 'Vending Machine' : 'Dispenser';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildQrPayload(unit: DispatchedUnit): string {
  return [
    'GoWater Unit',
    `Serial: ${unit.serialNumber}`,
    `Model: ${unit.modelName}`,
    `Type: ${formatUnitType(unit.unitType)}`,
    `Status: ${unit.status}`,
    `Destination: ${unit.destination || 'N/A'}`,
    `Dispatched: ${formatDate(unit.dispatchedAt)}`,
  ].join('\n');
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

function buildLabelSvg(qrSvg: string, serialNumber: string, modelName: string): string {
  // bwip-js returns a self-contained <svg> whose natural size depends on the QR
  // version (module count) and scale. Extract its viewBox and re-embed it inside
  // our own <svg> with fixed 100x100 dimensions so layout is predictable.
  const viewBoxMatch = qrSvg.match(/viewBox="([^"]+)"/);
  const qrViewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';
  const qrInner = qrSvg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
  <rect width="300" height="200" fill="white" rx="8" />
  <text x="150" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1a2332">GoWater</text>
  <line x1="40" y1="32" x2="260" y2="32" stroke="#e5e7eb" stroke-width="1" />
  <svg x="100" y="38" width="100" height="100" viewBox="${qrViewBox}" preserveAspectRatio="xMidYMid meet">
    ${qrInner}
  </svg>
  <text x="150" y="158" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#1a2332">${escapeXml(serialNumber)}</text>
  <text x="150" y="178" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">${escapeXml(modelName)}</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const unitId = parseInt(id, 10);
    if (isNaN(unitId)) {
      return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 });
    }

    const unitsService = getUnitsService();
    const unit = await unitsService.getUnitById(unitId);

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const qrText = buildQrPayload(unit);
    const qrSvg = bwipjs.toSVG({
      bcid: 'qrcode',
      text: qrText,
      scale: 4,
      padding: 0,
      eclevel: 'M',
    });

    const labelSvg = buildLabelSvg(qrSvg, unit.serialNumber, unit.modelName);

    return new NextResponse(labelSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Generate QR label API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
