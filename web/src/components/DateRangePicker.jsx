import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format, isBefore, isAfter, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { formatYMD, normalizeYMD, parseLocalDate } from '../utils/timezone.js';
import 'react-day-picker/style.css';

/**
 * Pure helper: compute next range state based on active edge and clicked date.
 * Implements Google Ads-like semantics: swap instead of reset, no accidental wipes.
 * 
 * @param {{ from: Date|undefined, to: Date|undefined }} currentRange
 * @param {'start'|'end'} activeEdge
 * @param {Date} clickedDate
 * @returns {{ nextRange: { from: Date|undefined, to: Date|undefined }, nextActiveEdge: 'start'|'end' }}
 */
function computeNextRange(currentRange, activeEdge, clickedDate) {
  const { from, to } = currentRange;
  
  if (activeEdge === 'start') {
    // Setting start date
    let newFrom = clickedDate;
    let newTo = to;
    
    // If clicked date is after existing end, swap them
    if (to && isAfter(clickedDate, to)) {
      newFrom = to;
      newTo = clickedDate;
    }
    
    return {
      nextRange: { from: newFrom, to: newTo },
      nextActiveEdge: 'end' // After setting start, switch to end
    };
  } else {
    // Setting end date
    if (!from) {
      // No start yet, set this as start and stay on end
      return {
        nextRange: { from: clickedDate, to: undefined },
        nextActiveEdge: 'end'
      };
    }
    
    let newFrom = from;
    let newTo = clickedDate;
    
    // If clicked date is before start, swap them
    if (isBefore(clickedDate, from)) {
      newFrom = clickedDate;
      newTo = from;
    }
    
    return {
      nextRange: { from: newFrom, to: newTo },
      nextActiveEdge: 'end' // Stay on end for subsequent clicks (Google-like)
    };
  }
}

/**
 * DateRangePicker - A Tahoe-styled date range picker component
 * 
 * Behavior (Google Ads-like gestures):
 * - Click trigger to open popover calendar
 * - Click left half of trigger to edit start date, right half for end date
 * - Clicking a date updates the active edge (start or end)
 * - Backward clicks swap dates instead of resetting
 * - Third click updates the active edge instead of wiping selection
 * - Hover preview shows potential range before clicking
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
 * @param {'manual'|'instant'} props.commitMode - 'manual' requires Apply button, 'instant' commits when range is complete
 */
export default function DateRangePicker({
  startYmd = '',
  endYmd = '',
  onApply,
  onClear,
  placeholder = 'Select date range',
  disabled = false,
  className = '',
  commitMode = 'manual'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState({
    from: startYmd ? parseLocalDate(startYmd) : undefined,
    to: endYmd ? parseLocalDate(endYmd) : undefined
  });
  const [activeEdge, setActiveEdge] = useState('start'); // 'start' | 'end'
  const [hoverDate, setHoverDate] = useState(undefined); // For preview band
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
    const newFrom = startYmd ? parseLocalDate(startYmd) : undefined;
    const newTo = endYmd ? parseLocalDate(endYmd) : undefined;
    setPendingRange({ from: newFrom, to: newTo });
    
    // Reset activeEdge based on current state
    if (!newFrom) {
      setActiveEdge('start');
    } else if (!newTo) {
      setActiveEdge('end');
    }
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
    const fromStr = pendingRange.from ? format(pendingRange.from, 'MMM dd, yyyy') : '...';
    const toStr = pendingRange.to ? format(pendingRange.to, 'MMM dd, yyyy') : '...';
    
    if (pendingRange.from && pendingRange.to) {
      // Both selected - show which edge is active for next click
      const editingHint = activeEdge === 'start' ? ' (editing start)' : ' (editing end)';
      return `${fromStr} – ${toStr}${editingHint}`;
    }
    if (pendingRange.from) {
      return `${fromStr} – select end date`;
    }
    return 'Select start date';
  };

  /**
   * Custom selection handler using Google Ads-like gestures.
   * Uses triggerDate from v9 signature and ignores DayPicker's computed range.
   */
  const handleSelect = (selectedRange, triggerDate, modifiers, e) => {
    // Ignore DayPicker's computed range; use our state machine instead
    const { nextRange, nextActiveEdge } = computeNextRange(pendingRange, activeEdge, triggerDate);
    setPendingRange(nextRange);
    setActiveEdge(nextActiveEdge);
    setHoverDate(undefined); // Clear hover after selection
    
    // In instant mode, auto-apply when range is complete
    if (commitMode === 'instant' && nextRange.from && nextRange.to && onApply) {
      const startStr = `${nextRange.from.getFullYear()}-${String(nextRange.from.getMonth() + 1).padStart(2, '0')}-${String(nextRange.from.getDate()).padStart(2, '0')}`;
      const endStr = `${nextRange.to.getFullYear()}-${String(nextRange.to.getMonth() + 1).padStart(2, '0')}-${String(nextRange.to.getDate()).padStart(2, '0')}`;
      onApply({ startYmd: startStr, endYmd: endStr });
      setIsOpen(false);
    }
  };
  
  /**
   * Handle hover for preview band
   */
  const handleDayMouseEnter = (date) => {
    // Only show preview if we have a partial selection
    if (pendingRange.from && !pendingRange.to) {
      setHoverDate(date);
    } else if (pendingRange.from && pendingRange.to && activeEdge === 'end') {
      // Show preview when editing end of complete range
      setHoverDate(date);
    } else if (activeEdge === 'start' && pendingRange.to) {
      // Show preview when editing start of complete range
      setHoverDate(date);
    }
  };
  
  const handleDayMouseLeave = () => {
    setHoverDate(undefined);
  };
  
  /**
   * Compute preview range for hover effect
   */
  const getPreviewRange = () => {
    if (!hoverDate) return undefined;
    
    if (activeEdge === 'start' && pendingRange.to) {
      // Previewing new start with existing end
      const previewFrom = isBefore(hoverDate, pendingRange.to) ? hoverDate : pendingRange.to;
      const previewTo = isAfter(hoverDate, pendingRange.to) ? hoverDate : pendingRange.to;
      return { from: previewFrom, to: previewTo };
    }
    
    if (pendingRange.from) {
      // Previewing end (or completing range)
      const previewFrom = isBefore(hoverDate, pendingRange.from) ? hoverDate : pendingRange.from;
      const previewTo = isAfter(hoverDate, pendingRange.from) ? hoverDate : pendingRange.from;
      return { from: previewFrom, to: previewTo };
    }
    
    return undefined;
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
    setActiveEdge('start'); // Reset to start
    setHoverDate(undefined);
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
              onDayMouseEnter={handleDayMouseEnter}
              onDayMouseLeave={handleDayMouseLeave}
              numberOfMonths={2}
              showOutsideDays
              modifiers={{
                preview: getPreviewRange() || false
              }}
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
                disabled: 'tahoe-disabled',
                range_start: 'tahoe-range-start',
                range_middle: 'tahoe-range-middle',
                range_end: 'tahoe-range-end',
                preview: 'tahoe-range-preview'
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
            {commitMode === 'manual' && (
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
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /**
   * Handle trigger click: determine which edge to edit based on click position.
   * Left half of trigger = edit start, right half = edit end.
   */
  const handleTriggerClick = (e) => {
    if (disabled) return;
    
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const isLeftHalf = clickX < rect.width / 2;
      
      // Determine activeEdge based on click position and current state
      if (!pendingRange.from) {
        // No start yet, always start
        setActiveEdge('start');
      } else if (!pendingRange.to) {
        // Has start but no end, default to end unless left-half clicked
        setActiveEdge(isLeftHalf ? 'start' : 'end');
      } else {
        // Has both, use click position
        setActiveEdge(isLeftHalf ? 'start' : 'end');
      }
    }
    
    setIsOpen(!isOpen);
    setHoverDate(undefined);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
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
