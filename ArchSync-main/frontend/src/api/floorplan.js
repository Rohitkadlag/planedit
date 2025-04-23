import { API } from "./auth";

/**
 * Generate a floorplan based on template and flat area
 * @param {string} template - Template ID (e.g. "1BHK_template5")
 * @param {number} flatArea - Area of the flat in square meters
 * @param {string} type - Type of flat (e.g. "1BHK", "2BHK")
 * @returns {Promise} - Promise resolving to the floorplan data
 */
export const generateFloorplan = async (template, flatArea, type) => {
  try {
    const res = await fetch(`${API}/api/generate_floorplan/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template,
        flatArea,
        type,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error generating floorplan:", error);
    throw error;
  }
};

/**
 * Adjust dimensions of a room in the floorplan
 * @param {Object} roomDimensions - Dimensions for each room
 * @param {Object} floorplanData - Current floorplan data
 * @param {string} freeze - Whether to freeze the area ("Yes" or "No")
 * @returns {Promise} - Promise resolving to the adjusted floorplan data
 */
export const adjustDimensions = async (
  roomDimensions,
  floorplanData,
  freeze
) => {
  try {
    const res = await fetch(`${API}/api/adjust_dimension/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomDimensions,
        data: floorplanData,
        freeze,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error adjusting dimensions:", error);
    throw error;
  }
};

/**
 * Add a new room to the floorplan
 * @param {string} roomName - Name of the new room
 * @param {string} adjacentRoom - Name of adjacent room to attach to
 * @param {string} direction - Direction to place room ("Top", "Bottom", "Left", "Right")
 * @param {number} area - Area of the room in square meters
 * @param {number} roomWidth - Width of the room
 * @param {number} roomHeight - Height of the room
 * @param {Object} coordinates - Current floorplan coordinates
 * @returns {Promise} - Promise resolving to the updated floorplan
 */
export const addNewRoom = async (
  roomName,
  adjacentRoom,
  direction,
  area,
  roomWidth,
  roomHeight,
  coordinates
) => {
  try {
    const res = await fetch(`${API}/api/add_new_room/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName,
        adjacentRoom,
        direction,
        area,
        roomWidth,
        roomHeight,
        coordinates,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error adding new room:", error);
    throw error;
  }
};
