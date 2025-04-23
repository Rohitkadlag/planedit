import React, { useState, useEffect } from "react";

/**
 * WallEditor component for editing wall properties
 * Appears when a wall is selected
 */
const WallEditor = ({ selectedWall, onUpdateWall, onCancel }) => {
  // Initialize local state with the provided wall properties
  const [thickness, setThickness] = useState(selectedWall?.thickness || 30); // Default 30mm
  const [length, setLength] = useState(0);
  
  // Update local state when selected wall changes
  useEffect(() => {
    if (selectedWall) {
      setThickness(selectedWall.thickness || 30); // Default 30mm
      
      // Calculate the current length based on available properties
      // Use originalStart/End if available, otherwise fall back to start/end
      const startPoint = selectedWall.originalStart || selectedWall.start;
      const endPoint = selectedWall.originalEnd || selectedWall.end;
      
      if (startPoint && endPoint) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const currentLength = Math.sqrt(dx * dx + dy * dy);
        setLength(currentLength);
      }
    }
  }, [selectedWall]);

  // Add this function to WallEditor.jsx
// Format length dynamically based on size
const formatLength = (lengthInMm) => {
    const lengthInM = lengthInMm / 1000;
    
    if (lengthInM >= 100) {
      // For very large lengths, show as whole meters
      return `${Math.round(lengthInM)} m`;
    } else if (lengthInM >= 10) {
      // For large lengths, show with 1 decimal place
      return `${lengthInM.toFixed(1)} m`;
    } else if (lengthInM >= 0.1) {
      // For medium lengths, show with 2 decimal places
      return `${lengthInM.toFixed(2)} m`;
    } else {
      // For small lengths, show with 3 decimal places
      return `${lengthInM.toFixed(3)} m`;
    }
  };
  
  
  
  // Handle thickness input change with no restrictions
  const handleThicknessChange = (e) => {
    // Allow any positive value without restricting the range
    const value = e.target.value;
    setThickness(value);
  };
  
  // Handle length input change with no restrictions
  const handleLengthChange = (e) => {
    // Allow any positive value without restricting the range
    const value = e.target.value;
    setLength(value);
  };
  
  // Handle form submission with improved length handling
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedWall) return;
    
    // Parse the values - using parseFloat to allow decimal values
    const thicknessValue = parseFloat(thickness);
    const lengthValue = parseFloat(length);
    
    if (isNaN(thicknessValue) || isNaN(lengthValue)) {
      alert('Please enter valid numbers for thickness and length');
      return;
    }
    
    // Get the appropriate start point (use original if available, otherwise use regular)
    const startPoint = selectedWall.originalStart || selectedWall.start;
    // Get the appropriate end point
    const endPoint = selectedWall.originalEnd || selectedWall.end;
    
    // Calculate the new endpoint based on the new length
    let newEnd = { ...endPoint };
    
    if (startPoint) {
      // Get direction vector
      const origDx = (endPoint.x - startPoint.x);
      const origDy = (endPoint.y - startPoint.y);
      const origLength = Math.sqrt(origDx * origDx + origDy * origDy);
      
      if (origLength > 0) {
        // Normalize direction
        const nx = origDx / origLength;
        const ny = origDy / origLength;
        
        // Calculate new endpoint
        newEnd = {
          x: startPoint.x + nx * lengthValue,
          y: startPoint.y + ny * lengthValue
        };
      }
    }
    
    // Apply updates to the wall with updated length
    onUpdateWall({
      ...selectedWall,
      thickness: thicknessValue,
      length: lengthValue, // Store the actual length value
      originalStart: startPoint,
      originalEnd: newEnd,
      start: startPoint,
      end: newEnd
    });
  };
  
  // If no wall is selected, don't render anything
  if (!selectedWall) return null;
  
  
  const formattedLength = formatLength(length);
  
  return (
    <div className="absolute right-4 top-20 bg-white shadow-lg border border-gray-300 rounded-md p-4 z-20 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">Wall Properties</h3>
        <button 
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-800"
        >
          ✕
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Length (mm)
          </label>
          <input
            type="number"
            value={length}
            onChange={handleLengthChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            {formattedLength}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Thickness (mm)
          </label>
          <input
            type="number"
            value={thickness}
            onChange={handleThicknessChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
};

export default WallEditor;