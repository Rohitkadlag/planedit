/**
 * Utilities for working with floorplan data
 */

/**
 * Converts walls array from canvas format to backend floorplan format
 * @param {Array} walls - Array of wall objects from canvas
 * @returns {Object} - Floorplan data in the format expected by backend
 */
export const convertWallsToFloorplan = (walls) => {
  const floorplan = {};

  // Group walls by room name
  walls.forEach((wall) => {
    const roomName = wall.roomName || "Room";

    if (!floorplan[roomName]) {
      floorplan[roomName] = [];
    }

    // Add wall segment in the format expected by backend
    floorplan[roomName].push([
      [wall.start.x, wall.start.y],
      [wall.end.x, wall.end.y],
    ]);
  });

  return floorplan;
};

/**
 * Converts floorplan data from backend to walls array for canvas
 * @param {Object} floorplanData - Floorplan data from backend
 * @returns {Array} - Array of wall objects for canvas
 */
export const convertFloorplanToWalls = (floorplanData) => {
  if (!floorplanData) return [];

  const walls = [];
  let wallId = 0;

  // Room color mapping for visual distinction
  const roomColors = {
    "Master Bedroom": "#8B4513", // Brown
    Bedroom: "#4682B4", // Steel Blue
    "Living Room": "#228B22", // Forest Green
    Kitchen: "#FF8C00", // Dark Orange
    "Dining Room": "#9370DB", // Medium Purple
    "En suite Washroom": "#20B2AA", // Light Sea Green
    "Common Washroom": "#20B2AA", // Light Sea Green
    Bathroom: "#20B2AA", // Light Sea Green
    Washroom: "#20B2AA", // Light Sea Green
    Passage: "#A9A9A9", // Dark Gray
    "MB Passage": "#A9A9A9", // Dark Gray
    Foyer: "#CD853F", // Peru
  };

  // Default color for rooms not in the mapping
  const defaultColor = "#000000"; // Black

  // Process each room
  Object.entries(floorplanData).forEach(([roomName, coordinates]) => {
    // Get appropriate color for this room
    const roomColor = roomColors[roomName] || defaultColor;

    // Determine appropriate line thickness based on room type
    let lineThickness = 30; // Default

    if (roomName.includes("Washroom") || roomName.includes("Bathroom")) {
      lineThickness = 25; // Thinner for washrooms
    } else if (roomName.includes("Passage")) {
      lineThickness = 20; // Thinnest for passages
    } else if (roomName.includes("Master Bedroom")) {
      lineThickness = 35; // Thicker for master bedroom
    }

    // Determine appropriate lineweight ID
    let lineweightId = "standard";
    if (lineThickness <= 20) lineweightId = "thin";
    else if (lineThickness <= 25) lineweightId = "medium";
    else if (lineThickness <= 30) lineweightId = "standard";
    else if (lineThickness <= 35) lineweightId = "thick";
    else lineweightId = "verythick";

    // Each coordinate set is a wall segment with start and end points
    coordinates.forEach(([[x1, y1], [x2, y2]]) => {
      // Create a wall object compatible with the canvas
      walls.push({
        id: wallId++,
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: lineThickness,
        lineweightId: lineweightId,
        originalStart: { x: x1, y: y1 },
        originalEnd: { x: x2, y: y2 },
        roomName: roomName, // Store room name for identification
        color: roomColor, // Store color for visual distinction
      });
    });
  });

  return walls;
};

/**
 * Get available rooms from floorplan data
 * @param {Object} floorplanData - Floorplan data
 * @returns {Array} - Array of room names
 */
export const getAvailableRooms = (floorplanData) => {
  if (!floorplanData) return [];
  return Object.keys(floorplanData);
};

/**
 * Calculate room dimensions from floorplan data
 * @param {Object} floorplanData - Floorplan data
 * @returns {Object} - Room dimensions {roomName: {width, height, area}}
 */
export const calculateRoomDimensions = (floorplanData) => {
  const dimensions = {};

  Object.entries(floorplanData).forEach(([roomName, coordinates]) => {
    // Extract all x and y coordinates
    const xCoords = coordinates.flatMap(([[x1, y1], [x2, y2]]) => [x1, x2]);
    const yCoords = coordinates.flatMap(([[x1, y1], [x2, y2]]) => [y1, y2]);

    // Calculate min/max to get bounding box
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    // Calculate dimensions
    const width = maxX - minX;
    const height = maxY - minY;
    const area = width * height;

    dimensions[roomName] = {
      width: parseFloat(width.toFixed(2)),
      height: parseFloat(height.toFixed(2)),
      area: parseFloat(area.toFixed(2)),
    };
  });

  return dimensions;
};
