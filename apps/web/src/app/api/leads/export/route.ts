import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getLeadService } from '@/lib/leads';
import { logger } from '@/lib/logger';
import * as XLSX from 'xlsx-js-style';
import type { LeadType, Pipeline, Industry } from '@/types/leads';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

// App color theme (no need to convert, xlsx-js-style accepts hex)
const APP_COLORS = {
  titleBg: '107C10',        // Export button green
  primaryBg: '0078D4',      // Microsoft Blue for headers
  white: 'FFFFFF',          // White text
  headerText: '323130',     // Dark Text
  border: 'C8C6C4',         // Border Gray
  alternateRow: 'FAF9F8',   // Alternate Row Background
  subtitleText: '605E5C',   // Subtitle gray
};

/**
 * GET /api/leads/export
 * Export leads data to Excel format
 * Query params:
 * - category: 'lead' | 'event' | 'supplier' (optional, exports all if not specified)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as LeadType | null;
    const pipeline = searchParams.get('pipeline') as Pipeline | null;
    const industry = searchParams.get('industry') as Industry | null;

    const leadService = getLeadService();
    const leads = await leadService.getLeads({
      type: type || undefined,
      pipeline: pipeline || undefined,
      industry: industry || undefined,
    });

    if (leads.length === 0) {
      return NextResponse.json(
        { error: 'No data to export' },
        { status: 404 }
      );
    }

    // Determine columns based on category
    let worksheetData: Record<string, string | number>[] = [];

    if (type === 'lead') {
      // Lead-specific columns
      worksheetData = leads.map(lead => ({
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
    } else if (type === 'event') {
      // Event-specific columns
      worksheetData = leads.map(lead => ({
        'Event Name': lead.event_name || 'N/A',
        'Venue': lead.venue || 'N/A',
        'Event Start Date': lead.event_start_date ? new Date(lead.event_start_date).toLocaleDateString() : 'N/A',
        'Event End Date': lead.event_end_date ? new Date(lead.event_end_date).toLocaleDateString() : 'N/A',
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
    } else if (type === 'supplier') {
      // Supplier-specific columns
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
      // All categories - include category column and common fields
      worksheetData = leads.map(lead => {
        const baseData: Record<string, string | number> = {
          'Category': lead.type.charAt(0).toUpperCase() + lead.type.slice(1),
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

        // Add category-specific fields
        if (lead.type === 'lead') {
          return {
            ...baseData,
            'Company Name': lead.company_name || 'N/A',
            'Location': lead.location || 'N/A',
            'Lead Source': lead.lead_source || 'N/A',
            'Product Interest': lead.product || 'N/A',
          };
        } else if (lead.type === 'event') {
          return {
            ...baseData,
            'Event Name': lead.event_name || 'N/A',
            'Venue': lead.venue || 'N/A',
            'Event Start Date': lead.event_start_date ? new Date(lead.event_start_date).toLocaleDateString() : 'N/A',
            'Product Needed': lead.product || 'N/A',
          };
        } else if (lead.type === 'supplier') {
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

    const titleParts: string[] = [];
    if (pipeline) titleParts.push(pipeline.charAt(0).toUpperCase() + pipeline.slice(1));
    if (industry) titleParts.push(industry.charAt(0).toUpperCase() + industry.slice(1));
    if (type) titleParts.push(type.charAt(0).toUpperCase() + type.slice(1) + 's');
    const exportTitle = titleParts.length > 0 ? titleParts.join(' ') + ' Export' : 'All Leads Export';
    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheet manually for better control
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title row (row 1)
    XLSX.utils.sheet_add_aoa(worksheet, [[exportTitle]], { origin: 'A1' });

    // Add subtitle with date (row 2)
    XLSX.utils.sheet_add_aoa(worksheet, [[`Generated on ${exportDate}`]], { origin: 'A2' });

    // Add empty row (row 3)

    // Add headers (row 4)
    const headers = Object.keys(worksheetData[0] || {});
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A4' });

    // Add data starting from row 5
    XLSX.utils.sheet_add_json(worksheet, worksheetData, {
      origin: 'A5',
      skipHeader: true
    });

    // Apply styling
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // Style title (A1) - Large, bold, white text on green background
    if (!worksheet['A1']) worksheet['A1'] = { t: 's', v: exportTitle };
    worksheet['A1'].s = {
      font: {
        name: 'Segoe UI',
        sz: 20,
        bold: true,
        color: { rgb: APP_COLORS.white }
      },
      fill: {
        patternType: 'solid',
        fgColor: { rgb: APP_COLORS.titleBg }
      },
      alignment: {
        horizontal: 'left',
        vertical: 'center'
      }
    };

    // Style subtitle (A2) - Smaller text, gray
    if (!worksheet['A2']) worksheet['A2'] = { t: 's', v: `Generated on ${exportDate}` };
    worksheet['A2'].s = {
      font: {
        name: 'Segoe UI',
        sz: 10,
        color: { rgb: APP_COLORS.subtitleText }
      },
      alignment: {
        horizontal: 'left',
        vertical: 'center'
      }
    };

    // Style header row (row 4) - Bold, white text on blue background
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col });
      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = {
        font: {
          name: 'Segoe UI',
          sz: 12,
          bold: true,
          color: { rgb: APP_COLORS.white }
        },
        fill: {
          patternType: 'solid',
          fgColor: { rgb: APP_COLORS.primaryBg }
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        },
        border: {
          top: { style: 'thin', color: { rgb: APP_COLORS.border } },
          bottom: { style: 'thin', color: { rgb: APP_COLORS.border } },
          left: { style: 'thin', color: { rgb: APP_COLORS.border } },
          right: { style: 'thin', color: { rgb: APP_COLORS.border } }
        }
      };
    }

    // Style data rows (starting from row 5)
    for (let row = 4; row <= range.e.r; row++) {
      const isAlternateRow = (row - 4) % 2 === 1;

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = {
          font: {
            name: 'Segoe UI',
            sz: 10,
            color: { rgb: APP_COLORS.headerText }
          },
          fill: {
            patternType: 'solid',
            fgColor: { rgb: isAlternateRow ? APP_COLORS.alternateRow : APP_COLORS.white }
          },
          alignment: {
            horizontal: 'left',
            vertical: 'center',
            wrapText: false
          },
          border: {
            top: { style: 'thin', color: { rgb: APP_COLORS.border } },
            bottom: { style: 'thin', color: { rgb: APP_COLORS.border } },
            left: { style: 'thin', color: { rgb: APP_COLORS.border } },
            right: { style: 'thin', color: { rgb: APP_COLORS.border } }
          }
        };
      }
    }

    // Set column widths
    const maxWidths: { [key: number]: number } = {};

    // Calculate widths based on content
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 10; // minimum width

      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = String(cell.v).length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      }

      maxWidths[col] = Math.min(maxWidth + 2, 50); // Add padding, max 50
    }

    worksheet['!cols'] = Object.values(maxWidths).map(w => ({ wch: w }));

    // Set row heights
    worksheet['!rows'] = [
      { hpt: 35 }, // Title row - taller for big bold text
      { hpt: 18 }, // Subtitle row
      { hpt: 10 }, // Empty row
      { hpt: 28 }, // Header row - taller for bold headers
    ];

    const sheetName = type ? type.charAt(0).toUpperCase() + type.slice(1) + 's' : 'All Data';

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file buffer with styling
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    // Set filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filenameParts: string[] = [];
    if (pipeline) filenameParts.push(pipeline);
    if (industry) filenameParts.push(industry);
    if (type) filenameParts.push(type + 's');
    const filename = (filenameParts.length > 0 ? filenameParts.join('-') : 'all-leads') + `-export-${timestamp}.xlsx`;

    // Return Excel file response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    logger.error('Export leads error', error);
    return NextResponse.json(
      { error: 'Failed to export leads data' },
      { status: 500 }
    );
  }
}
