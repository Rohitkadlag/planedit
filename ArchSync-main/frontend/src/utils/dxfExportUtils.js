/**
 * Enhanced utilities for exporting to DXF format
 * Supporting lineweights and proper paper setup
 */

// DXF color mapping (approximate, since DXF uses indexed colors)
const DXF_COLORS = {
    black: 7,     // white in AutoCAD (but we'll use it for black)
    red: 1,
    yellow: 2,
    green: 3,
    cyan: 4,
    blue: 5,
    magenta: 6
  };
  
  // Map lineweights to DXF line types
  const mapLineweightToProperties = (lineweightId) => {
    // Default values if lineweight not specified
    let color = DXF_COLORS.black;
    let lineType = "CONTINUOUS";
    let lineweight = 25; // AutoCAD default (0.25mm)
    
    // Map our lineweights to DXF properties
    switch (lineweightId) {
      case "ultrathin":
        lineweight = 13; // 0.13mm
        break;
      case "thin":
        lineweight = 18; // 0.18mm
        break;
      case "medium":
        lineweight = 25; // 0.25mm
        break;
      case "standard":
        lineweight = 35; // 0.35mm
        break;
      case "thick":
        lineweight = 50; // 0.50mm
        break;
      case "verythick":
        lineweight = 70; // 0.70mm
        break;
      case "ultraheavy":
        lineweight = 100; // 1.00mm
        break;
      default:
        lineweight = 35; // Default to standard
    }
    
    return { color, lineType, lineweight };
  };
  
  /**
   * Generate a DXF file content from walls array with improved support
   * @param {Array} walls - Array of wall objects with start and end points
   * @param {Object} paperDimensions - Object with width and height
   * @returns {string} - DXF file content as string
   */
  export const generateDXF = (walls, paperDimensions) => {
    // Get current date for file metadata
    const now = new Date();
    const dateString = now.toISOString();
    
    // Start building DXF content with header
    let dxfContent = `0
  SECTION
  2
  HEADER
  9
  $ACADVER
  1
  AC1021
  9
  $DWGCODEPAGE
  3
  ANSI_1252
  9
  $INSBASE
  10
  0.0
  20
  0.0
  30
  0.0
  9
  $EXTMIN
  10
  0.0
  20
  0.0
  30
  0.0
  9
  $EXTMAX
  10
  ${paperDimensions.width}
  20
  ${paperDimensions.height}
  30
  0.0
  9
  $LIMMIN
  10
  0.0
  20
  0.0
  9
  $LIMMAX
  10
  ${paperDimensions.width}
  20
  ${paperDimensions.height}
  9
  $LTSCALE
  40
  1.0
  9
  $HANDSEED
  5
  20000
  9
  $DWGNAME
  1
  Architectural Drawing
  9
  $ACADMAINTVER
  70
  25
  0
  ENDSEC
  `;
  
    // Add tables section (layers, linetypes, etc.)
    dxfContent += `0
  SECTION
  2
  TABLES
  0
  TABLE
  2
  VPORT
  5
  8
  100
  AcDbSymbolTable
  0
  ENDTAB
  0
  TABLE
  2
  LTYPE
  5
  5
  100
  AcDbSymbolTable
  0
  LTYPE
  5
  14
  100
  AcDbSymbolTableRecord
  100
  AcDbLinetypeTableRecord
  2
  BYBLOCK
  70
  0
  0
  LTYPE
  5
  15
  100
  AcDbSymbolTableRecord
  100
  AcDbLinetypeTableRecord
  2
  BYLAYER
  70
  0
  0
  LTYPE
  5
  16
  100
  AcDbSymbolTableRecord
  100
  AcDbLinetypeTableRecord
  2
  CONTINUOUS
  70
  0
  3
  Solid line
  72
  65
  73
  0
  40
  0.0
  0
  ENDTAB
  0
  TABLE
  2
  LAYER
  5
  2
  100
  AcDbSymbolTable
  70
  1
  0
  LAYER
  5
  10
  100
  AcDbSymbolTableRecord
  100
  AcDbLayerTableRecord
  2
  0
  70
  0
  62
  7
  6
  CONTINUOUS
  0
  ENDTAB
  0
  TABLE
  2
  STYLE
  5
  3
  100
  AcDbSymbolTable
  70
  3
  0
  STYLE
  5
  11
  100
  AcDbSymbolTableRecord
  100
  AcDbTextStyleTableRecord
  2
  Standard
  70
  0
  40
  0.0
  41
  1.0
  50
  0.0
  71
  0
  42
  0.2
  3
  txt
  0
  ENDTAB
  0
  ENDSEC
  `;
  
    // Add entities section (the actual geometry)
    dxfContent += `0
  SECTION
  2
  ENTITIES
  `;
  
    // Add each wall as a LINE entity
    walls.forEach((wall, index) => {
      // Get line properties based on lineweight
      const { color, lineType, lineweight } = mapLineweightToProperties(wall.lineweightId);
      
      // Add a unique handle for each entity
      const handle = 20000 + index;
      
      dxfContent += `0
  LINE
  5
  ${handle}
  100
  AcDbEntity
  8
  0
  6
  ${lineType}
  62
  ${color}
  370
  ${lineweight}
  100
  AcDbLine
  10
  ${wall.start.x}
  20
  ${wall.start.y}
  30
  0.0
  11
  ${wall.end.x}
  21
  ${wall.end.y}
  31
  0.0
  0
  `;
    });
  
    // Close the entities section and the file
    dxfContent += `
  ENDSEC
  0
  SECTION
  2
  OBJECTS
  0
  DICTIONARY
  5
  C
  100
  AcDbDictionary
  3
  ACAD_GROUP
  350
  D
  0
  ENDSEC
  0
  EOF`;
  
    return dxfContent;
  };
  
  /**
   * Create and download a DXF file
   * @param {Array} walls - Array of wall objects with start and end points
   * @param {Object} paperDimensions - Object with width and height
   * @param {string} filename - Name for the downloaded file
   */
  export const downloadDXF = (walls, paperDimensions, filename = 'drawing.dxf') => {
    // Generate DXF content
    const dxfContent = generateDXF(walls, paperDimensions);
    
    // Create a Blob from the DXF content
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    
    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Trigger the download by simulating a click
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    return true;
  };