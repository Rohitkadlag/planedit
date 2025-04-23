import React from "react";

/**
 * Status Bar component to show cursor position and other details
 */
const StatusBar = ({ 
  canvasMode,
  zoom, 
  isPanMode, 
  hoveredPosition,
  isDrawingChain,
  snapEnabled
}) => {
  // Format coordinates for display
  const xDisplay = hoveredPosition ? Math.round(hoveredPosition.x) : '-';
  const yDisplay = hoveredPosition ? Math.round(hoveredPosition.y) : '-';
  
  // Convert to meters for display
  const xMeters = hoveredPosition ? (hoveredPosition.x / 1000).toFixed(3) : '-';
  const yMeters = hoveredPosition ? (hoveredPosition.y / 1000).toFixed(3) : '-';
  
  // Format zoom percentage
  const zoomPercentage = Math.round(zoom * 100);
  
  return (
    <div className="bg-gray-800 text-white px-4 py-1 text-sm flex justify-between items-center mb-2 rounded">
      <div className="flex space-x-6">
        <div>
          Mode: {canvasMode === 'infinite' ? 'Infinite Canvas' : 'Paper Mode'}
        </div>
        <div>
          X: {xDisplay}mm ({xMeters}m)
        </div>
        <div>
          Y: {yDisplay}mm ({yMeters}m)
        </div>
        <div>
          Zoom: {zoomPercentage}%
        </div>
        {isDrawingChain && (
          <div className="text-blue-300">
            Chain Drawing Active
          </div>
        )}
      </div>
      
      <div className="flex space-x-4">
        <div>
          Snap: {snapEnabled ? "ON" : "OFF"}
        </div>
        <div>
          {isPanMode ? "Pan Mode" : "Draw Mode"}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;