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

interface RouteParams {
  params: Promise<{ id: string }>;
}

function buildLabelSvg(qrSvg: string, serialNumber: string, modelName: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
  <rect width="300" height="200" fill="white" rx="8" />
  <text x="150" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1a2332">GoWater</text>
  <line x1="40" y1="32" x2="260" y2="32" stroke="#e5e7eb" stroke-width="1" />
  <g transform="translate(90, 38)">
    ${qrSvg}
  </g>
  <text x="150" y="175" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#1a2332">${escapeXml(serialNumber)}</text>
  <text x="150" y="192" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">${escapeXml(modelName)}</text>
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

    const qrSvg = bwipjs.toSVG({
      bcid: 'qrcode',
      text: unit.serialNumber,
      scale: 4,
      padding: 0,
      eclevel: 'M',
    });

    const labelSvg = buildLabelSvg(qrSvg, unit.serialNumber, unit.modelName);

    return new NextResponse(labelSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    logger.error('Generate QR label API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
