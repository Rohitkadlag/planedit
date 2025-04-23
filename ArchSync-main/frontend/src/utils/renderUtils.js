/**
 * Utilities for high-quality rendering
 */

/**
 * Configure Konva stage for high DPI displays to prevent blurry lines
 * @param {Object} stageRef - React ref containing Konva stage instance
 */
export const configureHighDPIStage = (stageRef) => {
    if (!stageRef) return;
    
    try {
      // Get the actual Konva stage instance
      const stage = stageRef.getStage();
      
      if (!stage) return;
      
      // Get the device pixel ratio
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Instead of using the pixelRatio method, set it directly on stage creation
      // The pixelRatio property is already set via the pixelRatio prop on the Stage component
      
      // Force a redraw
      stage.batchDraw();
    } catch (error) {
      console.warn("Could not configure high DPI stage:", error);
    }
  };
  
  /**
   * Optimize line rendering to avoid blurriness
   * @param {number} value - Coordinate value
   * @returns {number} - Snapped coordinate value
   */
  export const snapToPixel = (value) => {
    // Snap to half-pixel to get sharper lines
    return Math.round(value * 2) / 2;
  };
  
  /**
   * Calculate the optimal pixel ratio for the current device
   * @returns {number} - Optimal pixel ratio (1 for low-DPI, actual ratio for high-DPI)
   */
  export const getOptimalPixelRatio = () => {
    const dpr = window.devicePixelRatio || 1;
    
    // Limit pixel ratio to avoid performance issues on very high DPI displays
    return Math.min(dpr, 2);
  };
  
  /**
   * Get CSS transform for crisp canvas rendering
   * @returns {Object} - CSS style object
   */
  export const getCanvasHQStyles = () => {
    return {
      // Disable antialiasing in browsers for cleaner lines
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility'
    };
  };