// Standard ISO 'A' series paper sizes in millimeters
export const PAPER_SIZES = {
    A0: { 
      width: 841, 
      height: 1189, 
      name: "A0", 
      description: "Full-size building plans, large posters" 
    },
    A1: { 
      width: 594, 
      height: 841, 
      name: "A1", 
      description: "Floor plans, layouts" 
    },
    A2: { 
      width: 420, 
      height: 594, 
      name: "A2", 
      description: "Interior layouts, elevations" 
    },
    A3: { 
      width: 297, 
      height: 420, 
      name: "A3", 
      description: "Detail drawings, client presentations" 
    },
    A4: { 
      width: 210, 
      height: 297, 
      name: "A4", 
      description: "Letters, reports, title blocks" 
    },
  };
  
  // Scale factor for converting mm to pixels (can be adjusted)
  export const SCALE_FACTOR = 2;
  
  // Default zoom limits
  export const MIN_ZOOM = 0.5;
  export const MAX_ZOOM = 3;
  export const DEFAULT_ZOOM = 1;
  
  // Default paper size and orientation
  export const DEFAULT_PAPER_SIZE = "A1";
  export const DEFAULT_ORIENTATION = "landscape";