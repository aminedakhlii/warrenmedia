/**
 * Keyboard Navigation Utilities
 * Phase 5: Apps Preparation
 * 
 * Provides consistent keyboard navigation for TV/remote readiness
 */

/**
 * Focus Management
 */
export class FocusManager {
  private focusHistory: HTMLElement[] = []

  /**
   * Save current focused element
   */
  saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement !== document.body) {
      this.focusHistory.push(activeElement)
    }
  }

  /**
   * Restore previously focused element
   */
  restoreFocus(): boolean {
    const lastFocused = this.focusHistory.pop()
    if (lastFocused && document.body.contains(lastFocused)) {
      lastFocused.focus()
      return true
    }
    return false
  }

  /**
   * Clear focus history
   */
  clearHistory(): void {
    this.focusHistory = []
  }

  /**
   * Focus first focusable element in container
   */
  focusFirst(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container)
    if (focusable.length > 0) {
      focusable[0].focus()
      return true
    }
    return false
  }

  /**
   * Get all focusable elements in container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[]
  }

  /**
   * Trap focus within container (for modals)
   */
  trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return

    const focusable = this.getFocusableElements(container)
    if (focusable.length === 0) return

    const firstFocusable = focusable[0]
    const lastFocusable = focusable[focusable.length - 1]

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus()
        event.preventDefault()
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus()
        event.preventDefault()
      }
    }
  }
}

/**
 * Keyboard Shortcuts
 */
export const KeyboardShortcuts = {
  // Video player shortcuts
  PLAY_PAUSE: ' ', // Space
  FULLSCREEN: 'f',
  MUTE: 'm',
  SEEK_FORWARD: 'ArrowRight',
  SEEK_BACKWARD: 'ArrowLeft',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown',
  ESCAPE: 'Escape',

  // Navigation shortcuts
  HOME: 'h',
  SEARCH: '/',
  
  // Slider navigation
  SLIDER_NEXT: 'ArrowRight',
  SLIDER_PREV: 'ArrowLeft',
  SLIDER_SELECT: 'Enter',
}

/**
 * Check if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ]

  return focusableSelectors.some(selector => element.matches(selector))
}

/**
 * Add visible focus indicator to element
 */
export function addFocusIndicator(element: HTMLElement): void {
  element.style.outline = '2px solid #f59e0b' // amber-glow
  element.style.outlineOffset = '2px'
}

/**
 * Remove focus indicator from element
 */
export function removeFocusIndicator(element: HTMLElement): void {
  element.style.outline = ''
  element.style.outlineOffset = ''
}

/**
 * Handle escape key globally
 */
export function handleEscapeKey(callback: () => void): () => void {
  const handler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      callback()
    }
  }

  window.addEventListener('keydown', handler)

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handler)
  }
}

/**
 * Prevent default keyboard actions when in input
 */
export function isInInputElement(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName.toLowerCase()
  return ['input', 'textarea', 'select'].includes(tagName)
}

// Export singleton focus manager
export const focusManager = new FocusManager()

