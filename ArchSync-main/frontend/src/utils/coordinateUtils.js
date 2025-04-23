/**
 * Utility functions for coordinate manipulations and calculations
 */

/**
 * Convert a screen point to canvas coordinates
 */
export const screenToCanvasCoordinates = (screenPoint, pan, zoom) => {
  if (!screenPoint) return null;
  
  return {
    x: (screenPoint.x - pan.x) / zoom,
    y: (screenPoint.y - pan.y) / zoom
  };
};

/**
 * Convert a canvas point to screen coordinates
 */
export const canvasToScreenCoordinates = (canvasPoint, pan, zoom) => {
  if (!canvasPoint) return null;
  
  return {
    x: canvasPoint.x * zoom + pan.x,
    y: canvasPoint.y * zoom + pan.y
  };
};

/**
 * Calculate distance between two points
 */
export const getDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Check if a point is within infinite canvas bounds
 * For infinite canvas, this always returns true
 */
export const isWithinPaperBounds = (point) => {
  // For infinite canvas, always return true
  return true;
};

/**
 * Calculate bounds of all content (walls)
 * Used for exports and centering view
 */
export const calculateContentBounds = (walls) => {
  if (!walls || walls.length === 0) {
    return { 
      minX: 0, 
      minY: 0, 
      maxX: 1000, 
      maxY: 1000,
      width: 1000,
      height: 1000
    }; // Default size
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  walls.forEach(wall => {
    // Check start point
    minX = Math.min(minX, wall.start.x);
    minY = Math.min(minY, wall.start.y);
    maxX = Math.max(maxX, wall.start.x);
    maxY = Math.max(maxY, wall.start.y);
    
    // Check end point
    minX = Math.min(minX, wall.end.x);
    minY = Math.min(minY, wall.end.y);
    maxX = Math.max(maxX, wall.end.x);
    maxY = Math.max(maxY, wall.end.y);
  });
  
  // Add some padding
  const padding = 50;
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: (maxX - minX) + (padding * 2),
    height: (maxY - minY) + (padding * 2)
  };
};