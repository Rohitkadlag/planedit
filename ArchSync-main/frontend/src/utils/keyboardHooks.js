import { useEffect } from 'react';

/**
 * Hook to handle keyboard shortcuts
 * 
 * @param {Object} handlers - Object containing handler functions
 * @param {Function} handlers.onUndo - Function to call when Ctrl+Z is pressed
 * @param {Function} handlers.onRedo - Function to call when Ctrl+Y is pressed
 * @param {Function} handlers.onTogglePan - Function to call when Space is pressed/released (toggle pan mode)
 * @param {boolean} enabled - Whether the hook is enabled
 */
export const useKeyboardShortcuts = (handlers, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event) => {
      // Check for Ctrl+Z (Undo)
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        if (handlers.onUndo) {
          handlers.onUndo();
        }
      }
      
      // Check for Ctrl+Y (Redo)
      if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        if (handlers.onRedo) {
          handlers.onRedo();
        }
      }
      
      // Check for Ctrl+Shift+Z (Alternative Redo)
      if (event.ctrlKey && event.shiftKey && event.key === 'Z') {
        event.preventDefault();
        if (handlers.onRedo) {
          handlers.onRedo();
        }
      }
      
      // Space bar for temporary pan mode
      if (event.key === ' ' && !event.repeat) { // Space bar, prevent repeat
        event.preventDefault();
        if (handlers.onTogglePan) {
          handlers.onTogglePan(true); // Activate pan mode
        }
      }
    };
    
    const handleKeyUp = (event) => {
      // Space bar released - exit temporary pan mode
      if (event.key === ' ') {
        event.preventDefault();
        if (handlers.onTogglePan) {
          handlers.onTogglePan(false); // Deactivate pan mode
        }
      }
    };
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlers, enabled]);
};