import React from "react";

/**
 * Tool Controls component for managing tool selection and actions
 */
const ToolControls = ({
  zoom,
  setZoom,
  isPanMode,
  toggleMode,
  handleClear,
  selectedTool,
  setSelectedTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  snapEnabled,
  toggleSnap
}) => {
  // Predefined zoom levels
  const zoomLevels = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5];
  
  // Format zoom for display
  const displayZoom = Math.round(zoom * 100);
  
  return (
    <div className="bg-white border border-gray-300 p-2 rounded-md shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Tool Selection */}
        <div className="flex border rounded-md overflow-hidden">
          <button
            className={`px-3 py-1 ${
              selectedTool === 'wall' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
            onClick={() => setSelectedTool('wall')}
            title="Wall Tool (W)"
          >
            Wall
          </button>
          <button
            className={`px-3 py-1 ${
              selectedTool === 'select' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
            onClick={() => setSelectedTool('select')}
            title="Select Tool (S)"
          >
            Select
          </button>
        </div>
        
        {/* Pan Mode Toggle */}
        <button
          className={`px-3 py-1 rounded ${
            isPanMode ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
          onClick={toggleMode}
          title="Toggle Pan Mode (P)"
        >
          {isPanMode ? 'Exit Pan' : 'Pan'}
        </button>
        
        {/* Snap Toggle */}
        <button
          className={`px-3 py-1 rounded ${
            snapEnabled ? 'bg-green-500 text-white' : 'bg-gray-300'
          }`}
          onClick={toggleSnap}
          title="Toggle Snap (S)"
        >
          Snap: {snapEnabled ? 'ON' : 'OFF'}
        </button>
        
        {/* Zoom Controls */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
            onClick={() => setZoom(prev => Math.max(0.1, prev / 1.2))}
            title="Zoom Out"
          >
            -
          </button>
          <div className="px-2 py-1 border-l border-r min-w-[60px] text-center">
            {displayZoom}%
          </div>
          <button
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
            onClick={() => setZoom(prev => Math.min(10, prev * 1.2))}
            title="Zoom In"
          >
            +
          </button>
        </div>
        
        {/* Preset zoom levels */}
        <select
          className="px-2 py-1 border rounded-md bg-white"
          value={zoomLevels.includes(zoom) ? zoom : ''}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
        >
          <option value="" disabled>Zoom</option>
          {zoomLevels.map(level => (
            <option key={level} value={level}>
              {Math.round(level * 100)}%
            </option>
          ))}
        </select>
        
        {/* History Controls */}
        <div className="flex border rounded-md overflow-hidden">
          <button
            className={`px-3 py-1 ${canUndo ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-400'}`}
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            className={`px-3 py-1 ${canRedo ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-400'}`}
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            Redo
          </button>
        </div>
        
        {/* Clear Button */}
        <button
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={handleClear}
          title="Clear All Walls"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default ToolControls;