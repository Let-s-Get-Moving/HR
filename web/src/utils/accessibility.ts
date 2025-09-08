// Accessibility utilities and helpers

// ARIA attributes
export const aria = {
  // Label attributes
  label: (id: string) => ({ 'aria-labelledby': id }),
  describedBy: (id: string) => ({ 'aria-describedby': id }),
  labelAndDescription: (labelId: string, descriptionId?: string) => ({
    'aria-labelledby': labelId,
    ...(descriptionId && { 'aria-describedby': descriptionId }),
  }),

  // State attributes
  expanded: (expanded: boolean) => ({ 'aria-expanded': expanded }),
  selected: (selected: boolean) => ({ 'aria-selected': selected }),
  checked: (checked: boolean) => ({ 'aria-checked': checked }),
  pressed: (pressed: boolean) => ({ 'aria-pressed': pressed }),
  disabled: (disabled: boolean) => ({ 'aria-disabled': disabled }),
  hidden: (hidden: boolean) => ({ 'aria-hidden': hidden }),

  // Live region attributes
  live: (polite: boolean = true) => ({ 'aria-live': polite ? 'polite' : 'assertive' }),
  atomic: (atomic: boolean = true) => ({ 'aria-atomic': atomic }),

  // Navigation attributes
  current: (current: boolean) => ({ 'aria-current': current ? 'page' : undefined }),
  level: (level: number) => ({ 'aria-level': level }),
  posInSet: (pos: number, size: number) => ({
    'aria-posinset': pos,
    'aria-setsize': size,
  }),

  // Form attributes
  required: (required: boolean) => ({ 'aria-required': required }),
  invalid: (invalid: boolean) => ({ 'aria-invalid': invalid }),
  hasPopup: (hasPopup: boolean) => ({ 'aria-haspopup': hasPopup }),

  // Relationship attributes
  controls: (id: string) => ({ 'aria-controls': id }),
  owns: (id: string) => ({ 'aria-owns': id }),
  flowTo: (id: string) => ({ 'aria-flowto': id }),
};

// Generate unique IDs for accessibility
let idCounter = 0;
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${++idCounter}`;
};

// Screen reader only text
export const srOnly = 'sr-only';
export const srOnlyClass = 'sr-only';

// Focus management
export class FocusManager {
  private static focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  // Get all focusable elements within a container
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableSelectors));
  }

  // Trap focus within a container
  static trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }

  // Focus first focusable element
  static focusFirst(container: HTMLElement): void {
    const firstElement = this.getFocusableElements(container)[0];
    firstElement?.focus();
  }

  // Focus last focusable element
  static focusLast(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    const lastElement = focusableElements[focusableElements.length - 1];
    lastElement?.focus();
  }

  // Focus next focusable element
  static focusNext(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }

  // Focus previous focusable element
  static focusPrevious(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[prevIndex]?.focus();
  }
}

// Keyboard navigation helpers
export const keyboard = {
  // Common key codes
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',

  // Check if key is navigation key
  isNavigationKey: (key: string): boolean => {
    return [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown'
    ].includes(key);
  },

  // Check if key is activation key
  isActivationKey: (key: string): boolean => {
    return ['Enter', ' '].includes(key);
  },

  // Check if key is escape key
  isEscapeKey: (key: string): boolean => {
    return key === 'Escape';
  },
};

// Color contrast utilities
export const contrast = {
  // Calculate relative luminance
  getLuminance: (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  // Calculate contrast ratio
  getContrastRatio: (color1: [number, number, number], color2: [number, number, number]): number => {
    const lum1 = this.getLuminance(...color1);
    const lum2 = this.getLuminance(...color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if contrast meets WCAG standards
  meetsWCAG: (color1: [number, number, number], color2: [number, number, number], level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = this.getContrastRatio(color1, color2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  },
};

// Announce messages to screen readers
export class ScreenReaderAnnouncer {
  private static announcer: HTMLElement | null = null;

  private static getAnnouncer(): HTMLElement {
    if (!this.announcer) {
      this.announcer = document.createElement('div');
      this.announcer.setAttribute('aria-live', 'polite');
      this.announcer.setAttribute('aria-atomic', 'true');
      this.announcer.className = 'sr-only';
      document.body.appendChild(this.announcer);
    }
    return this.announcer;
  }

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = this.getAnnouncer();
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
}

// Form accessibility helpers
export const formAccessibility = {
  // Generate field ID
  getFieldId: (name: string): string => `field-${name}`,

  // Generate error ID
  getErrorId: (name: string): string => `error-${name}`,

  // Generate help text ID
  getHelpId: (name: string): string => `help-${name}`,

  // Get field accessibility props
  getFieldProps: (name: string, hasError: boolean, hasHelp: boolean) => {
    const fieldId = formAccessibility.getFieldId(name);
    const errorId = formAccessibility.getErrorId(name);
    const helpId = formAccessibility.getHelpId(name);

    const describedBy = [hasError ? errorId : null, hasHelp ? helpId : null]
      .filter(Boolean)
      .join(' ');

    return {
      id: fieldId,
      'aria-invalid': hasError,
      'aria-describedby': describedBy || undefined,
    };
  },

  // Get error accessibility props
  getErrorProps: (name: string) => ({
    id: formAccessibility.getErrorId(name),
    role: 'alert',
    'aria-live': 'polite',
  }),

  // Get help accessibility props
  getHelpProps: (name: string) => ({
    id: formAccessibility.getHelpId(name),
  }),
};

// Skip links for keyboard navigation
export const SkipLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md"
  >
    {children}
  </a>
);

// High contrast mode detection
export const isHighContrastMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for Windows High Contrast Mode
  if (window.matchMedia('(-ms-high-contrast: active)').matches) {
    return true;
  }
  
  // Check for forced colors
  if (window.matchMedia('(forced-colors: active)').matches) {
    return true;
  }
  
  return false;
};

// Reduced motion detection
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Dark mode detection
export const prefersDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export default {
  aria,
  generateId,
  FocusManager,
  keyboard,
  contrast,
  ScreenReaderAnnouncer,
  formAccessibility,
  SkipLink,
  isHighContrastMode,
  prefersReducedMotion,
  prefersDarkMode,
};
