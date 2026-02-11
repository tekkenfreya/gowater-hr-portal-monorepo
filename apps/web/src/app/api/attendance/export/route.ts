import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getAttendanceService } from '@/lib/attendance';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { formatPhilippineTime } from '@/lib/timezone';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const authService = getAuthService();
  return await authService.verifyToken(token);
}

// Color theme based on gowater brand
const COLORS = {
  headerBg: '0066CC',      // Blue header
  headerText: 'FFFFFF',    // White text
  subHeaderBg: '0088FF',   // Lighter blue for sub-headers
  borderColor: '000000',   // Black borders
  alternateRow: 'F5F9FF',  // Light blue for alternating rows
  white: 'FFFFFF',
};

interface SubTask {
  id: string;
  title: string;
  status: string;
  notes?: string;
}

interface DbTask {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  sub_tasks?: string | SubTask[];
}

// Helper to get status tag for subtasks
function getStatusTag(status: string): string {
  switch (status) {
    case 'completed': return '[completed]';
    case 'in_progress': return '[in_progress]';
    case 'pending': return '[pending]';
    case 'cancel': return '[cancelled]';
    default: return '';
  }
}

/**
 * GET /api/attendance/export
 * Export user's attendance data as styled Excel file
 * Query params:
 * - startDate (required): YYYY-MM-DD
 * - endDate (required): YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Fetch attendance data
    const attendanceService = getAttendanceService();

    // Fetch all records in date range for export
    const allRecords = await attendanceService.getAllUsersAttendance({
      userId: user.id,
      startDate,
      endDate,
      limit: 100
    });

    // Fetch tasks for the user
    const database = getDb();
    const allTasks = await database.all('tasks', { user_id: user.id }) as DbTask[];

    // Create a map of tasks by date for quick lookup
    const tasksByDate: { [date: string]: string[] } = {};
    allTasks.forEach((task: DbTask) => {
      if (task.due_date) {
        const dateKey = task.due_date.split('T')[0]; // Get YYYY-MM-DD part
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }

        // Format task with subtasks
        let taskText = task.title;

        // Parse sub_tasks if it's a string
        let subTasks: SubTask[] = [];
        if (task.sub_tasks) {
          if (typeof task.sub_tasks === 'string') {
            try {
              subTasks = JSON.parse(task.sub_tasks);
            } catch {
              subTasks = [];
            }
          } else {
            subTasks = task.sub_tasks;
          }
        }

        // Add subtasks to the task text
        if (subTasks.length > 0) {
          const subTaskLines = subTasks.map((st, idx) => {
            return `${idx + 1}. ${st.title} ${getStatusTag(st.status)}`;
          });
          taskText += '\n' + subTaskLines.join('\n');
        }

        tasksByDate[dateKey].push(taskText);
      }
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GoWater System';
    workbook.created = new Date();

    // Create worksheet
    const worksheet = workbook.addWorksheet('Attendance', {
      views: [{ showGridLines: true }]
    });

    // Set initial column widths
    worksheet.columns = [
      { key: 'A', width: 14 },
      { key: 'B', width: 40 },
      { key: 'C', width: 12 },
      { key: 'D', width: 12 },
      { key: 'E', width: 12 },
      { key: 'F', width: 12 },
      { key: 'G', width: 12 },
      { key: 'H', width: 12 },
      { key: 'I', width: 45 },
      { key: 'J', width: 20 },
    ];

    // Try to add logo image
    try {
      const logoPath = path.join(process.cwd(), 'public', 'gowater new logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });

        const logoImage = workbook.addImage({
          base64: logoBase64,
          extension: 'png',
        });

        // Add logo to worksheet
        worksheet.addImage(logoImage, {
          tl: { col: 0, row: 0 },
          ext: { width: 80, height: 55 }
        });
      }
    } catch (logoError) {
      logger.warn('Could not add logo to Excel', logoError);
    }

    // Row 1: Name (logo on left, info on right)
    const nameRow = worksheet.addRow(['', `Name: ${user.name || 'N/A'}`]);
    nameRow.getCell(2).font = { bold: true, size: 11 };
    nameRow.height = 20;

    // Row 2: Position
    const posRow = worksheet.addRow(['', `Position: ${user.position || 'Software Developer / System Admin'}`]);
    posRow.getCell(2).font = { bold: true, size: 11 };
    posRow.height = 20;

    // Row 3: Department
    const deptRow = worksheet.addRow(['', `Department: ${user.department || 'Technical'}`]);
    deptRow.getCell(2).font = { bold: true, size: 11 };
    deptRow.height = 20;

    // Row 4: Total Hours (bold, big font)
    const totalHoursValue = allRecords.records.reduce((sum, record) => {
      return sum + (record.totalHours || 0);
    }, 0);
    const totalHoursRow = worksheet.addRow(['', `Total Hours: ${totalHoursValue.toFixed(2)} hrs`]);
    totalHoursRow.getCell(2).font = { bold: true, size: 16, color: { argb: '000000' } };
    totalHoursRow.getCell(2).alignment = { vertical: 'middle' };
    totalHoursRow.height = 60;

    // Row 5: Empty separator
    const separatorRow = worksheet.addRow([]);
    separatorRow.height = 10;

    // Row 5: Main header row - explicitly set each cell value
    const headerRow = worksheet.addRow([]);
    headerRow.getCell(1).value = 'DATE';
    headerRow.getCell(2).value = 'SITE SCHEDULE';
    headerRow.getCell(3).value = 'AM Time';
    headerRow.getCell(4).value = '';
    headerRow.getCell(5).value = 'PM Time';
    headerRow.getCell(6).value = '';
    headerRow.getCell(7).value = 'Overtime';
    headerRow.getCell(8).value = '';
    headerRow.getCell(9).value = 'TASK / PURPOSE';
    headerRow.getCell(10).value = 'REMARKS';

    // Style all 10 cells in header row
    for (let col = 1; col <= 10; col++) {
      const cell = headerRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg }
      };
      cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
        left: { style: 'thin', color: { argb: COLORS.borderColor } },
        right: { style: 'thin', color: { argb: COLORS.borderColor } },
      };
    }

    // Row 6: Sub-header row - explicitly set each cell value
    const subHeaderRow = worksheet.addRow([]);
    subHeaderRow.getCell(1).value = '';
    subHeaderRow.getCell(2).value = '';
    subHeaderRow.getCell(3).value = 'IN';
    subHeaderRow.getCell(4).value = 'OUT';
    subHeaderRow.getCell(5).value = 'IN';
    subHeaderRow.getCell(6).value = 'OUT';
    subHeaderRow.getCell(7).value = 'IN';
    subHeaderRow.getCell(8).value = 'OUT';
    subHeaderRow.getCell(9).value = '';
    subHeaderRow.getCell(10).value = '';

    // Style all 10 cells in sub-header row
    for (let col = 1; col <= 10; col++) {
      const cell = subHeaderRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.subHeaderBg }
      };
      cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
        left: { style: 'thin', color: { argb: COLORS.borderColor } },
        right: { style: 'thin', color: { argb: COLORS.borderColor } },
      };
    }

    // Merge cells for header (header is on row 6, sub-header on row 7)
    // AM Time spans columns C-D
    worksheet.mergeCells('C6:D6');
    // PM Time spans columns E-F
    worksheet.mergeCells('E6:F6');
    // Overtime spans columns G-H
    worksheet.mergeCells('G6:H6');
    // DATE vertical merge (rows 6-7)
    worksheet.mergeCells('A6:A7');
    // SITE SCHEDULE vertical merge (rows 6-7)
    worksheet.mergeCells('B6:B7');
    // TASK / PURPOSE vertical merge (rows 6-7)
    worksheet.mergeCells('I6:I7');
    // REMARKS vertical merge (rows 6-7)
    worksheet.mergeCells('J6:J7');

    // Helper function to format time in Philippine timezone
    const formatTime = (timeString?: string): string => {
      if (!timeString) return '';
      try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return '';
        return formatPhilippineTime(date);
      } catch {
        return '';
      }
    };

    // Add data rows
    // Column mapping (sequence-based, not time-based):
    // - AM IN = Check-in time (first clock in of the day)
    // - AM OUT = Break start time
    // - PM IN = Break end time
    // - PM OUT = Check-out time
    allRecords.records.forEach((record, index) => {
      const isAlternate = index % 2 === 1;

      // Get times based on sequence (not actual AM/PM)
      const amIn = formatTime(record.checkInTime);      // Check-in → AM IN
      const amOut = formatTime(record.breakStartTime);  // Break start → AM OUT
      const pmIn = formatTime(record.breakEndTime);     // Break end → PM IN
      const pmOut = formatTime(record.checkOutTime);    // Check-out → PM OUT

      // Format date as MM-DD-YYYY
      const dateObj = new Date(record.date);
      const formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}-${dateObj.getFullYear()}`;

      // Get tasks for this date
      const dateKey = record.date.split('T')[0]; // Ensure YYYY-MM-DD format
      const tasksForDate = tasksByDate[dateKey] || [];
      const taskText = tasksForDate.join('\n\n'); // Separate multiple tasks with double newline

      // Create data row - explicitly set each cell
      const dataRow = worksheet.addRow([]);
      dataRow.getCell(1).value = formattedDate;
      dataRow.getCell(2).value = record.workLocation || 'WFH';
      dataRow.getCell(3).value = amIn;
      dataRow.getCell(4).value = amOut;
      dataRow.getCell(5).value = pmIn;
      dataRow.getCell(6).value = pmOut;
      dataRow.getCell(7).value = ''; // Overtime IN
      dataRow.getCell(8).value = ''; // Overtime OUT
      dataRow.getCell(9).value = taskText || record.notes || ''; // TASK / PURPOSE
      dataRow.getCell(10).value = ''; // Remarks

      // Apply styles to ALL 10 cells in data row
      for (let col = 1; col <= 10; col++) {
        const cell = dataRow.getCell(col);
        cell.alignment = {
          horizontal: col === 9 ? 'left' : 'center',
          vertical: 'top',
          wrapText: col === 9
        };
        cell.border = {
          top: { style: 'thin', color: { argb: COLORS.borderColor } },
          bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
          left: { style: 'thin', color: { argb: COLORS.borderColor } },
          right: { style: 'thin', color: { argb: COLORS.borderColor } },
        };
        if (isAlternate) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.alternateRow }
          };
        }
      }
    });

    // Header/sub-header row heights (rows 6-7)
    worksheet.getRow(6).height = 25;
    worksheet.getRow(7).height = 20;

    // Auto-fit column widths based on content
    worksheet.columns.forEach((column, index) => {
      let maxLength = column.width || 10;

      // Check each row for this column's content length
      worksheet.eachRow((row) => {
        const cell = row.getCell(index + 1);
        const cellValue = cell.value?.toString() || '';
        // For multiline text, get the longest line
        const lines = cellValue.split('\n');
        const longestLine = Math.max(...lines.map(l => l.length));
        const cellLength = longestLine + 2; // Add padding

        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });

      // Set column width with min/max bounds
      column.width = Math.min(Math.max(maxLength, 10), 60);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set filename
    const filename = `Attendance-${user.name?.replace(/\s+/g, '_') || 'User'}-${startDate}-to-${endDate}.xlsx`;

    // Return Excel file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    logger.error('Export attendance error', error);
    return NextResponse.json(
      { error: 'Failed to export attendance data' },
      { status: 500 }
    );
  }
}
