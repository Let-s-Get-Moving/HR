import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { formatYMD, normalizeYMD, parseLocalDate } from '../utils/timezone.js';
import 'react-day-picker/style.css';

/**
 * DateRangePicker - A Tahoe-styled date range picker component
 * 
 * Behavior:
 * - Click opens a popover calendar
 * - First click selects start date, second click selects end date
 * - Apply button confirms the selection
 * - Clear button resets the range
 * - Cancel closes without changes
 * 
 * Uses a portal to render the popover at document.body level,
 * bypassing any stacking context issues from parent containers.
 * 
 * @param {Object} props
 * @param {string} props.startYmd - Initial start date in YYYY-MM-DD format
 * @param {string} props.endYmd - Initial end date in YYYY-MM-DD format
 * @param {function} props.onApply - Callback when Apply is clicked: ({ startYmd, endYmd }) => void
 * @param {function} props.onClear - Callback when Clear is clicked (optional)
 * @param {string} props.placeholder - Placeholder text when no range selected
 * @param {boolean} props.disabled - Disable the picker
 * @param {string} props.className - Additional CSS classes for the trigger button
 */
export default function DateRangePicker({
  startYmd = '',
  endYmd = '',
  onApply,
  onClear,
  placeholder = 'Select date range',
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState({
    from: startYmd ? parseLocalDate(startYmd) : undefined,
    to: endYmd ? parseLocalDate(endYmd) : undefined
  });
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, minWidth: 320 });
  
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Compute popover position based on trigger element
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 620; // approximate width for 2-month calendar
    const popoverHeight = 420; // approximate height
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
      minWidth: Math.max(320, rect.width)
    });
  }, []);

  // Sync pending range when props change (e.g., carousel selection)
  useEffect(() => {
    setPendingRange({
      from: startYmd ? parseLocalDate(startYmd) : undefined,
      to: endYmd ? parseLocalDate(endYmd) : undefined
    });
  }, [startYmd, endYmd]);

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

  // Close on click outside (handles both trigger and portaled popover)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInTrigger = triggerRef.current && triggerRef.current.contains(event.target);
      const clickedInPopover = popoverRef.current && popoverRef.current.contains(event.target);
      
      if (!clickedInTrigger && !clickedInPopover) {
        setIsOpen(false);
        // Reset pending to current props on close without apply
        setPendingRange({
          from: startYmd ? parseLocalDate(startYmd) : undefined,
          to: endYmd ? parseLocalDate(endYmd) : undefined
        });
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, startYmd, endYmd]);
  
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setPendingRange({
          from: startYmd ? parseLocalDate(startYmd) : undefined,
          to: endYmd ? parseLocalDate(endYmd) : undefined
        });
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, startYmd, endYmd]);

  // Format the display label
  const getDisplayLabel = () => {
    if (startYmd && endYmd) {
      return `${formatYMD(startYmd)} – ${formatYMD(endYmd)}`;
    }
    if (startYmd) {
      return `${formatYMD(startYmd)} – ...`;
    }
    return placeholder;
  };

  // Get pending display for inside the popover
  const getPendingLabel = () => {
    if (pendingRange.from && pendingRange.to) {
      return `${format(pendingRange.from, 'MMM dd, yyyy')} – ${format(pendingRange.to, 'MMM dd, yyyy')}`;
    }
    if (pendingRange.from) {
      return `${format(pendingRange.from, 'MMM dd, yyyy')} – select end date`;
    }
    return 'Select start date';
  };

  const handleSelect = (range) => {
    setPendingRange(range || { from: undefined, to: undefined });
  };

  const handleApply = () => {
    if (pendingRange.from && pendingRange.to && onApply) {
      // Convert to YYYY-MM-DD strings using local date components
      const startStr = `${pendingRange.from.getFullYear()}-${String(pendingRange.from.getMonth() + 1).padStart(2, '0')}-${String(pendingRange.from.getDate()).padStart(2, '0')}`;
      const endStr = `${pendingRange.to.getFullYear()}-${String(pendingRange.to.getMonth() + 1).padStart(2, '0')}-${String(pendingRange.to.getDate()).padStart(2, '0')}`;
      onApply({ startYmd: startStr, endYmd: endStr });
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setPendingRange({ from: undefined, to: undefined });
    if (onClear) {
      onClear();
    }
  };

  const handleCancel = () => {
    // Reset pending to current props
    setPendingRange({
      from: startYmd ? parseLocalDate(startYmd) : undefined,
      to: endYmd ? parseLocalDate(endYmd) : undefined
    });
    setIsOpen(false);
  };

  const isApplyDisabled = !pendingRange.from || !pendingRange.to;

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
          className="date-range-picker-popover bg-tahoe-card-bg/95 backdrop-blur-xl border border-tahoe-border-primary/80 rounded-xl overflow-hidden"
          style={{
            position: 'fixed',
            top: popoverPosition.top,
            left: popoverPosition.left,
            minWidth: popoverPosition.minWidth,
            zIndex: 9999,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 12px 24px -8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          }}
        >
          {/* Selected range display */}
          <div className="px-4 py-3 border-b border-tahoe-border-primary bg-tahoe-bg-secondary/50">
            <div className="text-sm font-medium text-tahoe-text-primary">
              {getPendingLabel()}
            </div>
          </div>

          {/* Calendar */}
          <div className="p-3 date-range-picker-calendar">
            <DayPicker
              mode="range"
              selected={pendingRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              showOutsideDays
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
                day: 'h-9 w-9 p-0 font-normal transition-all cursor-pointer',
                // Range selection classes - visual styling handled by CSS in index.css
                day_selected: '',
                day_today: '',
                day_outside: 'opacity-40',
                day_disabled: 'opacity-30 cursor-not-allowed',
                day_range_start: '',
                day_range_end: '',
                day_range_middle: ''
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="px-4 py-3 border-t border-tahoe-border-primary bg-tahoe-bg-secondary/50 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-sm text-tahoe-text-muted hover:text-tahoe-text-primary transition-colors"
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-1.5 text-sm rounded-lg bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover border border-tahoe-border-primary transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplyDisabled}
                className="px-4 py-1.5 text-sm rounded-lg bg-tahoe-accent hover:bg-tahoe-accent-hover text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-lg text-left
          bg-tahoe-bg-secondary border border-tahoe-border-primary
          hover:bg-tahoe-bg-hover focus:ring-2 focus:ring-tahoe-accent focus:outline-none
          transition-all duration-tahoe
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between gap-2
          ${className}
        `}
      >
        <span className={startYmd && endYmd ? 'text-tahoe-text-primary' : 'text-tahoe-text-muted'}>
          {getDisplayLabel()}
        </span>
        <svg 
          className={`w-5 h-5 text-tahoe-text-muted transition-transform duration-tahoe ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Popover rendered via portal to escape stacking contexts */}
      {createPortal(popoverContent, document.body)}
    </div>
  );
}
