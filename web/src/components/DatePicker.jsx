import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format, isValid } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { formatYMD, parseLocalDate } from '../utils/timezone.js';
import 'react-day-picker/style.css';

/**
 * DatePicker - A Tahoe-styled single date picker component
 * 
 * Behavior:
 * - Click trigger to open popover calendar
 * - Selecting a date immediately updates the value and closes the popover
 * - Clear button resets the date
 * - Escape closes without changes
 * 
 * Uses a portal to render the popover at document.body level,
 * bypassing any stacking context issues from parent containers.
 * 
 * @param {Object} props
 * @param {string} props.valueYmd - Current date in YYYY-MM-DD format
 * @param {function} props.onChangeYmd - Callback when date changes: (ymd: string) => void
 * @param {function} props.onClear - Callback when Clear is clicked (optional)
 * @param {string} props.placeholder - Placeholder text when no date selected
 * @param {boolean} props.disabled - Disable the picker
 * @param {string} props.className - Additional CSS classes for the trigger button
 * @param {boolean} props.required - Whether the field is required (shows visual indicator)
 * @param {Date} props.minDate - Minimum selectable date (optional)
 * @param {Date} props.maxDate - Maximum selectable date (optional)
 */
export default function DatePicker({
  valueYmd = '',
  onChangeYmd,
  onClear,
  placeholder = 'Select date',
  disabled = false,
  className = '',
  required = false,
  minDate,
  maxDate,
  minYear = 1900,
  maxYear = new Date().getFullYear() + 20,
  yearStep = 10
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, minWidth: 280 });
  const [manualInput, setManualInput] = useState(valueYmd || '');
  const [inputError, setInputError] = useState('');
  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = valueYmd ? parseLocalDate(valueYmd) : null;
    return parsed && isValid(parsed) ? parsed : new Date();
  });
  const [yearJumpValue, setYearJumpValue] = useState(() => String(viewMonth.getFullYear()));
  
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Parse the YMD string to a Date object for DayPicker
  const selectedDate = valueYmd ? parseLocalDate(valueYmd) : undefined;

  useEffect(() => {
    setManualInput(valueYmd || '');
    setInputError('');
    const parsed = valueYmd ? parseLocalDate(valueYmd) : null;
    if (parsed && isValid(parsed)) {
      setViewMonth(parsed);
      setYearJumpValue(String(parsed.getFullYear()));
    }
  }, [valueYmd]);

  // Compute popover position based on trigger element
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 320; // approximate width for 1-month calendar
    const popoverHeight = 340; // approximate height
    const margin = 16;
    
    let top = rect.bottom + 8;
    let left = rect.left;
    
    // Clamp to viewport edges
    if (left + popoverWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - popoverWidth - margin);
    }
    
    // Flip above if not enough space below
    if (top + popoverHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - popoverHeight - 8);
    }
    
    setPopoverPosition({
      top,
      left,
      minWidth: Math.max(280, rect.width)
    });
  }, []);

  // Update position when opening and on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    
    updatePosition();
    
    const handleScrollOrResize = () => {
      updatePosition();
    };
    
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInTrigger = triggerRef.current && triggerRef.current.contains(event.target);
      const clickedInPopover = popoverRef.current && popoverRef.current.contains(event.target);
      
      if (!clickedInTrigger && !clickedInPopover) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Format the display label
  const getDisplayLabel = () => {
    if (valueYmd) {
      return formatYMD(valueYmd);
    }
    return placeholder;
  };

  // Handle date selection
  const handleSelect = (date) => {
    if (!date) return;
    
    // Convert to YYYY-MM-DD string using local date components
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (onChangeYmd) {
      onChangeYmd(ymd);
    }
    setManualInput(ymd);
    setInputError('');
    setViewMonth(date);
    setYearJumpValue(String(date.getFullYear()));
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChangeYmd) {
      onChangeYmd('');
    }
    if (onClear) {
      onClear();
    }
    setManualInput('');
    setInputError('');
    setIsOpen(false);
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const clampYear = useCallback((year) => {
    return Math.max(minYear, Math.min(maxYear, year));
  }, [minYear, maxYear]);

  const normalizeInputToYMD = useCallback((value) => {
    const normalized = value.trim().replace(/\//g, '-').replace(/\./g, '-');
    const directMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (directMatch) {
      return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
    }
    const shortMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (shortMatch) {
      return `${shortMatch[1]}-${shortMatch[2].padStart(2, '0')}-${shortMatch[3].padStart(2, '0')}`;
    }
    return null;
  }, []);

  const commitManualInput = useCallback(() => {
    if (!manualInput.trim()) {
      if (!required && onChangeYmd) {
        onChangeYmd('');
      }
      setInputError(required ? 'Date is required' : '');
      return;
    }

    const ymd = normalizeInputToYMD(manualInput);
    if (!ymd) {
      setInputError('Use YYYY-MM-DD');
      return;
    }

    const parsed = parseLocalDate(ymd);
    if (!parsed || !isValid(parsed)) {
      setInputError('Invalid date');
      return;
    }

    const year = parsed.getFullYear();
    if (year < minYear || year > maxYear) {
      setInputError(`Year must be between ${minYear} and ${maxYear}`);
      return;
    }

    if (minDate && parsed < minDate) {
      setInputError(`Date must be on or after ${format(minDate, 'yyyy-MM-dd')}`);
      return;
    }
    if (maxDate && parsed > maxDate) {
      setInputError(`Date must be on or before ${format(maxDate, 'yyyy-MM-dd')}`);
      return;
    }

    setInputError('');
    setManualInput(ymd);
    setViewMonth(parsed);
    setYearJumpValue(String(parsed.getFullYear()));
    if (onChangeYmd) {
      onChangeYmd(ymd);
    }
  }, [manualInput, maxDate, maxYear, minDate, minYear, normalizeInputToYMD, onChangeYmd, required]);

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitManualInput();
    }
    if (event.key === 'ArrowDown' && !isOpen && !disabled) {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    commitManualInput();
  };

  const handleMonthSelect = (event) => {
    const newMonth = Number(event.target.value);
    const nextMonth = new Date(viewMonth.getFullYear(), newMonth, 1);
    setViewMonth(nextMonth);
    setYearJumpValue(String(nextMonth.getFullYear()));
  };

  const handleYearSelect = (event) => {
    const newYear = clampYear(Number(event.target.value));
    const nextMonth = new Date(newYear, viewMonth.getMonth(), 1);
    setViewMonth(nextMonth);
    setYearJumpValue(String(newYear));
  };

  const handleYearJump = () => {
    const year = Number(yearJumpValue);
    if (!Number.isFinite(year)) {
      return;
    }
    const clamped = clampYear(year);
    const nextMonth = new Date(clamped, viewMonth.getMonth(), 1);
    setViewMonth(nextMonth);
    setYearJumpValue(String(clamped));
  };

  const monthOptions = Array.from({ length: 12 }, (_, idx) => ({
    value: idx,
    label: format(new Date(2024, idx, 1), 'MMMM')
  }));
  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, idx) => minYear + idx
  );

  // Build disabled matcher for DayPicker
  const disabledMatcher = [];
  if (minDate) {
    disabledMatcher.push({ before: minDate });
  }
  if (maxDate) {
    disabledMatcher.push({ after: maxDate });
  }

  // Popover content - rendered via portal
  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: [0.25, 0.8, 0.25, 1] }}
          className="date-picker-popover bg-tahoe-card-bg/95 backdrop-blur-xl border border-tahoe-border-primary/80 rounded-xl overflow-hidden"
          style={{
            position: 'fixed',
            top: popoverPosition.top,
            left: popoverPosition.left,
            minWidth: popoverPosition.minWidth,
            zIndex: 9999,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 12px 24px -8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          }}
        >
          {/* Calendar */}
          <div className="p-3 date-range-picker-calendar">
            <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <select
                value={viewMonth.getMonth()}
                onChange={handleMonthSelect}
                className="px-3 py-2 rounded-lg bg-tahoe-bg-secondary border border-tahoe-border-primary text-sm text-tahoe-text-primary focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={viewMonth.getFullYear()}
                onChange={handleYearSelect}
                className="px-3 py-2 rounded-lg bg-tahoe-bg-secondary border border-tahoe-border-primary text-sm text-tahoe-text-primary focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={minYear}
                  max={maxYear}
                  step={yearStep}
                  value={yearJumpValue}
                  onChange={(event) => setYearJumpValue(event.target.value)}
                  onBlur={handleYearJump}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleYearJump();
                    }
                  }}
                  className="w-20 px-2 py-2 rounded-lg bg-tahoe-bg-secondary border border-tahoe-border-primary text-sm text-tahoe-text-primary focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                  aria-label="Jump to year"
                />
                <button
                  type="button"
                  onClick={handleYearJump}
                  className="px-2 py-2 rounded-lg border border-tahoe-border-primary text-xs text-tahoe-text-primary hover:bg-tahoe-bg-hover transition-all duration-tahoe"
                >
                  Go
                </button>
              </div>
            </div>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              month={viewMonth}
              onMonthChange={(month) => {
                setViewMonth(month);
                setYearJumpValue(String(month.getFullYear()));
              }}
              numberOfMonths={1}
              showOutsideDays
              disabled={disabledMatcher.length > 0 ? disabledMatcher : undefined}
              classNames={{
                root: 'text-tahoe-text-primary',
                months: 'flex gap-4',
                month: 'space-y-2',
                caption: 'flex justify-center pt-1 relative items-center text-sm font-medium',
                caption_label: 'text-tahoe-text-primary',
                nav: 'flex items-center',
                nav_button: 'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-lg hover:bg-tahoe-bg-hover transition-all',
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                table: 'w-full border-collapse',
                head_row: 'flex',
                head_cell: 'text-tahoe-text-muted rounded-md w-9 font-normal text-xs',
                row: 'flex w-full mt-1',
                cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
                day: 'h-9 w-9 p-0 font-normal transition-all cursor-pointer'
              }}
              modifiersClassNames={{
                selected: 'tahoe-selected',
                today: 'tahoe-today',
                outside: 'tahoe-outside',
                disabled: 'tahoe-disabled'
              }}
            />
          </div>

          {/* Clear button */}
          {valueYmd && (
            <div className="px-4 py-3 border-t border-tahoe-border-primary bg-tahoe-bg-secondary/50 flex items-center justify-end">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-sm text-tahoe-text-muted hover:text-tahoe-text-primary transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={manualInput}
          onChange={(event) => {
            setManualInput(event.target.value);
            if (inputError) {
              setInputError('');
            }
          }}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder || getDisplayLabel()}
          disabled={disabled}
          aria-invalid={Boolean(inputError)}
          className={`
            w-full pl-4 pr-12 py-2.5 rounded-lg
            bg-tahoe-bg-secondary border border-tahoe-border-primary
            text-tahoe-text-primary placeholder:text-tahoe-text-muted
            hover:bg-tahoe-bg-hover focus:ring-2 focus:ring-tahoe-accent focus:outline-none
            transition-all duration-tahoe disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
        />
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled}
          className="absolute right-2 p-1.5 rounded-md text-tahoe-text-muted hover:text-tahoe-text-primary hover:bg-tahoe-bg-hover transition-all duration-tahoe"
          aria-label="Open date picker"
        >
          <svg
            className={`w-5 h-5 transition-transform duration-tahoe ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      {inputError && (
        <p className="mt-1 text-xs text-red-400">{inputError}</p>
      )}

      {/* Popover rendered via portal to escape stacking contexts */}
      {createPortal(popoverContent, document.body)}
    </div>
  );
}
