import { useEffect, useRef } from "react"

/**
 * @param isOpen - whether the overlay is open or not
 * @param onClose - function to close the overlay
 * @param closeOnEscape=true - whether to close the overlay when the escape key is pressed
 * @returns ref - menu ref
 * */
export default function useFocusTrap<T extends HTMLElement>(isOpen: boolean, onClose: () => void, closeOnEscape: boolean = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    console.log('useFocusTrap:', {isOpen, current: ref.current});
    if (!isOpen) return
    if (!ref.current) return

    const overlayEl = ref.current
    const focusableElements = overlayEl.querySelectorAll<HTMLButtonElement | HTMLAnchorElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const firstEl = focusableElements[0]
    const lastEl = focusableElements[focusableElements.length - 1]
    console.log('useFocusTrap:', {firstEl, lastEl});

    const handleTabKeyPress = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      // cycle when reaching start/end
      if (event.shiftKey && document.activeElement === firstEl) {
        console.log('~~handleTab: focusing lastEl', event);
        event.preventDefault()
        lastEl?.focus()
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        console.log('~~handleTab: focusing firstEl', event);
        event.preventDefault()
        firstEl?.focus()
      }
    }

    const handleEscapeKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('~~handleEscapeKeyPress', event);
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    overlayEl.addEventListener('keydown', handleTabKeyPress)
    if (closeOnEscape) overlayEl.addEventListener('keydown', handleEscapeKeyPress)

    return () => {
      document.body.style.overflow = 'unset'
      overlayEl.removeEventListener('keydown', handleTabKeyPress)
      if (closeOnEscape) overlayEl.removeEventListener('keydown', handleEscapeKeyPress)
    }
  }, [isOpen, onClose, closeOnEscape])

  return ref;
}
