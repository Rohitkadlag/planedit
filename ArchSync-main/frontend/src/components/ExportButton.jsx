import React, { useState } from 'react';
import { calculateContentBounds } from '../utils/coordinateUtils';

/**
 * Export button component that provides options to export the drawing
 */
const ExportButton = ({ walls, canvasDimensions }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
 
  const handleExportDXF = () => {
    // Show exporting state
    setExporting(true);
    
    try {
      // Create a filename with current date
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      const filename = `architectural_drawing_${timestamp}.dxf`;
     
      // Generate and download the DXF file
      generateAndDownloadDXF(walls, filename);
      
      // Close the dropdown
      setShowDropdown(false);
    } catch (error) {
      console.error("Error exporting DXF:", error);
      alert("Failed to export DXF file. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /**
   * Generate improved DXF content and trigger download
   */
  const generateAndDownloadDXF = (walls, filename) => {
    // Calculate content bounds for export
    const contentBounds = calculateContentBounds(walls);
    
    // Generate DXF content with improved formatting
    const dxfContent = generateImprovedDXF(walls, contentBounds);
    
    // Create a Blob with the correct MIME type
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  /**
   * Generate a more compatible DXF file
   * This function creates a simpler DXF file that should be more compatible with various CAD programs
   */
  const generateImprovedDXF = (walls, contentBounds) => {
    // Helper function to ensure consistent line endings and floating point precision
    const formatPoint = (val) => {
      // Format to 6 decimal places max to ensure compatibility
      return Number(val).toFixed(6);
    };
    
    // Start with minimal DXF header (simpler is often more compatible)
    let dxfLines = [
      '0',
      'SECTION',
      '2',
      'HEADER',
      '9',
      '$ACADVER',
      '1',
      'AC1009',
      '9',
      '$INSBASE',
      '10',
      '0.0',
      '20',
      '0.0',
      '30',
      '0.0',
      '9',
      '$EXTMIN',
      '10',
      formatPoint(contentBounds.minX),
      '20',
      formatPoint(contentBounds.minY),
      '30',
      '0.0',
      '9',
      '$EXTMAX',
      '10',
      formatPoint(contentBounds.maxX),
      '20',
      formatPoint(contentBounds.maxY),
      '30',
      '0.0',
      '0',
      'ENDSEC',
      '0',
      'SECTION',
      '2',
      'ENTITIES'
    ];
    
    // Add each wall as a LINE entity
    walls.forEach((wall, index) => {
      // Map lineweight to DXF color
      const colorCode = mapLineweightToColor(wall.lineweightId || 'standard');
      
      // With infinite canvas, we don't need to flip Y coordinates
      // since we're not bound to a specific paper height
      const startX = wall.start.x;
      const startY = wall.start.y;
      const endX = wall.end.x;
      const endY = wall.end.y;
      
      // Add LINE entity with coordinates
      dxfLines = dxfLines.concat([
        '0',
        'LINE',
        '8',
        '0',  // Layer
        '62',
        String(colorCode),  // Color
        '10',
        formatPoint(startX),
        '20',
        formatPoint(startY),
        '30',
        '0.0',
        '11',
        formatPoint(endX),
        '21',
        formatPoint(endY),
        '31',
        '0.0'
      ]);
    });
    
    // Close the DXF file
    dxfLines = dxfLines.concat([
      '0',
      'ENDSEC',
      '0',
      'EOF'
    ]);
    
    // Join all lines with proper DXF line endings (CR+LF)
    return dxfLines.join('\r\n');
  };

  /**
   * Map our lineweight IDs to standard AutoCAD color numbers
   */
  const mapLineweightToColor = (lineweightId) => {
    // Default to color 7 (white/black)
    let colorCode = 7;
    
    // Map lineweights to colors by thickness
    switch (lineweightId) {
      case 'ultrathin':
        colorCode = 9;  // Light gray
        break;
      case 'thin':
        colorCode = 8;  // Dark gray
        break;
      case 'medium':
        colorCode = 7;  // White/Black
        break;
      case 'standard':
        colorCode = 7;  // White/Black
        break;
      case 'thick':
        colorCode = 1;  // Red
        break;
      case 'verythick':
        colorCode = 5;  // Blue
        break;
      case 'ultraheavy':
        colorCode = 3;  // Green
        break;
      default:
        colorCode = 7;  // Default white/black
    }
    
    return colorCode;
  };
 
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={exporting}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        {exporting ? 'Exporting...' : 'Export'}
      </button>
     
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={handleExportDXF}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              disabled={exporting}
            >
              Export as DXF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;