/**
 * Standard architectural lineweights based on ISO 128 standards
 * Sizes in mm, with description of typical usage
 */
export const LINEWEIGHTS = [
    {
      id: "ultrathin",
      size: 0.13,
      name: "Ultra Thin (0.13mm)",
      description: "Hatching, text underlays, dimension lines",
      color: "#000000"
    },
    {
      id: "thin",
      size: 0.18,
      name: "Thin (0.18mm)",
      description: "Secondary annotations, interior fixtures",
      color: "#000000"
    },
    {
      id: "medium",
      size: 0.25,
      name: "Medium (0.25mm)",
      description: "Dimension lines, grid lines, minor elements",
      color: "#000000"
    },
    {
      id: "standard",
      size: 0.35,
      name: "Standard (0.35mm)",
      description: "Most wall outlines, furniture, room separation",
      color: "#000000"
    },
    {
      id: "thick",
      size: 0.50,
      name: "Thick (0.50mm)",
      description: "Main walls, columns, heavy outlines",
      color: "#000000"
    },
    {
      id: "verythick",
      size: 0.70,
      name: "Very Thick (0.70mm)",
      description: "Section cuts, outlines in elevation",
      color: "#000000"
    },
    {
      id: "ultraheavy",
      size: 1.00,
      name: "Ultra Heavy (1.00mm+)",
      description: "Title blocks, emphasis, cutting planes",
      color: "#000000"
    }
  ];
  
  // Default lineweight
  export const DEFAULT_LINEWEIGHT = "standard";
  
  // Get lineweight by ID
  export const getLineweightById = (id) => {
    return LINEWEIGHTS.find(lineweight => lineweight.id === id) || 
           LINEWEIGHTS.find(lineweight => lineweight.id === DEFAULT_LINEWEIGHT);
  };
  
  // Scale factor to convert mm lineweights to screen pixels
  // This ensures lineweights are proportional to the zoom level
  export const calculateLineweightPixels = (lineweightMm, zoom) => {
    // Base scaling factor (adjust as needed for screen DPI)
    const baseScaleFactor = 2.5;
    return lineweightMm * baseScaleFactor * zoom;
  };

  