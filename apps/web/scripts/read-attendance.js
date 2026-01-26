const XLSX = require('xlsx');

// Read the existing attendance.xlsx file
const workbook = XLSX.readFile('attendance.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON to see the data
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== ATTENDANCE.XLSX STRUCTURE ===\n');
console.log('Sheet Name:', sheetName);
console.log('\nColumn Headers:');
console.log(data[0]);
console.log('\nFirst 10 rows of data:');
for (let i = 0; i < Math.min(10, data.length); i++) {
  console.log(`Row ${i}:`, JSON.stringify(data[i]));
}
console.log('\nLast 5 rows of data:');
for (let i = Math.max(0, data.length - 5); i < data.length; i++) {
  console.log(`Row ${i}:`, JSON.stringify(data[i]));
}
console.log('\nTotal rows:', data.length);
