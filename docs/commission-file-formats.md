# Commission Draft File Format Requirements

## Overview
The new Commission Drafts system requires **3 files** to be uploaded together:
1. **Sales Person Performance** (performance metrics)
2. **Sales Commission Summary** (invoiced amounts)
3. **Lead Status by Service Date** (job details for adjustments)

All files can be in **CSV** or **XLSX** format.

---

## File 1: Sales Person Performance

### Required Columns (in order):
1. `Name` - Sales agent name
2. `# Leads Received` - Total leads assigned
3. `Bad` - Number of bad leads
4. `% Bad` - Percentage of bad leads
5. `Sent` - Number of quotes sent
6. `% Sent` - Percentage sent
7. `Pending` - Number pending
8. `% Pending` - Percentage pending
9. `Booked` - Number of booked jobs
10. `% Booked` - **Booking percentage** (used for commission calculation)

### Example:
```csv
Name,# Leads Received,Bad,% Bad,Sent,% Sent,Pending,% Pending,Booked,% Booked
John Smith,100,5,5.0,60,60.0,15,15.0,20,20.0
Jane Doe,85,3,3.5,50,58.8,10,11.8,22,25.9
```

### Notes:
- The `% Booked` column is critical for commission tier calculation
- Empty rows are skipped
- Name matching is fuzzy (handles variations like "John Smith" vs "Smith, John")

---

## File 2: Sales Commission Summary

### Required Columns (in order):
1. `Sales Person` - Sales agent name
2. `Total Estimated` - Total estimated revenue
3. `Invoiced (before taxes and tip)` - **Primary invoiced amount used for commission base**
4. `Total Invoiced (including taxes and tip)` - Total with taxes
5. `Commission Base` - Base amount for commission calculation
6. `Calculated Commissions` - Pre-calculated commission amount
7. `Lump Sums` - Additional lump sum payments
8. `Deductions` - Standard deductions
9. `Net Commissions` - Net commission after deductions

### Example:
```csv
Sales Person,Total Estimated,Invoiced (before taxes and tip),Total Invoiced (including taxes and tip),Commission Base,Calculated Commissions,Lump Sums,Deductions,Net Commissions
John Smith,50000.00,45000.00,48000.00,45000.00,4500.00,0.00,200.00,4300.00
Jane Doe,60000.00,55000.00,58000.00,55000.00,5500.00,500.00,150.00,5850.00
```

### Notes:
- **All currency columns must be numbers** (no dollar signs, just digits with optional decimals)
- The `Invoiced (before taxes and tip)` column is used as the base for commission calculations
- Column header matching is flexible (handles slight variations)

---

## File 3: Lead Status by Service Date

### Required Columns:
1. `Quote #` - SmartMoving quote number (e.g., 47114, 47115)
2. `Branch Name` - Branch location (used for USD→CAD conversion)
3. `Status` - Lead status (only "Closed" jobs are processed)
4. `Lead Status` - Detailed status with split instructions
5. `Service Type` - Type of service

### Optional Columns (for revenue adjustments):
- Any column with "split with" or "40% split" in the Lead Status triggers revenue adjustments
- Example: "40% split with John Doe" → 40% of job revenue goes to John Doe
- Example: "Split with Jane Smith" → 50% default split

### Example:
```csv
Quote #,Branch Name,Status,Lead Status,Service Type
47114,Vancouver,Closed,Won - Completed,Local Move
47115,Seattle,Closed,40% split with John Smith,Long Distance
47116,Vancouver,Closed,Split with Jane Doe,Storage
47117,Seattle,Open,Pending Quote,Packing
```

### Notes:
- **Only "Closed" status jobs** are included in commission calculations
- Quote # is used to fetch subtotals from SmartMoving API
- US branches (Seattle, etc.) have amounts converted from USD→CAD at 1.25 rate
- Split directives in "Lead Status" column automatically create revenue add-ons/deductions

---

## Import Process

1. **Upload all 3 files** + select period start/end dates
2. Files are **validated** for required columns
3. Data is imported into **staging tables**
4. A **draft commission** is created with:
   - Basic fields populated immediately (hourly rate, booking %, invoiced)
   - Revenue-dependent fields set to `NULL` (will show "Gathering data...")
5. **Background process** fetches SmartMoving data job-by-job:
   - Retrieves subtotal for each Quote #
   - Calculates revenue add-ons (40% splits, etc.)
   - Calculates revenue deductions (mirrored splits)
   - Updates commission percentages and earned amounts
6. Once complete, **manual fields** become editable:
   - Spiff Bonus
   - Revenue Bonus
   - Booking Bonuses/Deductions
   - Hourly Paid Out
   - Various deduction fields
7. **Finalize** button locks the commission for payroll processing

---

## Troubleshooting

### "Failed to import [File Name] file"
- Check that all required columns are present with exact names (case-insensitive matching is supported)
- Ensure currency values have no dollar signs, commas, or other formatting
- Verify the file is .csv or .xlsx format (not .xls)
- Check for blank header rows or malformed data

### "Missing required columns"
- Error message will list which columns are missing
- Column names can vary slightly (e.g., "Salesperson" vs "Sales Person")
- Ensure the header row is the first row of data

### Revenue fields stuck on "Gathering data..."
- Check that SmartMoving API credentials are configured in Render environment variables:
  - `SMARTMOVING_API_KEY`
  - `SMARTMOVING_CLIENT_ID`
- Verify Quote # values are valid SmartMoving quote numbers
- Check backend logs for API errors

### Agent/Manager name not matching
- The system uses fuzzy name matching with normalization
- "John Smith", "Smith, John", and "JOHN SMITH" all match
- If names still don't match, check for typos or extra whitespace
- Names are matched using the `normalizeNameKey()` function

---

## CSV vs XLSX
Both formats are fully supported. The system automatically detects the file type and parses accordingly.

- **CSV**: Faster, smaller file size, but must use proper UTF-8 encoding
- **XLSX**: Supports multiple sheets (first sheet is used), better for complex formatting

## File Size Limits
Maximum upload size: **10 MB per file**
