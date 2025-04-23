/**
 * Utility functions for managing history (undo/redo)
 */

/**
 * Creates a new history state and adds it to the history stack
 * 
 * @param {Array} currentHistory - Current history stack
 * @param {number} currentIndex - Current position in history
 * @param {Array} walls - Current walls array to save
 * @returns {Object} - New history state object { history, currentIndex }
 */
export const addToHistory = (currentHistory, currentIndex, walls) => {
    // Create a deep copy of the walls array to prevent reference issues
    const wallsCopy = JSON.parse(JSON.stringify(walls));
    
    // If we're not at the end of history (user has performed undo),
    // discard any future history beyond current point
    const newHistory = currentHistory.slice(0, currentIndex + 1);
    
    // Add the new state to history
    newHistory.push(wallsCopy);
    
    // Return new history and updated index
    return {
      history: newHistory,
      currentIndex: newHistory.length - 1
    };
  };
  
  /**
   * Performs an undo operation
   * 
   * @param {Array} currentHistory - Current history stack
   * @param {number} currentIndex - Current position in history
   * @returns {Object} - Updated history state { walls, history, currentIndex, canUndo, canRedo }
   */
  export const undo = (currentHistory, currentIndex) => {
    // Check if we can undo (not at beginning of history)
    if (currentIndex <= 0) {
      return {
        walls: currentHistory[0] || [],
        history: currentHistory,
        currentIndex: 0,
        canUndo: false,
        canRedo: currentIndex < currentHistory.length - 1
      };
    }
    
    // Move back one step in history
    const newIndex = currentIndex - 1;
    
    // Return the previous state and updated indices
    return {
      walls: currentHistory[newIndex],
      history: currentHistory,
      currentIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true
    };
  };
  
  /**
   * Performs a redo operation
   * 
   * @param {Array} currentHistory - Current history stack
   * @param {number} currentIndex - Current position in history
   * @returns {Object} - Updated history state { walls, history, currentIndex, canUndo, canRedo }
   */
  export const redo = (currentHistory, currentIndex) => {
    // Check if we can redo (not at end of history)
    if (currentIndex >= currentHistory.length - 1) {
      return {
        walls: currentHistory[currentIndex] || [],
        history: currentHistory,
        currentIndex,
        canUndo: currentIndex > 0,
        canRedo: false
      };
    }
    
    // Move forward one step in history
    const newIndex = currentIndex + 1;
    
    // Return the next state and updated indices
    return {
      walls: currentHistory[newIndex],
      history: currentHistory,
      currentIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < currentHistory.length - 1
    };
  };
  
  /**
   * Initializes history with initial state
   * 
   * @param {Array} initialWalls - Initial walls array
   * @returns {Object} - Initial history state
   */
  export const initHistory = (initialWalls = []) => {
    return {
      history: [initialWalls],
      currentIndex: 0,
      canUndo: false,
      canRedo: false
    };
  };