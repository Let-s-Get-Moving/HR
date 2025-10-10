const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', 'Onboarding_Form_1759757641.xlsx');

console.log('📊 Analyzing Excel file for INACTIVE employees...\n');

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Parse with header at row 2
  const data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
  
  // Find ALL employees marked as "Inactive"
  const inactiveEmployees = data.filter(row => {
    const status = row['Status'];
    return status && status.toString().toLowerCase() === 'inactive';
  });
  
  console.log(`✅ Found ${inactiveEmployees.length} INACTIVE employees\n`);
  
  if (inactiveEmployees.length > 0) {
    console.log('🚪 All Inactive Employees (will be imported as Terminated):\n');
    inactiveEmployees.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp['First Name']} ${emp['Last Name']}`);
      console.log(`   Email: ${emp['Email Address']}`);
      console.log(`   Position: ${emp['Designation/Position']}`);
      console.log(`   Hire Date: ${emp['Date of Joining']}`);
      console.log(`   Last Day Worked: ${emp['Last Day Worked'] || 'Not specified'}`);
      console.log('');
    });
  } else {
    console.log('⚠️  No inactive employees found.');
  }
  
  console.log(`📊 Total to import: ${inactiveEmployees.length} employees`);
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
  console.error(error.stack);
}
