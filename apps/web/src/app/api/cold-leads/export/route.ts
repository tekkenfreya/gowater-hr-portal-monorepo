import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getColdLeadService } from '@/lib/coldLeads';
import { logger } from '@/lib/logger';
import * as XLSX from 'xlsx-js-style';
import type { LeadCategory } from '@/types/leads';
import { leadCategorySchema } from '@/lib/validation/schemas';
import type { JWTPayload } from '@/lib/authHelper';

const VALID_CATEGORIES: LeadCategory[] = ['lead', 'event', 'supplier'];

function getTokenFromRequest(request: NextRequest): string | null {
  let token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  return token || null;
}

const APP_COLORS = {
  titleBg: '107C10',
  primaryBg: '0078D4',
  white: 'FFFFFF',
  headerText: '323130',
  border: 'C8C6C4',
  alternateRow: 'FAF9F8',
  subtitleText: '605E5C',
};

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const searchParams = request.nextUrl.searchParams;
    const categoryParam = searchParams.get('category');

    let category: LeadCategory | null = null;
    if (categoryParam) {
      const parsed = leadCategorySchema.safeParse(categoryParam);
      if (!parsed.success) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      category = parsed.data;
    }

    const coldLeadService = getColdLeadService();
    const leads = category
      ? await coldLeadService.getLeadsByCategory(category)
      : await coldLeadService.getAllLeads();

    if (leads.length === 0) {
      return NextResponse.json(
        { error: 'No data to export' },
        { status: 404 }
      );
    }

    let worksheetData: Record<string, string | number>[] = [];

    if (category === 'lead') {
      worksheetData = leads.map(lead => ({
        'Date of Interaction': lead.date_of_interaction ? new Date(lead.date_of_interaction).toLocaleDateString() : 'N/A',
        'Type': lead.lead_type || 'N/A',
        'Company/Organization Name': lead.company_name || 'N/A',
        '# Beneficiary': lead.number_of_beneficiary || 'N/A',
        'Location': lead.location || 'N/A',
        'Contact Person': lead.contact_person || 'N/A',
        'Mobile Number': lead.mobile_number || 'N/A',
        'Email Address': lead.email_address || 'N/A',
        'Lead Source': lead.lead_source || 'N/A',
        'Product Interest': lead.product || 'N/A',
        'Status': lead.status,
        'Assigned To': lead.assigned_to || 'Unassigned',
        'Disposition': lead.disposition || '-',
        'Remarks': lead.remarks || '',
        'Created By': lead.created_by,
        'Created At': new Date(lead.created_at).toLocaleString(),
      }));
    } else if (category === 'event') {
      worksheetData = leads.map(lead => ({
        'Event Name': lead.event_name || 'N/A',
        'Venue': lead.venue || 'N/A',
        'Event Date': lead.event_date ? new Date(lead.event_date).toLocaleDateString() : 'N/A',
        'Event Time': lead.event_time || 'N/A',
        'Number of Attendees': lead.number_of_attendees || 'N/A',
        'Contact Person': lead.contact_person || 'N/A',
        'Mobile Number': lead.mobile_number || 'N/A',
        'Email Address': lead.email_address || 'N/A',
        'Product Needed': lead.product || 'N/A',
        'Status': lead.status,
        'Assigned To': lead.assigned_to || 'Unassigned',
        'Disposition': lead.disposition || '-',
        'Remarks': lead.remarks || '',
        'Created By': lead.created_by,
        'Created At': new Date(lead.created_at).toLocaleString(),
      }));
    } else if (category === 'supplier') {
      worksheetData = leads.map(lead => ({
        'Supplier Name': lead.supplier_name || 'N/A',
        'Location': lead.supplier_location || 'N/A',
        'Product': lead.supplier_product || 'N/A',
        'Price': lead.price || 'N/A',
        'Unit Type': lead.unit_type || 'N/A',
        'Contact Person': lead.contact_person || 'N/A',
        'Mobile Number': lead.mobile_number || 'N/A',
        'Email Address': lead.email_address || 'N/A',
        'Status': lead.status,
        'Assigned To': lead.assigned_to || 'Unassigned',
        'Disposition': lead.disposition || '-',
        'Remarks': lead.remarks || '',
        'Created By': lead.created_by,
        'Created At': new Date(lead.created_at).toLocaleString(),
      }));
    } else {
      worksheetData = leads.map(lead => {
        const baseData: Record<string, string | number> = {
          'Category': lead.category.charAt(0).toUpperCase() + lead.category.slice(1),
          'Status': lead.status,
          'Assigned To': lead.assigned_to || 'Unassigned',
          'Contact Person': lead.contact_person || 'N/A',
          'Mobile Number': lead.mobile_number || 'N/A',
          'Email Address': lead.email_address || 'N/A',
          'Disposition': lead.disposition || '-',
          'Remarks': lead.remarks || '',
          'Created By': lead.created_by,
          'Created At': new Date(lead.created_at).toLocaleString(),
        };

        if (lead.category === 'lead') {
          return {
            ...baseData,
            'Company Name': lead.company_name || 'N/A',
            'Location': lead.location || 'N/A',
            'Lead Source': lead.lead_source || 'N/A',
            'Product Interest': lead.product || 'N/A',
          };
        } else if (lead.category === 'event') {
          return {
            ...baseData,
            'Event Name': lead.event_name || 'N/A',
            'Venue': lead.venue || 'N/A',
            'Event Date': lead.event_date ? new Date(lead.event_date).toLocaleDateString() : 'N/A',
            'Product Needed': lead.product || 'N/A',
          };
        } else if (lead.category === 'supplier') {
          return {
            ...baseData,
            'Supplier Name': lead.supplier_name || 'N/A',
            'Location': lead.supplier_location || 'N/A',
            'Product': lead.supplier_product || 'N/A',
            'Price': lead.price || 'N/A',
          };
        }
        return baseData;
      });
    }

    const exportTitle = category
      ? `Cold ${category.charAt(0).toUpperCase() + category.slice(1)}s Export`
      : 'All Cold Leads Export';
    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    XLSX.utils.sheet_add_aoa(worksheet, [[exportTitle]], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Generated on ${exportDate}`]], { origin: 'A2' });

    const headers = Object.keys(worksheetData[0] || {});
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A4' });

    XLSX.utils.sheet_add_json(worksheet, worksheetData, {
      origin: 'A5',
      skipHeader: true
    });

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    if (!worksheet['A1']) worksheet['A1'] = { t: 's', v: exportTitle };
    worksheet['A1'].s = {
      font: { name: 'Segoe UI', sz: 20, bold: true, color: { rgb: APP_COLORS.white } },
      fill: { patternType: 'solid', fgColor: { rgb: APP_COLORS.titleBg } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    if (!worksheet['A2']) worksheet['A2'] = { t: 's', v: `Generated on ${exportDate}` };
    worksheet['A2'].s = {
      font: { name: 'Segoe UI', sz: 10, color: { rgb: APP_COLORS.subtitleText } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col });
      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = {
        font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: APP_COLORS.white } },
        fill: { patternType: 'solid', fgColor: { rgb: APP_COLORS.primaryBg } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: APP_COLORS.border } },
          bottom: { style: 'thin', color: { rgb: APP_COLORS.border } },
          left: { style: 'thin', color: { rgb: APP_COLORS.border } },
          right: { style: 'thin', color: { rgb: APP_COLORS.border } }
        }
      };
    }

    for (let row = 4; row <= range.e.r; row++) {
      const isAlternateRow = (row - 4) % 2 === 1;

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = {
          font: { name: 'Segoe UI', sz: 10, color: { rgb: APP_COLORS.headerText } },
          fill: { patternType: 'solid', fgColor: { rgb: isAlternateRow ? APP_COLORS.alternateRow : APP_COLORS.white } },
          alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
          border: {
            top: { style: 'thin', color: { rgb: APP_COLORS.border } },
            bottom: { style: 'thin', color: { rgb: APP_COLORS.border } },
            left: { style: 'thin', color: { rgb: APP_COLORS.border } },
            right: { style: 'thin', color: { rgb: APP_COLORS.border } }
          }
        };
      }
    }

    const maxWidths: { [key: number]: number } = {};
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 10;
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = String(cell.v).length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      }
      maxWidths[col] = Math.min(maxWidth + 2, 50);
    }

    worksheet['!cols'] = Object.values(maxWidths).map(w => ({ wch: w }));
    worksheet['!rows'] = [
      { hpt: 35 },
      { hpt: 18 },
      { hpt: 10 },
      { hpt: 28 },
    ];

    const sheetName = category
      ? 'Cold ' + category.charAt(0).toUpperCase() + category.slice(1) + 's'
      : 'All Cold Leads';

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = category
      ? `cold-${category}s-export-${timestamp}.xlsx`
      : `all-cold-leads-export-${timestamp}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    logger.error('Export cold leads error', error);
    return NextResponse.json(
      { error: 'Failed to export cold leads data' },
      { status: 500 }
    );
  }
}
