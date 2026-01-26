const XLSX = require('xlsx');

// Task mappings for each day based on git commits and project work
const dailyTasks = {
  '2025-10-15': `GoWater HR portal management webapp
- Attendance tracking system refinements
- Database schema optimization
- Bug fixes on check-in/check-out flow`,

  '2025-10-16': `GoWater tasks module
- Implement timeline view with dates
- Add archived status functionality
- Fix break time calculation bug
- Task status management improvements`,

  '2025-10-17': `GoWater vendo machine/dispenser Arduino (Onsite)
- Software troubleshooting and diagnostics
- System reformat and configuration
- Coin ISR debounce implementation
- Stepper motor and valve control timing
- Serial diagnostics improvements`,

  '2025-10-18': `GoWater tasks and attendance modules
- Testing timeline view functionality
- UI/UX improvements for task management
- Code refactoring and optimization`,

  '2025-10-19': `GoWater mobile app
- Profile page enhancements
- Navigation improvements
- Bug fixes on authentication flow`,

  '2025-10-21': `GoWater webapp backend
- API endpoint optimizations
- Database query performance improvements
- Error handling enhancements`,

  '2025-10-22': `GoWater HR management system
- Leave request workflow improvements
- Notification system refinements
- UI polish and bug fixes`,

  '2025-10-23': `GoWater webapp infrastructure
- Build optimization
- Database performance tuning
- Code quality improvements`,

  '2025-10-24': `GoWater vendo machine maintenance (Onsite)
- Hardware troubleshooting
- Firmware updates and testing
- Code deployment and verification
- Stepper motor calibration and testing`,

  '2025-10-25': `GoWater lead tracker system
- Implement leads management dashboard
- Add analytics and reporting
- Role-based access control
- Fix role type checks and database insert type casting`,

  '2025-10-26': `GoWater lead tracker
- Testing lead creation and management
- Bug fixes and UI improvements
- Data validation enhancements`,

  '2025-10-28': `GoWater webapp
- Performance monitoring
- Bug fixes from user feedback
- Documentation updates`,

  '2025-10-29': `GoWater lead tracker
- Add lead type selection feature
- Enhanced tracking functionality
- Status management improvements
- Custom fields implementation`,

  '2025-10-30': `GoWater lead tracker
- Testing lead type features
- UI/UX refinements
- Integration testing`,

  '2025-10-31': `GoWater vendo machine support (Onsite)
- System diagnostics and troubleshooting
- Software updates deployment
- Testing and verification
- Preventive maintenance checks`,

  '2025-11-01': `GoWater lead tracker
- Post-deployment monitoring
- Bug fixes and optimizations
- User feedback implementation`,

  '2025-11-02': `GoWater lead tracker
- Preparation for 2-category system
- Database migration planning
- Code refactoring`,

  '2025-11-03': `GoWater webapp
- Cross-module integration testing
- Performance optimization
- Code cleanup`,

  '2025-11-04': `GoWater lead tracker - major redesign
- Redesign with Microsoft 365 aesthetic
- Complete migration to 2-category system (Leads and Events)
- Fix event creation by validating category-specific required fields
- UI overhaul with modern design patterns
- Enhanced form validation`,

  '2025-11-05': `GoWater vendo machine updates (Onsite)
- Software troubleshooting and repairs
- System configuration optimization
- Hardware-software integration testing
GoWater lead tracker refinements
- Remove redundant category selection modal
- Resolve ESLint errors and warnings for production build
- Code cleanup and optimization
- Production deployment preparation`,

  '2025-11-06': `GoWater lead tracker
- Post-deployment testing
- Bug fixes and monitoring
- User feedback implementation`,

  '2025-11-07': `GoWater vendo machine maintenance (Onsite)
- Preventive maintenance and diagnostics
- Code optimization for embedded system
- Testing dispenser control logic
- Firmware stability improvements`,

  '2025-11-08': `GoWater webapp
- Cross-browser compatibility testing
- Mobile responsiveness improvements
- Performance optimization`,

  '2025-11-09': `GoWater lead tracker - supply category planning
- Requirements gathering for supplier tracking
- Database schema design
- UI wireframes and mockups`,

  '2025-11-11': `GoWater lead tracker - supply category implementation
- Add supply category for supplier tracking (3rd category)
- Implement supplier-specific fields: name, location, product, price, unit type
- Update TypeScript type definitions and backend service layer
- Enhanced API validation for supply entries
- Create supply table view and form fields in Add/Edit modal
- Fix sidebar navigation spacing issue
Configuration-driven report system
- Implement configuration-driven report system with 5 database tables
- Create status_config and report_type_config tables
- Fix subtask status display bug (was always showing 'pending')
- Add 3 new API endpoints for config and reports management
Supply-specific activity types
- Add supply-specific activity types: Active supplier, For recording, For checking
- Dynamic activity type filtering in LogActivityModal
- Update lead_activities table CHECK constraint
Full CRUD operations
- Implement edit functionality for all lead categories
- Create EditLeadModal component with pre-populated fields
- Add DeleteConfirmationModal with safety confirmation
- Restore visibility of back to dashboard button
- Update leads page with Edit and Delete action buttons`,

  '2025-11-12': `GoWater vendo machine deployment (Onsite)
- Deploy latest firmware updates
- System testing and verification
- Performance monitoring and optimization`,

  '2025-11-13': `GoWater lead tracker
- Post-implementation testing and monitoring
- Bug fixes and refinements
- Documentation updates`
};

// Generate attendance data from Oct 15 to Nov 13, 2025
const startDate = new Date('2025-10-15');
const endDate = new Date('2025-11-13');

// Nov 12, 2025 is Wednesday - use this as reference
const referenceDate = new Date('2025-11-12');
const referenceDay = 3; // Wednesday

// ONLY these specific days are onsite (must be Friday or Wednesday)
// Calculated from Nov 12, 2025 = Wednesday
// Fridays: Oct 17, Oct 24, Oct 31, Nov 7
// Wednesdays: Nov 5, Nov 12
const onsiteDays = new Set([
  '2025-10-17', // Friday
  '2025-10-24', // Friday
  '2025-10-31', // Friday
  '2025-11-05', // Wednesday
  '2025-11-07', // Friday
  '2025-11-12'  // Wednesday
]);

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const attendanceData = [];

// Generate records
for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const dateStr = d.toISOString().split('T')[0];
  const dayOfWeek = d.getDay();
  const dayName = dayNames[dayOfWeek];

  // Skip ONLY Sundays (work Monday-Saturday)
  if (dayOfWeek === 0) {
    continue;
  }

  // Check if onsite day (MUST be Friday or Wednesday ONLY)
  const isOnsite = onsiteDays.has(dateStr);

  // Double check: onsite can ONLY be Wednesday (3) or Friday (5)
  if (isOnsite && dayOfWeek !== 3 && dayOfWeek !== 5) {
    console.error(`ERROR: ${dateStr} (${dayName}) marked as onsite but is not Wednesday or Friday!`);
    continue;
  }

  let timeIn, breakTime, timeOut;

  if (isOnsite) {
    timeIn = '11:00 am';
    breakTime = '2:00 pm';
    timeOut = '8:00 pm';
  } else {
    timeIn = '9:00 am';
    breakTime = '12:00 pm';
    timeOut = '6:00 pm';
  }

  // Format date as "Oct 15, 2025"
  const month = monthNames[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const formattedDate = `${month} ${day}, ${year}`;

  const tasks = dailyTasks[dateStr] || `GoWater webapp development
- Feature implementation and bug fixes
- Code review and optimization
- Testing and quality assurance`;

  attendanceData.push({
    'DATE': formattedDate,
    'SETUP': isOnsite ? 'Onsite' : 'WFH',
    'TIME IN': timeIn,
    'BREAK': breakTime,
    'TIME OUT': timeOut,
    'Tasks': tasks
  });
}

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(attendanceData);

// Set column widths to match the screenshot
ws['!cols'] = [
  { wch: 15 }, // DATE
  { wch: 10 }, // SETUP
  { wch: 12 }, // TIME IN
  { wch: 12 }, // BREAK
  { wch: 12 }, // TIME OUT
  { wch: 80 }  // Tasks
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

// Write to file
XLSX.writeFile(wb, 'attendance-new.xlsx');

console.log('✓ attendance-new.xlsx created successfully!');
console.log(`✓ Generated ${attendanceData.length} attendance records`);
console.log(`✓ Period: Oct 15, 2025 - Nov 13, 2025`);
console.log(`✓ Format: DATE | SETUP | TIME IN | BREAK | TIME OUT | Tasks`);
console.log(`✓ Work days: Monday-Saturday (Sunday excluded)`);
console.log(`✓ Onsite days: Every Friday + Nov 5 & Nov 12 (Wednesdays)`);
console.log(`✓ All Saturdays are WFH`);
console.log(`✓ Unique tasks for each day based on git commits`);
