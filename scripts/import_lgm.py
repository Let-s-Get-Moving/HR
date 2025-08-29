#!/usr/bin/env python3
import os
import re
import csv
import sys
import json
import math
from datetime import datetime, timedelta
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor


BASE_DIR = Path(os.environ.get('HR_BASE_DIR', '/Users/udishkolnik/HR'))
if not BASE_DIR.exists():
    BASE_DIR = Path.cwd()
CSV_DIR = BASE_DIR / 'LGM' / 'csv'

DB_DSN = os.environ.get('DATABASE_URL', 'postgresql://hr:hrpass@localhost:5432/hrcore')


def parse_date(value: str):
    if not value:
        return None
    v = value.strip()
    # Handle formats like '2023-05-22 00:00:00' or '2025-07-21'
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    # Try MM/DD/YYYY
    for fmt in ('%m/%d/%Y', '%m/%d/%y'):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    return None


def to_decimal(value: str):
    if value is None:
        return 0
    v = str(value).strip()
    if v == '':
        return 0
    # remove non-numeric except dot and minus
    v2 = re.sub(r'[^0-9\.-]', '', v)
    try:
        return float(v2) if v2 not in ('', '-', '.') else 0
    except Exception:
        return 0


def split_first_last(first: str, last: str, fallback_full: str = ''):
    first = (first or '').strip()
    last = (last or '').strip()
    if first or last:
        return first, last
    full = (fallback_full or '').strip()
    if not full:
        return '', ''
    if ',' in full:
        a, b = [p.strip() for p in full.split(',', 1)]
        return b, a
    parts = full.split()
    if len(parts) == 1:
        return parts[0], ''
    return parts[0], ' '.join(parts[1:])


class DB:
    def __init__(self, dsn: str):
        self.conn = psycopg2.connect(dsn)
        self.conn.autocommit = False

    def q(self, sql: str, params=None):
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or [])
            if cur.description:
                return cur.fetchall()
            return []

    def close(self):
        try:
            self.conn.commit()
        finally:
            self.conn.close()


def get_or_create_department(db: DB, name: str | None):
    if not name:
        return None
    name = name.strip()
    if not name:
        return None
    row = db.q('SELECT id FROM departments WHERE name=%s', [name])
    if row:
        return row[0]['id']
    db.q('INSERT INTO departments(name) VALUES (%s)', [name])
    row = db.q('SELECT id FROM departments WHERE name=%s', [name])
    return row[0]['id'] if row else None


def find_employee_by_email(db: DB, email: str | None):
    if not email:
        return None
    rows = db.q('SELECT id FROM employees WHERE lower(email)=lower(%s)', [email.strip()])
    return rows[0]['id'] if rows else None


def find_employee_by_name(db: DB, first: str, last: str):
    rows = db.q('SELECT id FROM employees WHERE lower(first_name)=lower(%s) AND lower(last_name)=lower(%s)', [first.strip(), last.strip()])
    return rows[0]['id'] if rows else None


def upsert_employee_from_onboarding(db: DB, rec: dict):
    dept_label = (rec.get('Name') or '').strip()  # section like HR/Operations/COO
    department_id = get_or_create_department(db, dept_label) if dept_label else None

    first, last = split_first_last(rec.get('First Name'), rec.get('Last Name'))

    email = (rec.get('Email Address') or '').strip()
    phone = (rec.get('Phone Number') or '').strip()
    role_title = (rec.get('Designation/Position') or '').strip()
    hire_date = parse_date(rec.get('Date of Joining') or '')
    term_date = parse_date(rec.get('Last Day Worked') or '')
    raw_status = (rec.get('Status') or 'Active').strip()
    rs = raw_status.lower()
    if rs in ('inactive', 'terminated', 'not active', 'left', 'resigned'):
        status = 'Terminated'
    elif rs in ('on leave', 'leave', 'loa'):
        status = 'On Leave'
    else:
        status = 'Active'

    # Default employment type if unknown
    employment_type = 'Full-time'

    existing_id = find_employee_by_email(db, email) or find_employee_by_name(db, first, last)
    if existing_id:
        db.q('''UPDATE employees SET phone=COALESCE(NULLIF(%s,''), phone), role_title=COALESCE(NULLIF(%s,''), role_title),
                 hire_date=COALESCE(%s, hire_date), termination_date=COALESCE(%s, termination_date),
                 department_id=COALESCE(%s, department_id), status=COALESCE(NULLIF(%s,''), status)
                 WHERE id=%s''', [phone, role_title, hire_date, term_date, department_id, status, existing_id])
        emp_id = existing_id
    else:
        row = db.q(
            '''INSERT INTO employees(first_name,last_name,email,phone,birth_date,hire_date,employment_type,department_id,role_title,status)
               VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id''',
            [first, last, email or f"{first}.{last}@unknown.local", phone, parse_date(rec.get('Date of Birth') or ''),
             hire_date or datetime.today().date(), employment_type, department_id, role_title, status]
        )
        emp_id = row[0]['id']

    # Address
    address = (rec.get('Full Address With Postal Code') or '').strip()
    if address:
        db.q('''INSERT INTO employee_addresses(employee_id, line1, effective_from, is_primary)
                VALUES (%s,%s,%s,TRUE)''', [emp_id, address, hire_date or datetime.today().date()])

    # Emergency contact
    ecn = (rec.get('Emergency Contact Name') or '').strip()
    ecp = (rec.get('Emergency Contact Phone Number') or '').strip()
    if ecn or ecp:
        db.q('''INSERT INTO employee_emergency_contacts(employee_id, contact_name, contact_phone, relationship, is_primary)
                VALUES (%s,%s,%s,%s,TRUE)''', [emp_id, ecn or None, ecp or None, None])

    # Bank account
    bank = (rec.get('Bank') or '').strip()
    transit = (rec.get('Transit Number') or '').strip()
    account = (rec.get('Account Number') or '').strip()
    if bank or transit or account:
        db.q('''INSERT INTO employee_bank_accounts(employee_id, bank_name, transit_number, account_number, effective_date, is_primary)
                VALUES (%s,%s,%s,%s,%s,TRUE)''', [emp_id, bank or None, transit or None, account or None, hire_date or datetime.today().date()])

    # Identifiers (SIN)
    sin = (rec.get('SIN (Social Insurance Number)') or rec.get('Sin number') or '').strip()
    sin_exp = parse_date(rec.get('SIN Expiry Date (Optional)') or '')
    if sin:
        # upsert unique per employee/type
        exists = db.q('SELECT id FROM employee_identifiers WHERE employee_id=%s AND id_type=%s', [emp_id, 'SIN'])
        if exists:
            db.q('UPDATE employee_identifiers SET id_value=%s, expires_on=%s WHERE id=%s', [sin, sin_exp, exists[0]['id']])
        else:
            db.q('INSERT INTO employee_identifiers(employee_id, id_type, id_value, expires_on) VALUES (%s,%s,%s,%s)', [emp_id, 'SIN', sin, sin_exp])

    # Documents from URLs
    def insert_doc(url: str | None, doc_type: str, notes: str | None = None):
        if not url or not url.strip():
            return
        file_name = url.split('/')[-1][:255]
        db.q('''INSERT INTO documents(employee_id, doc_type, file_name, file_url, signed)
                VALUES (%s,%s,%s,%s,%s)''', [emp_id, doc_type, file_name or doc_type, url.strip(), True if doc_type=='Contract' else False])

    insert_doc(rec.get('Signed Contract'), 'Contract')
    # Try classify status proof
    status_proof = rec.get('Status Proof-  study permit/work permit/PR/citizenship')
    if status_proof:
        insert_doc(status_proof, 'WorkPermit')
    void_cheque = rec.get('void cheque and direct deposit document')
    if void_cheque:
        insert_doc(void_cheque, 'Other', 'Void Cheque')

    # Status history
    if status:
        db.q('INSERT INTO employee_status_history(employee_id, status, status_date) VALUES (%s,%s,%s)', [emp_id, status, hire_date or datetime.today().date()])

    return emp_id


def import_onboarding(db: DB):
    path = CSV_DIR / 'Onboarding_Form_Incoming_responses_1755281021__onboarding_form.csv'
    if not path.exists():
        print(f"[onboarding] file not found: {path}")
        return
    with path.open() as f:
        rows = list(csv.reader(f))
    header_idx = None
    for i, r in enumerate(rows[:30]):
        if r and r[0].strip().lower() == 'name':
            header_idx = i
            break
    if header_idx is None:
        print('[onboarding] header not found')
        return
    cols = [c.strip() for c in rows[header_idx]]
    count = 0
    for r in rows[header_idx+1:]:
        if not any((v or '').strip() for v in r):
            continue
        rec = {cols[i]: (r[i].strip() if i < len(r) else '') for i in range(len(cols))}
        # skip rows without first/last and email
        if not (rec.get('First Name') or rec.get('Last Name') or rec.get('Email Address')):
            continue
        upsert_employee_from_onboarding(db, rec)
        count += 1
    print(f"[onboarding] processed {count} rows")
    
    # Import second onboarding file
    path2 = CSV_DIR / 'Onboarding_Form_(Responses)__Form_Responses_1.csv'
    if path2.exists():
        with path2.open() as f:
            reader = csv.DictReader(f)
            count2 = 0
            for row in reader:
                # Map fields to our structure
                rec = {
                    'First Name': '',
                    'Last Name': '',
                    'Email Address': row.get('Email Address', ''),
                    'Phone Number': row.get('Phone number', ''),
                    'Designation/Position': row.get('Position', ''),
                    'Date of Joining': row.get('Date of Joining', ''),
                    'Date of Birth': row.get('Date of Birth', ''),
                    'Full Address With Postal Code': row.get('Full Address with Postal Code', ''),
                    'Emergency Contact Name': row.get('Emergency Contact Name', ''),
                    'Emergency Contact Phone Number': row.get('Emergency Contact Phone Number', ''),
                    'SIN (Social Insurance Number)': row.get('SIN Number', ''),
                    'SIN Expiry Date (Optional)': row.get('SIN Expiry (MM/DD/YYYY)', ''),
                    'Bank': row.get('Bank', ''),
                    'Transit Number': row.get('Transit Number', ''),
                    'Account Number': row.get('Account Number', ''),
                    'Status': 'Active'
                }
                # Split full name
                full_name = row.get('First Name & Last Name', '')
                if full_name:
                    first, last = split_first_last('', '', full_name)
                    rec['First Name'] = first
                    rec['Last Name'] = last
                if rec['First Name'] or rec['Last Name'] or rec['Email Address']:
                    upsert_employee_from_onboarding(db, rec)
                    count2 += 1
        print(f"[onboarding2] processed {count2} rows")


MONTHS = {m.lower(): i for i, m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'], start=1)}


def parse_period_from_filename(path: Path):
    # Example: LGM_Payroll_2025__June_30_-_July_13.csv
    name = path.stem
    parts = name.split('__', 1)
    year = 2025
    period = parts[1] if len(parts) > 1 else name
    period = period.replace('_', ' ')
    # Try to extract "Month day - Month day"
    m = re.findall(r'([A-Za-z]+)\s+(\d{1,2})', period)
    if len(m) >= 2:
        (m1, d1), (m2, d2) = m[0], m[1]
        ms1 = MONTHS.get(m1.lower())
        ms2 = MONTHS.get(m2.lower())
        if ms1 and ms2:
            start_date = datetime(year, ms1, int(d1)).date()
            end_date = datetime(year, ms2, int(d2)).date()
            return period.strip(), start_date, end_date
    return period.strip(), None, None


def get_or_create_period(db: DB, name: str, start_date, end_date):
    row = db.q('SELECT id FROM payroll_periods WHERE period_name=%s', [name])
    if row:
        return row[0]['id']
    pay_date = (end_date or (start_date or datetime.today().date())) + timedelta(days=5)
    row = db.q('''INSERT INTO payroll_periods(period_name, start_date, end_date, pay_date, status)
                  VALUES (%s,%s,%s,%s,'Closed') RETURNING id''', [name, start_date, end_date, pay_date])
    return row[0]['id']


def upsert_payroll_for_file(db: DB, path: Path):
    period_name, start_date, end_date = parse_period_from_filename(path)
    period_id = get_or_create_period(db, period_name, start_date, end_date)
    with path.open() as f:
        reader = csv.reader(f)
        rows = list(reader)
    # find header row where first cell starts with NAME (not 'Unnamed')
    header_idx = None
    for i, r in enumerate(rows[:100]):
        c0 = (r[0] or '').strip().lower() if r else ''
        if c0.startswith('name'):
            header_idx = i
            break
    if header_idx is None:
        print(f"[payroll] header not found in {path.name}")
        return 0
    inserted = 0
    for r in rows[header_idx+1:]:
        if not any((c or '').strip() for c in r):
            continue
        name_cell = (r[0] or '').strip()
        # stop if we hit separator rows
        if name_cell.lower().startswith('total'):
            break
        if name_cell == '' and all(not (c or '').strip() for c in r[1:]):
            continue
        # Some rows are section separators (commas only)
        if name_cell == '' and any((c or '').strip() for c in r[1:3]):
            continue
        # Extract numbers by column index based on observed header
        rate = to_decimal(r[1] if len(r) > 1 else '')
        hours_biweekly = to_decimal(r[2] if len(r) > 2 else '')
        time_report_hours = to_decimal(r[3] if len(r) > 3 else '')
        payroll_hours = to_decimal(r[4] if len(r) > 4 else '')
        stat_hours = to_decimal(r[5] if len(r) > 5 else '')
        remaining_hours = to_decimal(r[6] if len(r) > 6 else '')
        after_hours_bonus = to_decimal(r[7] if len(r) > 7 else '')
        bonus = to_decimal(r[8] if len(r) > 8 else '')
        deduction = to_decimal(r[9] if len(r) > 9 else '')
        vacation_pay = to_decimal(r[12] if len(r) > 12 else '')

        # Parse employee first/last from name cell (may contain comments)
        clean_name = re.sub(r'\(.*?\)', '', name_cell).strip().strip(',')
        parts = clean_name.split()
        if not parts:
            continue
        first = parts[0]
        last = ' '.join(parts[1:]) if len(parts) > 1 else ''

        emp_id = find_employee_by_name(db, first, last)
        if not emp_id:
            # fallback: try title case
            emp_id = find_employee_by_name(db, first.title(), last.title())
        if not emp_id:
            # create minimal employee stub
            email = f"{first}.{last}@unknown.local".replace('..', '.')
            row = db.q('''INSERT INTO employees(first_name,last_name,email,hire_date,employment_type,status)
                          VALUES (%s,%s,%s,%s,'Full-time','Active') RETURNING id''',
                       [first, last, email, start_date or datetime.today().date()])
            emp_id = row[0]['id']

        # Compensation history upsert (by effective_date = start_date)
        if rate > 0:
            eff = start_date or datetime.today().date()
            exists = db.q('''SELECT id FROM employee_compensation WHERE employee_id=%s AND effective_date=%s''', [emp_id, eff])
            if exists:
                db.q('UPDATE employee_compensation SET regular_rate=%s, hours_biweekly=%s WHERE id=%s', [rate, hours_biweekly or None, exists[0]['id']])
            else:
                db.q('''INSERT INTO employee_compensation(employee_id,effective_date,rate_type,regular_rate,hours_biweekly)
                        VALUES (%s,%s,'Hourly',%s,%s)''', [emp_id, eff, rate, hours_biweekly or None])

        # Payroll calculation row
        base_hours = payroll_hours or time_report_hours
        total_bonus = after_hours_bonus + bonus + vacation_pay
        db.q('''INSERT INTO payroll_calculations(employee_id, period_id, base_hours, overtime_hours, regular_rate, commission_amount, bonus_amount, deductions, status)
                VALUES (%s,%s,%s,%s,%s,0,%s,%s,'Approved')''',
             [emp_id, period_id, base_hours or 0, 0, rate or 0, total_bonus or 0, deduction or 0])
        inserted += 1
    print(f"[payroll] {path.name}: inserted {inserted}")
    return inserted


def import_payroll(db: DB):
    count = 0
    for p in sorted(CSV_DIR.glob('LGM_Payroll_2025__*.csv')):
        count += upsert_payroll_for_file(db, p)
    print(f"[payroll] total rows inserted: {count}")


def import_timecards(db: DB):
    """Import all timecard files into time_entries"""
    total_inserted = 0
    for tc_file in CSV_DIR.glob('*Timecard*.csv'):
        if not tc_file.exists():
            continue
        print(f"[timecard] processing {tc_file.name}")
        with tc_file.open() as f:
            rows = [list(csv.reader([line]))[0] for line in f]
        
        # Extract employee name and period
        employee_name = ''
        period_info = ''
        for i in range(min(15, len(rows))):
            if rows[i] and rows[i][0].strip().lower().startswith('employee'):
                # Look for name in nearby rows
                for j in range(max(0, i-2), min(len(rows), i+3)):
                    if rows[j] and len(rows[j]) > 3 and rows[j][3].strip():
                        nm = rows[j][3].strip().strip('"').replace('\n', ' ')
                        if nm and not nm.lower().startswith('employee'):
                            employee_name = nm
                            break
            elif rows[i] and 'pay period' in (rows[i][0] or '').lower():
                period_info = rows[i][0].strip()
        
        if not employee_name:
            print(f"[timecard] could not find employee name in {tc_file.name}")
            continue
        
        # Find employee
        first, last = split_first_last('', '', employee_name)
        emp_id = find_employee_by_name(db, first, last) or find_employee_by_name(db, first.title(), last.title())
        if not emp_id:
            print(f"[timecard] employee not found: {employee_name}")
            continue
        
        inserted = 0
        for r in rows:
            if not r or len(r) < 3:
                continue
            d0 = r[0].strip().lower()
            if d0 not in ('mon','tue','wed','thu','fri','sat','sun'):
                continue
            
            date_str = r[1].strip()
            work_date = parse_date(date_str)
            if not work_date:
                continue
            
            # Parse clock in/out times
            def parse_time(t):
                if not t:
                    return None
                try:
                    return datetime.strptime(f"{work_date} {t}", '%Y-%m-%d %I:%M %p')
                except Exception:
                    return None
            
            # First shift
            cin = r[2].strip() or None
            cout = r[3].strip() if len(r) > 3 else None
            if work_date and cin and cout:
                db.q('''INSERT INTO time_entries(employee_id, work_date, clock_in, clock_out, was_late, left_early, overtime_hours)
                        VALUES (%s,%s,%s,%s,false,false,0)''', [emp_id, work_date, parse_time(cin), parse_time(cout)])
                inserted += 1
            
            # Second shift (if exists)
            if len(r) > 4 and r[4] and r[4].strip():
                cin2 = r[4].strip()
                cout2 = r[5].strip() if len(r) > 5 else None
                if work_date and cin2 and cout2:
                    db.q('''INSERT INTO time_entries(employee_id, work_date, clock_in, clock_out, was_late, left_early, overtime_hours)
                            VALUES (%s,%s,%s,%s,false,false,0)''', [emp_id, work_date, parse_time(cin2), parse_time(cout2)])
                    inserted += 1
        
        if inserted:
            print(f"[timecard] {tc_file.name}: inserted {inserted} entries for {employee_name}")
            total_inserted += inserted
    
    print(f"[timecard] total entries inserted: {total_inserted}")


def main():
    db = DB(DB_DSN)
    try:
        import_onboarding(db)
        import_payroll(db)
        # Import timecard data
        import_timecards(db)
        db.conn.commit()
        print('[done] import completed')
    except Exception as e:
        db.conn.rollback()
        print('[error]', e)
        raise
    finally:
        db.close()


if __name__ == '__main__':
    main()


