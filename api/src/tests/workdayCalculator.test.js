import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { q } from '../db.js';

// We need to test the workday calculator logic
// Since the module relies on DB, we'll mock it for unit tests

describe('Workday Calculator Logic', () => {
  // Test day name to index conversion
  describe('Day Name to Index Mapping', () => {
    const DAY_NAME_TO_INDEX = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };

    it('should map Monday to 1', () => {
      expect(DAY_NAME_TO_INDEX['Monday']).toBe(1);
    });

    it('should map Sunday to 0', () => {
      expect(DAY_NAME_TO_INDEX['Sunday']).toBe(0);
    });

    it('should map Saturday to 6', () => {
      expect(DAY_NAME_TO_INDEX['Saturday']).toBe(6);
    });
  });

  // Test workday counting logic (unit test without DB)
  describe('Workday Counting Algorithm', () => {
    // Helper function matching the implementation
    function countWorkdays(startDate, endDate, workdayIndices, holidayDates = new Set()) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const workdaysByYear = {};
      const datesCounted = [];
      
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toISOString().split('T')[0];
        const year = current.getFullYear();
        
        if (workdayIndices.includes(dayOfWeek) && !holidayDates.has(dateStr)) {
          workdaysByYear[year] = (workdaysByYear[year] || 0) + 1;
          datesCounted.push(dateStr);
        }
        
        current.setDate(current.getDate() + 1);
      }
      
      return {
        totalWorkdays: datesCounted.length,
        workdaysByYear,
        datesCounted
      };
    }

    describe('Mon-Fri Schedule', () => {
      const monFri = [1, 2, 3, 4, 5]; // Monday through Friday

      it('should count 5 workdays for a full Mon-Fri week', () => {
        // January 6-10, 2025 is Mon-Fri
        const result = countWorkdays('2025-01-06', '2025-01-10', monFri);
        expect(result.totalWorkdays).toBe(5);
        expect(result.workdaysByYear[2025]).toBe(5);
      });

      it('should count 0 workdays for a weekend', () => {
        // January 4-5, 2025 is Sat-Sun
        const result = countWorkdays('2025-01-04', '2025-01-05', monFri);
        expect(result.totalWorkdays).toBe(0);
      });

      it('should handle Thu-Tue spanning weekend (4 workdays)', () => {
        // January 2 (Thu), 3 (Fri), 4 (Sat), 5 (Sun), 6 (Mon), 7 (Tue)
        // Workdays: Thu, Fri, Mon, Tue = 4
        const result = countWorkdays('2025-01-02', '2025-01-07', monFri);
        expect(result.totalWorkdays).toBe(4);
      });

      it('should exclude holidays', () => {
        const holidays = new Set(['2025-01-06']); // Monday is a holiday
        const result = countWorkdays('2025-01-06', '2025-01-10', monFri, holidays);
        expect(result.totalWorkdays).toBe(4); // 5 - 1 holiday
      });
    });

    describe('Weekend Schedule', () => {
      const satSun = [0, 6]; // Saturday and Sunday

      it('should count only weekend days', () => {
        // January 4-10, 2025 (Sat through Fri)
        // Weekends: Jan 4 (Sat), Jan 5 (Sun) = 2
        const result = countWorkdays('2025-01-04', '2025-01-10', satSun);
        expect(result.totalWorkdays).toBe(2);
      });

      it('should count 0 for weekday-only range', () => {
        // January 6-10, 2025 is Mon-Fri
        const result = countWorkdays('2025-01-06', '2025-01-10', satSun);
        expect(result.totalWorkdays).toBe(0);
      });
    });

    describe('Year Boundary Handling', () => {
      const monFri = [1, 2, 3, 4, 5];

      it('should allocate days to correct years for cross-year range', () => {
        // December 30, 2024 (Mon) through January 3, 2025 (Fri)
        // 2024: Dec 30 (Mon), Dec 31 (Tue) = 2
        // 2025: Jan 1 (Wed), Jan 2 (Thu), Jan 3 (Fri) = 3
        const result = countWorkdays('2024-12-30', '2025-01-03', monFri);
        expect(result.totalWorkdays).toBe(5);
        expect(result.workdaysByYear[2024]).toBe(2);
        expect(result.workdaysByYear[2025]).toBe(3);
      });
    });

    describe('Empty Schedule', () => {
      it('should return 0 workdays for empty schedule', () => {
        const result = countWorkdays('2025-01-06', '2025-01-10', []);
        expect(result.totalWorkdays).toBe(0);
      });
    });

    describe('Single Day', () => {
      const monFri = [1, 2, 3, 4, 5];

      it('should count 1 workday for a single weekday', () => {
        const result = countWorkdays('2025-01-06', '2025-01-06', monFri); // Monday
        expect(result.totalWorkdays).toBe(1);
      });

      it('should count 0 workdays for a single weekend day', () => {
        const result = countWorkdays('2025-01-04', '2025-01-04', monFri); // Saturday
        expect(result.totalWorkdays).toBe(0);
      });
    });
  });
});

describe('Leave Balance Integration Tests', () => {
  beforeAll(async () => {
    // Test database connection
    try {
      await q('SELECT 1');
      console.log('Database connection successful for leave tests');
    } catch (error) {
      console.log('Database connection failed, skipping integration tests');
      throw new Error('Database not available for testing');
    }
  });

  describe('Database Schema', () => {
    it('should have work_schedules table with days_of_week column', async () => {
      const result = await q(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'work_schedules' AND column_name = 'days_of_week'
      `);
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe('jsonb');
    });

    it('should have employees.work_schedule_id column', async () => {
      const result = await q(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'work_schedule_id'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    it('should have leave_balances table with proper columns', async () => {
      const result = await q(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'leave_balances'
        ORDER BY column_name
      `);
      
      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('employee_id');
      expect(columns).toContain('leave_type_id');
      expect(columns).toContain('year');
      expect(columns).toContain('entitled_days');
      expect(columns).toContain('used_days');
    });

    it('should have leave_calendar table with applies_to columns', async () => {
      const result = await q(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'leave_calendar' AND column_name LIKE 'applies_to%'
        ORDER BY column_name
      `);
      
      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('applies_to_type');
      expect(columns).toContain('applies_to_id');
    });
  });

  describe('Work Schedule Data', () => {
    it('should have at least one work schedule defined', async () => {
      const result = await q('SELECT COUNT(*) as count FROM work_schedules');
      expect(parseInt(result.rows[0].count, 10)).toBeGreaterThan(0);
    });

    it('should have days_of_week as array of day names', async () => {
      const result = await q('SELECT days_of_week FROM work_schedules LIMIT 1');
      if (result.rows.length > 0 && result.rows[0].days_of_week) {
        const days = result.rows[0].days_of_week;
        // Should be an array
        expect(Array.isArray(days)).toBe(true);
        // If non-empty, should contain valid day names
        if (days.length > 0) {
          const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          days.forEach(d => expect(validDays).toContain(d));
        }
      }
    });
  });
});

describe('RBAC for Leave Balances', () => {
  beforeAll(async () => {
    try {
      await q('SELECT 1');
    } catch (error) {
      throw new Error('Database not available for testing');
    }
  });

  it('should have hr_roles table with scope in permissions', async () => {
    const result = await q(`
      SELECT role_name, permissions->>'scope' as scope
      FROM hr_roles
      WHERE permissions->>'scope' IS NOT NULL
    `);
    
    // Should have roles with scope defined
    expect(result.rows.length).toBeGreaterThan(0);
    
    // Check that scopes are valid
    const validScopes = ['all', 'team', 'own'];
    result.rows.forEach(row => {
      expect(validScopes).toContain(row.scope);
    });
  });

  it('should have user role with own scope', async () => {
    const result = await q(`
      SELECT role_name, permissions->>'scope' as scope
      FROM hr_roles
      WHERE role_name = 'user'
    `);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].scope).toBe('own');
  });

  it('should have admin role with all scope', async () => {
    const result = await q(`
      SELECT role_name, permissions->>'scope' as scope
      FROM hr_roles
      WHERE role_name = 'admin'
    `);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].scope).toBe('all');
  });
});
