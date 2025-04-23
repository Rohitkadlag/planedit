import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Stage, Layer, Rect, Circle, Text } from "react-konva";

// Components
import WallTool from "../components/WallTool";
import ToolControls from "../components/ToolControls";
import StatusBar from "../components/StatusBar";
import ExportButton from "../components/ExportButton";
import WallEditor from "../components/WallEditor";
import FloorplanPanel from "../components/FloorplanPanel";
// Import FloorplanPanel
import RoomInfoPanel from "../components/RoomInfoPanel"; // Import RoomInfoPanel
import { convertWallsToFloorplan } from "../utils/floorplanUtils"; // Import wall conversion utility

// Constants and Utils
import { DEFAULT_ZOOM } from "../components/constants/paperSizes";

import {
  screenToCanvasCoordinates,
  canvasToScreenCoordinates,
  getDistance,
  calculateContentBounds,
} from "../utils/coordinateUtils";

import { initHistory, addToHistory, undo, redo } from "../utils/historyUtils";

import { useKeyboardShortcuts } from "../utils/keyboardHooks";

import { getOptimalPixelRatio, getCanvasHQStyles } from "../utils/renderUtils";

// Simple throttle utility
function throttle(callback, delay = 10) {
  let previousCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - previousCall < delay) {
      return;
    }
    previousCall = now;
    return callback(...args);
  };
}

// Update in both CanvasPage.jsx and WallTool.jsx
const exactPointMatch = (p1, p2) => {
  if (!p1 || !p2) return false;

  // Convert to numbers and round to 6 decimal places for precision
  const x1 = Math.round(Number(p1.x) * 1000000) / 1000000;
  const y1 = Math.round(Number(p1.y) * 1000000) / 1000000;
  const x2 = Math.round(Number(p2.x) * 1000000) / 1000000;
  const y2 = Math.round(Number(p2.y) * 1000000) / 1000000;

  // Use exact equality after rounding
  return x1 === x2 && y1 === y2;
};

// Find the exact endpoint that matches a given point
const findExactEndpoint = (point, allWalls) => {
  if (!point || !allWalls || allWalls.length === 0) return null;

  for (const wall of allWalls) {
    // Make sure we're comparing the original coordinates, not the screen-transformed ones
    const start = wall.originalStart || wall.start;
    const end = wall.originalEnd || wall.end;

    if (exactPointMatch(point, start)) return { ...start, sourceWall: wall };
    if (exactPointMatch(point, end)) return { ...end, sourceWall: wall };
  }

  return null;
};

const getAllWallVertices = (walls) => {
  const uniquePoints = [];

  for (const wall of walls) {
    const points = [wall.start, wall.end, wall.originalStart, wall.originalEnd];

    for (const pt of points) {
      if (!pt) continue;

      const exists = uniquePoints.some(
        (p) => Math.abs(p.x - pt.x) < 0.01 && Math.abs(p.y - pt.y) < 0.01
      );
      if (!exists) uniquePoints.push({ x: pt.x, y: pt.y });
    }
  }

  return uniquePoints;
};

const findClosestVertex = (point, allWalls, threshold = 10) => {
  const allPoints = getAllWallVertices(allWalls);
  let minDist = Infinity;
  let closest = null;

  for (const pt of allPoints) {
    const dist = Math.hypot(pt.x - point.x, pt.y - point.y);
    if (dist < minDist && dist < threshold) {
      minDist = dist;
      closest = pt;
    }
  }

  return closest;
};

const findClosestEndpoint = (point, allWalls, threshold = 5) => {
  if (!point || !allWalls || allWalls.length === 0) return null;

  // First check for exact matches
  const exactMatch = findExactEndpoint(point, allWalls);
  if (exactMatch) return exactMatch;

  let closestPoint = null;
  let minDistance = Infinity;
  let sourceWall = null;
  let isStartPoint = false;

  for (const wall of allWalls) {
    // Make sure we're comparing the original coordinates, not the screen-transformed ones
    const start = wall.originalStart || wall.start;
    const end = wall.originalEnd || wall.end;

    // Check start point
    const startDist = Math.hypot(point.x - start.x, point.y - start.y);
    if (startDist < minDistance && startDist < threshold) {
      minDistance = startDist;
      closestPoint = { ...start };
      sourceWall = wall;
      isStartPoint = true;
    }

    // Check end point
    const endDist = Math.hypot(point.x - end.x, point.y - end.y);
    if (endDist < minDistance && endDist < threshold) {
      minDistance = endDist;
      closestPoint = { ...end };
      sourceWall = wall;
      isStartPoint = false;
    }
  }

  // Only return a point if we're really close to it
  if (minDistance < threshold) {
    // Use the EXACT coordinates from the wall's endpoint
    return {
      x: isStartPoint ? sourceWall.start.x : sourceWall.end.x,
      y: isStartPoint ? sourceWall.start.y : sourceWall.end.y,
      sourceWall: sourceWall,
      isStartPoint: isStartPoint,
    };
  }

  return null;
};

// STATIC

// Function to create this specific floorplan
// Function to create floorplan based on the new image with measurements in meters
// Function to create 1 BHK floorplan with measurements in feet and inches
// Function to create 1 BHK floorplan with proper coordinate handling
// Function to create a floorplan from template data
const createCustomFloorplan = () => {
  // Reset any existing walls
  setWalls([]);

  // Template data from your JSON (template3)
  const templateData = {
    "Master Bedroom": [
      [
        [49.36, 50],
        [57.25, 50],
      ],
      [
        [57.25, 50],
        [57.25, 39.66],
      ],
      [
        [57.25, 39.66],
        [49.36, 39.66],
      ],
      [
        [49.36, 39.66],
        [49.36, 50],
      ],
    ],
    "En suite Washroom": [
      [
        [52.14, 54.11],
        [57.25, 54.11],
      ],
      [
        [57.25, 54.11],
        [57.25, 50.0],
      ],
      [
        [57.25, 50.0],
        [52.14, 50.0],
      ],
      [
        [52.14, 50.0],
        [52.14, 54.11],
      ],
    ],
    "Common Washroom": [
      [
        [49.36, 57.88],
        [54.93, 57.88],
      ],
      [
        [54.93, 57.88],
        [54.93, 54.11],
      ],
      [
        [54.93, 54.11],
        [49.36, 54.11],
      ],
      [
        [49.36, 54.11],
        [49.36, 57.88],
      ],
    ],
    "Living Room": [
      [
        [40.34, 55.88],
        [49.36, 55.88],
      ],
      [
        [49.36, 55.88],
        [49.36, 44.24],
      ],
      [
        [49.36, 44.24],
        [40.34, 44.24],
      ],
      [
        [40.34, 44.24],
        [40.34, 55.88],
      ],
    ],
    Kitchen: [
      [
        [33.66, 51.07],
        [40.34, 51.07],
      ],
      [
        [40.34, 51.07],
        [40.34, 42.09],
      ],
      [
        [40.34, 42.09],
        [33.66, 42.09],
      ],
      [
        [33.66, 42.09],
        [33.66, 51.07],
      ],
    ],
    Passage: [
      [
        [49.36, 54.11],
        [52.14, 54.11],
      ],
      [
        [52.14, 54.11],
        [52.14, 50.0],
      ],
      [
        [52.14, 50.0],
        [49.36, 50.0],
      ],
      [
        [49.36, 50.0],
        [49.36, 54.11],
      ],
    ],
  };

  // Canvas dimensions
  const canvasWidth = stageSize.width;
  const canvasHeight = stageSize.height;

  // Calculate the bounds of the template data to determine scaling
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  // Find the min/max coordinates
  Object.values(templateData).forEach((room) => {
    room.forEach((wall) => {
      wall.forEach((point) => {
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
      });
    });
  });

  // Calculate template dimensions
  const templateWidth = maxX - minX;
  const templateHeight = maxY - minY;

  // Calculate scaling to fit canvas (use 80% of canvas size)
  const scaleX = (canvasWidth * 0.8) / templateWidth;
  const scaleY = (canvasHeight * 0.8) / templateHeight;
  const scale = Math.min(scaleX, scaleY);

  // Calculate offset to center the template
  const offsetX = (canvasWidth - templateWidth * scale) / 2;
  const offsetY = (canvasHeight - templateHeight * scale) / 2;

  // Color mapping for different room types
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

  // Create walls for the floorplan
  const newWalls = [];
  let wallId = 0;

  Object.entries(templateData).forEach(([roomName, walls]) => {
    // Get room color (or default to light gray)
    const roomColor = roomColors[roomName] || "#D3D3D3";

    // Create a wall for each segment
    walls.forEach(([[x1, y1], [x2, y2]]) => {
      // Apply scaling and offset
      const scaledX1 = (x1 - minX) * scale + offsetX;
      const scaledY1 = (y1 - minY) * scale + offsetY;
      const scaledX2 = (x2 - minX) * scale + offsetX;
      const scaledY2 = (y2 - minY) * scale + offsetY;

      // Create the wall object
      newWalls.push({
        id: wallId++,
        start: { x: scaledX1, y: scaledY1 },
        end: { x: scaledX2, y: scaledY2 },
        points: [scaledX1, scaledY1, scaledX2, scaledY2],
        thickness: 30,
        color: roomColor,
        originalStart: { x: scaledX1, y: scaledY1 },
        originalEnd: { x: scaledX2, y: scaledY2 },
        roomName: roomName,
      });
    });
  });

  // Set the walls
  setWalls(newWalls);
};

// Force snap a wall to connect at endpoints if possible
// Improved to handle proper corner connections and thickness inheritance
const forceSnapWall = (wall, allWalls) => {
  if (!wall || !allWalls || allWalls.length === 0) return wall;

  // Try to find snap points for both ends with increased precision
  const snappedStart = findClosestEndpoint(wall.start, allWalls, 20); // Increased snap radius further
  const snappedEnd = findClosestEndpoint(wall.end, allWalls, 20);

  // Ensure we inherit thickness from connected walls
  let newThickness = wall.thickness || 30; // Default 30mm

  if (snappedStart && snappedStart.sourceWall) {
    newThickness = snappedStart.sourceWall.thickness || newThickness;
  } else if (snappedEnd && snappedEnd.sourceWall) {
    newThickness = snappedEnd.sourceWall.thickness || newThickness;
  }

  // Use the EXACT coordinates from the wall endpoints when snapping
  // Create new objects to avoid reference issues
  let newStart = snappedStart
    ? {
        x: Number(snappedStart.x),
        y: Number(snappedStart.y),
        sourceWall: snappedStart.sourceWall,
      }
    : { ...wall.start };

  let newEnd = snappedEnd
    ? {
        x: Number(snappedEnd.x),
        y: Number(snappedEnd.y),
        sourceWall: snappedEnd.sourceWall,
      }
    : { ...wall.end };

  // Calculate the length based on the new endpoints
  const dx = newEnd.x - newStart.x;
  const dy = newEnd.y - newStart.y;
  const newLength = Math.sqrt(dx * dx + dy * dy);

  // Return the updated wall with snapped points, inherited thickness, and calculated length
  return {
    ...wall,
    thickness: newThickness,
    length: newLength,
    start: newStart,
    end: newEnd,
    originalStart: { ...newStart },
    originalEnd: { ...newEnd },
  };
};

const getAngleBetweenWalls = (prev, next) => {
  if (!prev || !next) return 0;

  const dx1 = prev.end.x - prev.start.x;
  const dy1 = prev.end.y - prev.start.y;
  const dx2 = next.end.x - next.start.x;
  const dy2 = next.end.y - next.start.y;

  const angle1 = Math.atan2(dy1, dx1);
  const angle2 = Math.atan2(dy2, dx2);

  let angleDeg = ((angle2 - angle1) * 180) / Math.PI;
  if (angleDeg > 180) angleDeg -= 360;
  if (angleDeg < -180) angleDeg += 360;

  return angleDeg.toFixed(1); // Show 1 decimal
};

// Check if a line is nearly horizontal or vertical (within threshold degrees)
const isNearlyAligned = (start, end, thresholdDegrees = 2) => {
  if (!start || !end) return null;

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Calculate angle in degrees
  const angleDegrees = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Check if it's nearly horizontal (0° or 180°)
  const isNearlyHorizontal =
    Math.abs(angleDegrees) < thresholdDegrees ||
    Math.abs(Math.abs(angleDegrees) - 180) < thresholdDegrees;

  // Check if it's nearly vertical (90° or 270°)
  const isNearlyVertical =
    Math.abs(Math.abs(angleDegrees) - 90) < thresholdDegrees;

  if (isNearlyHorizontal) return "horizontal";
  if (isNearlyVertical) return "vertical";
  return null;
};

// Add this to CanvasPage.jsx
// This function will ensure all walls share the same exact coordinates at connection points
const normalizeWallConnections = (walls) => {
  if (!walls || walls.length < 2) return walls;

  // First pass: identify all unique endpoints
  const uniquePoints = [];

  for (const wall of walls) {
    // Check start point
    let foundStart = false;
    for (const point of uniquePoints) {
      if (
        Math.abs(wall.start.x - point.x) < 0.01 &&
        Math.abs(wall.start.y - point.y) < 0.01
      ) {
        // Use existing point coordinates exactly
        wall.start.x = point.x;
        wall.start.y = point.y;
        wall.originalStart.x = point.x;
        wall.originalStart.y = point.y;
        foundStart = true;
        break;
      }
    }
    if (!foundStart) {
      uniquePoints.push({ x: wall.start.x, y: wall.start.y });
    }

    // Check end point
    let foundEnd = false;
    for (const point of uniquePoints) {
      if (
        Math.abs(wall.end.x - point.x) < 0.01 &&
        Math.abs(wall.end.y - point.y) < 0.01
      ) {
        // Use existing point coordinates exactly
        wall.end.x = point.x;
        wall.end.y = point.y;
        wall.originalEnd.x = point.x;
        wall.originalEnd.y = point.y;
        foundEnd = true;
        break;
      }
    }
    if (!foundEnd) {
      uniquePoints.push({ x: wall.end.x, y: wall.end.y });
    }
  }

  return walls;
};

/**
 * Main Canvas Page component
 */
const CanvasPage = () => {
  // Refs
  const stageRef = useRef(null);
  const initialCenteringDoneRef = useRef(false);

  // State
  const [walls, setWalls] = useState([]);
  const [previewWall, setPreviewWall] = useState(null);
  const [hoveredEndpoint, setHoveredEndpoint] = useState(null);
  const [cursorStyle, setCursorStyle] = useState("default");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDragWithLeftMouse, setIsDragWithLeftMouse] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isPanMode, setIsPanMode] = useState(false);
  const [isTemporaryPanMode, setIsTemporaryPanMode] = useState(false);
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const [dragStartPosition, setDragStartPosition] = useState(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [hoveredSplitPoint, setHoveredSplitPoint] = useState(null);

  // Wall tool specific state
  const [selectedTool, setSelectedTool] = useState("wall");
  const [selectedWallIndex, setSelectedWallIndex] = useState(-1);
  const [showWallEditor, setShowWallEditor] = useState(false);

  // New state for tracking drawing sessions
  const [drawingStartPoint, setDrawingStartPoint] = useState(null);
  const [isDrawingChain, setIsDrawingChain] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // History state for undo/redo
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize history
  useEffect(() => {
    const initialHistory = initHistory(walls);
    setHistory(initialHistory.history);
    setCurrentIndex(initialHistory.currentIndex);
    setCanUndo(initialHistory.canUndo);
    setCanRedo(initialHistory.canRedo);
  }, []);

  // Define expanded infinite canvas dimensions (800,000 meters = 800,000,000 mm)
  const canvasDimensions = useMemo(() => {
    return {
      width: 800000000, // 800,000 meters in mm
      height: 800000000, // 800,000 meters in mm
    };
  }, []);

  // Configure high-DPI rendering when stage is available
  useEffect(() => {
    // Only run once after the stage has been mounted
    if (stageRef.current) {
      try {
        const stage = stageRef.current.getStage();
        if (stage) {
          // Force a redraw
          stage.batchDraw();
        }
      } catch (err) {
        console.warn("Could not configure stage:", err);
      }
    }
  }, []);

  // Update stage size on window resize
  useEffect(() => {
    const handleResize = () => {
      // Set stage to fit container with some padding
      const containerWidth = window.innerWidth - 40;
      const containerHeight = window.innerHeight - 200;
      setStageSize({ width: containerWidth, height: containerHeight });
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Center viewport initially
  useEffect(() => {
    // Only center if this is the first load and we're not dragging
    if (!initialCenteringDoneRef.current && !isDragging) {
      setPan({
        x: stageSize.width / 2,
        y: stageSize.height / 2,
      });
      initialCenteringDoneRef.current = true;
    }
  }, [stageSize, isDragging]);

  const getClosestPointOnSegment = (A, B, P) => {
    const APx = P.x - A.x;
    const APy = P.y - A.y;
    const ABx = B.x - A.x;
    const ABy = B.y - A.y;
    const ab2 = ABx * ABx + ABy * ABy;
    const ap_ab = APx * ABx + APy * ABy;
    const t = Math.max(0, Math.min(1, ab2 === 0 ? 0 : ap_ab / ab2));
    return {
      x: A.x + ABx * t,
      y: A.y + ABy * t,
      t,
    };
  };

  // Handle temporary pan mode toggling from keyboard shortcuts
  const handleTogglePanMode = useCallback((active) => {
    setIsTemporaryPanMode(active);
    setCursorStyle(active ? "grab" : "default");
    // DO NOT reset pan position when toggling modes
  }, []);

  // Toggle snap functionality
  const toggleSnap = useCallback(() => {
    setSnapEnabled((prev) => !prev);
  }, []);

  // Handle wall clicks - for selecting and editing
  const handleWallClick = useCallback(
    (index) => {
      if (selectedTool === "select") {
        setSelectedWallIndex(index);
        setShowWallEditor(true);
      }
    },
    [selectedTool]
  );

  // Handle wall property updates
  const handleUpdateWall = useCallback(
    (updatedWall) => {
      setWalls((prevWalls) => {
        const newWalls = [...prevWalls];
        if (selectedWallIndex >= 0 && selectedWallIndex < newWalls.length) {
          // Ensure originalStart and originalEnd properties exist
          if (!updatedWall.originalStart && updatedWall.start) {
            updatedWall.originalStart = { ...updatedWall.start };
          }
          if (!updatedWall.originalEnd && updatedWall.end) {
            updatedWall.originalEnd = { ...updatedWall.end };
          }

          newWalls[selectedWallIndex] = updatedWall;
        }

        // Apply normalization BEFORE updating history
        const normalizedWalls = normalizeWallConnections(newWalls);

        // Add to history
        const historyUpdate = addToHistory(
          history,
          currentIndex,
          normalizedWalls
        );
        setHistory(historyUpdate.history);
        setCurrentIndex(historyUpdate.currentIndex);
        setCanUndo(true);
        setCanRedo(false);

        return normalizedWalls;
      });

      setShowWallEditor(false);
    },
    [selectedWallIndex, history, currentIndex]
  );

  // Cancel wall editing
  const handleCancelWallEdit = useCallback(() => {
    setShowWallEditor(false);
    setSelectedWallIndex(-1);
  }, []);

  const [floorplanData, setFloorplanData] = useState(null);

  const handleImportFloorplan = useCallback(
    (floorplanWalls, rawFloorplanData) => {
      if (!floorplanWalls || floorplanWalls.length === 0) return;

      // Clear existing walls
      setWalls(floorplanWalls);

      // Store the raw floorplan data for use with the info panel
      setFloorplanData(rawFloorplanData);

      // Reset drawing state
      setPreviewWall(null);
      setIsDrawingChain(false);
      setDrawingStartPoint(null);
      setSelectedWallIndex(-1);
      setShowWallEditor(false);

      // Add to history
      const historyUpdate = addToHistory(history, currentIndex, floorplanWalls);
      setHistory(historyUpdate.history);
      setCurrentIndex(historyUpdate.currentIndex);
      setCanUndo(true);
      setCanRedo(false);

      // Center the view on the imported floorplan
      centerViewOnContent(floorplanWalls);
    },
    [history, currentIndex]
  );

  // Function to center the view on the content
  const centerViewOnContent = useCallback(() => {
    if (walls.length === 0) return;

    // Calculate content bounds
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    // Find the extent of all walls
    walls.forEach((wall) => {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      minY = Math.min(minY, wall.start.y, wall.end.y);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      maxY = Math.max(maxY, wall.start.y, wall.end.y);
    });

    // Add some padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Calculate required zoom to fit content
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    // Calculate zoom level to fit the content
    const scaleX = stageSize.width / contentWidth;
    const scaleY = stageSize.height / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1.0); // Don't zoom in more than 100%

    // Set the new zoom
    setZoom(newZoom);

    // Center the view on the content
    const newPanX = stageSize.width / 2 - contentCenterX * newZoom;
    const newPanY = stageSize.height / 2 - contentCenterY * newZoom;

    // Update the pan
    setPan({
      x: newPanX,
      y: newPanY,
    });
  }, [walls, stageSize]);

  // IMPORTANT: Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space key for temporary pan
      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        setIsTemporaryPanMode(true);
        setCursorStyle("grab");
      }

      // Shift key for precision drawing and disabling snap
      if (e.key === "Shift" && !e.repeat) {
        e.preventDefault();
        setIsShiftPressed(true);
        setSnapEnabled(false);
      }

      // Escape key to cancel current drawing or selection
      if (e.key === "Escape") {
        e.preventDefault();
        setPreviewWall(null);
        setSelectedWallIndex(-1);
        setShowWallEditor(false);

        // Reset the drawing chain entirely - this was modified for continuous drawing
        setIsDrawingChain(false);
        setDrawingStartPoint(null);
      }

      // H key for forcing horizontal line (while drawing)
      if (e.key === "h" && previewWall) {
        e.preventDefault();
        setPreviewWall((current) => ({
          ...current,
          end: {
            ...current.end,
            y: current.start.y,
          },
        }));
      }

      // V key for forcing vertical line (while drawing)
      if (e.key === "v" && previewWall) {
        e.preventDefault();
        setPreviewWall((current) => ({
          ...current,
          end: {
            ...current.end,
            x: current.start.x,
          },
        }));
      }
    };

    const handleKeyUp = (e) => {
      // Space key for temporary pan
      if (e.key === " ") {
        e.preventDefault();
        setIsTemporaryPanMode(false);
        setCursorStyle(isPanMode ? "grab" : "default");
      }

      // Restore snap when Shift is released
      if (e.key === "Shift") {
        e.preventDefault();
        setIsShiftPressed(false);
        setSnapEnabled(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPanMode, previewWall, isDrawingChain]);
  console.log("walls", walls);
  // Check if we can close the current shape
  const canCloseShape = useCallback(
    (endPoint) => {
      if (!drawingStartPoint || !endPoint) return false;

      // We can close if end point is near the start point (reduced threshold)
      const distance = Math.hypot(
        endPoint.x - drawingStartPoint.x,
        endPoint.y - drawingStartPoint.y
      );

      return distance < 5 && walls.length > 0;
    },
    [drawingStartPoint, walls]
  );

  const rescaleAndCenterDrawing = useCallback(() => {
    if (walls.length === 0) return;

    // 1. Calculate current bounds
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    walls.forEach((wall) => {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      minY = Math.min(minY, wall.start.y, wall.end.y);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      maxY = Math.max(maxY, wall.start.y, wall.end.y);
    });

    // 2. Calculate current dimensions
    const currentWidth = maxX - minX;
    const currentHeight = maxY - minY;

    // 3. Define target size (make it larger to be more visible)
    // This makes the drawing fill 70% of the canvas width or height
    const targetWidth = stageSize.width * 0.7;
    const targetHeight = stageSize.height * 0.7;

    // 4. Calculate scale factor to fit the drawing at a good size
    const scaleX = targetWidth / currentWidth;
    const scaleY = targetHeight / currentHeight;
    const scale = Math.min(scaleX, scaleY);

    // 5. Calculate new coordinates for walls
    const newWalls = walls.map((wall) => {
      // Translate to origin first
      const startX = (wall.start.x - minX) * scale;
      const startY = (wall.start.y - minY) * scale;
      const endX = (wall.end.x - minX) * scale;
      const endY = (wall.end.y - minY) * scale;

      // Add padding to center in view
      const paddingX = (stageSize.width - currentWidth * scale) / 2;
      const paddingY = (stageSize.height - currentHeight * scale) / 2;

      return {
        ...wall,
        start: {
          x: startX + paddingX,
          y: startY + paddingY,
        },
        end: {
          x: endX + paddingX,
          y: endY + paddingY,
        },
        originalStart: {
          x: startX + paddingX,
          y: startY + paddingY,
        },
        originalEnd: {
          x: endX + paddingX,
          y: endY + paddingY,
        },
      };
    });

    // 6. Update the walls with rescaled coordinates
    setWalls(newWalls);

    // 7. Reset zoom and pan
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, [walls, stageSize]);

  // Improved handleMouseDown function
  const handleMouseDown = (e) => {
    // Get stage and point
    const stage = e.target.getStage();
    if (!stage) return;

    const point = stage.getPointerPosition();

    // If right mouse button or middle button is pressed, enable pan
    if (e.evt.button === 2 || e.evt.button === 1) {
      setIsDragging(true);
      setLastPointerPosition(point);
      setCursorStyle("grabbing");
      return;
    }

    // Handle left click with space key pressed (pan mode)
    if (e.evt.button === 0 && (isPanMode || isTemporaryPanMode)) {
      setIsDragging(true);
      setIsDragWithLeftMouse(true);
      setLastPointerPosition(point);
      setCursorStyle("grabbing");
      return;
    }

    // Skip if in select mode
    if (selectedTool === "select") return;

    // Convert to canvas coordinates
    const canvasPoint = screenToCanvasCoordinates(point, pan, zoom);

    // Check if we clicked on an endpoint (for continuing wall from endpoint)
    if (hoveredEndpoint) {
      // Start a new wall from the hovered endpoint
      const sourceWallThickness = hoveredEndpoint.sourceWall
        ? hoveredEndpoint.sourceWall.thickness
        : 30; // Use the source wall's thickness

      // Use exact coordinates from the hovered endpoint to ensure precise connections
      setPreviewWall({
        start: {
          x: hoveredEndpoint.x,
          y: hoveredEndpoint.y,
          sourceWall: hoveredEndpoint.sourceWall,
        },
        end: canvasPoint,
        thickness: sourceWallThickness, // Inherit thickness from the source wall
        originalStart: {
          x: hoveredEndpoint.x,
          y: hoveredEndpoint.y,
          sourceWall: hoveredEndpoint.sourceWall,
        },
        originalEnd: canvasPoint,
      });
      setDrawingStartPoint({
        x: hoveredEndpoint.x,
        y: hoveredEndpoint.y,
        sourceWall: hoveredEndpoint.sourceWall,
      });
      setIsDrawingChain(true);
      return;
    }

    let mergeTarget = null;
    let closestPoint = null;
    let minDistance = 10; // ← threshold in mm for merge detection

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      const projection = getClosestPointOnSegment(
        wall.start,
        wall.end,
        canvasPoint
      );
      const distance = Math.hypot(
        canvasPoint.x - projection.x,
        canvasPoint.y - projection.y
      );

      if (distance < minDistance) {
        mergeTarget = { wall, index: i };
        closestPoint = projection;
        minDistance = distance;
      }
    }

    if (mergeTarget && closestPoint) {
      const { wall: targetWall, index: targetIndex } = mergeTarget;

      const thickness = targetWall.thickness || 30;

      const splitPoint = {
        x: Math.round(closestPoint.x * 1000000) / 1000000,
        y: Math.round(closestPoint.y * 1000000) / 1000000,
      };

      const wall1 = {
        ...targetWall,
        end: splitPoint,
        originalEnd: splitPoint,
      };

      const wall2 = {
        ...targetWall,
        start: splitPoint,
        originalStart: splitPoint,
      };

      const updatedWalls = [...walls];
      updatedWalls.splice(targetIndex, 1, wall1, wall2);
      setWalls(updatedWalls);

      setPreviewWall({
        start: splitPoint,
        end: canvasPoint,
        thickness: thickness,
        originalStart: splitPoint,
        originalEnd: canvasPoint,
      });

      setDrawingStartPoint(splitPoint);
      setIsDrawingChain(true);
      return;
    }

    // If we don't have a preview wall, start one
    if (!previewWall) {
      setPreviewWall({
        start: canvasPoint,
        end: canvasPoint,
        thickness: 30, // Default 30mm thickness
        originalStart: canvasPoint,
        originalEnd: canvasPoint,
      });
      setDrawingStartPoint(canvasPoint);
    }
    // If we do have a preview, finish it and start a new one
    else {
      // Find the current thickness - either from preview or apply snapping
      const currentThickness = previewWall.thickness || 30;

      // Add the wall
      const newWall = {
        start: previewWall.start,
        end: previewWall.end,
        thickness: currentThickness,
        originalStart: previewWall.start,
        originalEnd: previewWall.end,
      };

      // Apply snapping if enabled
      const finalWall = snapEnabled ? forceSnapWall(newWall, walls) : newWall;

      setWalls((prev) => [...prev, finalWall]);

      // Start new wall from end of this one
      setPreviewWall({
        start: {
          x: finalWall.end.x,
          y: finalWall.end.y,
          sourceWall: finalWall,
        },
        end: canvasPoint,
        thickness: finalWall.thickness, // Maintain thickness for continuous drawing
        originalStart: {
          x: finalWall.end.x,
          y: finalWall.end.y,
          sourceWall: finalWall,
        },
        originalEnd: canvasPoint,
      });
      setDrawingStartPoint({
        x: finalWall.end.x,
        y: finalWall.end.y,
        sourceWall: finalWall,
      });
      setIsDrawingChain(true);
    }
  };

  // Mouse move handler - critical for panning and drawing
  const handleMouseMove = useCallback(
    (e) => {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();

      // Always update hovered position for status bar
      const paperPoint = screenToCanvasCoordinates(pointerPosition, pan, zoom);
      setHoveredPosition(paperPoint);

      // Handle panning
      if (
        isDragging &&
        (isPanMode ||
          isTemporaryPanMode ||
          e.evt.button === 1 ||
          isDragWithLeftMouse)
      ) {
        if (lastPointerPosition) {
          const dx = pointerPosition.x - lastPointerPosition.x;
          const dy = pointerPosition.y - lastPointerPosition.y;

          // CRITICAL: Always use the function form of setState
          setPan((prevPan) => ({
            x: prevPan.x + dx,
            y: prevPan.y + dy,
          }));
        }

        setLastPointerPosition(pointerPosition);
        return;
      }

      // Check for endpoint hovering (for wall continuation)
      if (!isDragging && selectedTool === "wall") {
        // Convert screen position to canvas coordinates
        const canvasPoint = screenToCanvasCoordinates(
          pointerPosition,
          pan,
          zoom
        );
        let closestWall = null;
        let closestProjection = null;
        let minDist = 10;

        for (let wall of walls) {
          const proj = getClosestPointOnSegment(
            wall.start,
            wall.end,
            canvasPoint
          );
          const dist = Math.hypot(
            proj.x - canvasPoint.x,
            proj.y - canvasPoint.y
          );

          if (dist < minDist) {
            closestWall = wall;
            closestProjection = proj;
            minDist = dist;
          }
        }

        if (closestProjection) {
          setHoveredSplitPoint({
            x: closestProjection.x,
            y: closestProjection.y,
          });
        } else {
          setHoveredSplitPoint(null);
        }

        // Try to find a nearby endpoint
        const nearbyEndpoint = findClosestVertex(canvasPoint, walls, 10);

        if (nearbyEndpoint) {
          setHoveredEndpoint(nearbyEndpoint);
          setCursorStyle("pointer");
        } else if (hoveredEndpoint) {
          setHoveredEndpoint(null);
          setCursorStyle("default");
        }
      }

      // Drawing mode for walls
      if (!previewWall || selectedTool !== "wall") return;

      setPreviewWall((current) => {
        if (!current) return null;
        const endPoint = screenToCanvasCoordinates(pointerPosition, pan, zoom);

        // Check if we can close the shape
        if (canCloseShape(endPoint) && isDrawingChain) {
          return {
            ...current,
            end: drawingStartPoint,
            originalEnd: drawingStartPoint,
          };
        }

        // Check if we're nearly aligned for strict horizontal/vertical alignment
        const alignmentType = isNearlyAligned(current.start, endPoint);
        if (alignmentType) {
          // Force alignment based on type
          if (alignmentType === "horizontal") {
            const horizontalPoint = {
              x: endPoint.x,
              y: current.start.y, // Force exact horizontal alignment
            };
            return {
              ...current,
              end: horizontalPoint,
              originalEnd: horizontalPoint,
            };
          } else if (alignmentType === "vertical") {
            const verticalPoint = {
              x: current.start.x, // Force exact vertical alignment
              y: endPoint.y,
            };
            return {
              ...current,
              end: verticalPoint,
              originalEnd: verticalPoint,
            };
          }
        }

        return {
          ...current,
          end: endPoint,
          originalEnd: endPoint,
        };
      });
    },
    [
      isDragging,
      isPanMode,
      isTemporaryPanMode,
      previewWall,
      pan,
      zoom,
      lastPointerPosition,
      drawingStartPoint,
      canCloseShape,
      isDrawingChain,
      selectedTool,
      hoveredEndpoint,
      walls,
    ]
  );

  // Improved handleMouseUp function
  const handleMouseUp = useCallback(
    (e) => {
      // Reset cursor styles
      if (isPanMode) {
        document.body.style.cursor = "grab";
        setCursorStyle("grab");
      } else if (isTemporaryPanMode) {
        document.body.style.cursor = "grab";
        setCursorStyle("grab");
      } else {
        document.body.style.cursor = "default";
        setCursorStyle("default");
      }

      // CRITICAL: Just stop dragging mode, DO NOT reset pan position
      if (
        isDragging &&
        (isPanMode ||
          isTemporaryPanMode ||
          e.evt.button === 1 ||
          isDragWithLeftMouse)
      ) {
        setIsDragging(false);
        setIsDragWithLeftMouse(false);
        setLastPointerPosition(null);
        return;
      }

      // Drawing mode - place the wall and continue the chain
      if (previewWall && selectedTool === "wall") {
        // Only add wall if it has a meaningful length
        const distance = getDistance(previewWall.start, previewWall.end);

        if (distance > 2) {
          // Minimum threshold in mm
          let finalWall = previewWall;

          // Check if we're closing a shape
          if (canCloseShape(previewWall.end) && isDrawingChain) {
            finalWall = {
              ...previewWall,
              end: {
                x: drawingStartPoint.x,
                y: drawingStartPoint.y,
                sourceWall: drawingStartPoint.sourceWall,
              },
              originalEnd: {
                x: drawingStartPoint.x,
                y: drawingStartPoint.y,
                sourceWall: drawingStartPoint.sourceWall,
              },
            };

            // When closing a shape, continue the chain from the endpoint
            const firstPointInChain = drawingStartPoint;
            setDrawingStartPoint(firstPointInChain);
          }
          // Apply snapping only if enabled
          else if (snapEnabled) {
            finalWall = forceSnapWall(previewWall, walls);

            // Set the end point as the new start point for continuous drawing
            setDrawingStartPoint({
              x: finalWall.end.x,
              y: finalWall.end.y,
              sourceWall: finalWall,
            });
          } else {
            // Continue from the end point
            setDrawingStartPoint({
              x: finalWall.end.x,
              y: finalWall.end.y,
              sourceWall: finalWall,
            });
          }

          // Ensure originalStart and originalEnd are set
          if (!finalWall.originalStart) {
            finalWall.originalStart = { ...finalWall.start };
          }
          if (!finalWall.originalEnd) {
            finalWall.originalEnd = { ...finalWall.end };
          }

          const newWalls = [...walls, finalWall];
          const normalizedWalls = normalizeWallConnections(newWalls);
          setWalls(normalizedWalls);

          // Add to history
          const historyUpdate = addToHistory(
            history,
            currentIndex,
            normalizedWalls
          );
          setHistory(historyUpdate.history);
          setCurrentIndex(historyUpdate.currentIndex);
          setCanUndo(true);
          setCanRedo(false);
        }

        // Clear the preview wall but keep the chain active
        setPreviewWall(null);
        // Explicitly keep isDrawingChain true for continuous drawing
        setIsDrawingChain(true);
      }

      // Reset drag start position
      setDragStartPosition(null);
    },
    [
      isPanMode,
      isTemporaryPanMode,
      isDragging,
      isDragWithLeftMouse,
      previewWall,
      walls,
      history,
      currentIndex,
      snapEnabled,
      drawingStartPoint,
      canCloseShape,
      isDrawingChain,
      selectedTool,
    ]
  );

  // Handle zoom with wheel - modified to allow much finer zoom control down to 0.001
  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault();

      // Smaller scale factor for more precise zooming
      const scaleBy = 1.05;
      const stage = e.target.getStage();
      const oldScale = zoom;
      const pointerPos = stage.getPointerPosition();

      const mousePointTo = {
        x: (pointerPos.x - pan.x) / oldScale,
        y: (pointerPos.y - pan.y) / oldScale,
      };

      // Determine direction (zoom in or out)
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      // Apply updated limits to allow zooming down to 0.001 (very detailed view)
      // And zooming out to see the full 800,000 meters
      const constrainedScale = Math.max(0.0001, Math.min(10, newScale));

      // Only update if scale changed
      if (constrainedScale !== oldScale) {
        setZoom(constrainedScale);

        const newPos = {
          x: pointerPos.x - mousePointTo.x * constrainedScale,
          y: pointerPos.y - mousePointTo.y * constrainedScale,
        };

        setPan(newPos);
      }
    },
    [zoom, pan]
  );

  // Endpoint interaction handlers
  const handleEndpointHover = useCallback((point) => {
    setHoveredEndpoint(point);
    setCursorStyle("pointer");
  }, []);

  const handleEndpointLeave = useCallback(() => {
    setHoveredEndpoint(null);
    setCursorStyle("default");
  }, []);

  // Clear all walls with confirmation
  const handleClear = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all walls?")) {
      setWalls([]);
      setIsDrawingChain(false);
      setDrawingStartPoint(null);
      setSelectedWallIndex(-1);
      setShowWallEditor(false);

      // Add empty state to history (no need to normalize empty array)
      const historyUpdate = addToHistory(history, currentIndex, []);
      setHistory(historyUpdate.history);
      setCurrentIndex(historyUpdate.currentIndex);
      setCanUndo(true);
      setCanRedo(false);
    }
  }, [history, currentIndex]);

  // Toggle between draw and pan modes
  const toggleMode = useCallback(() => {
    const newPanMode = !isPanMode;
    setIsPanMode(newPanMode);
    setCursorStyle(newPanMode ? "grab" : "default");
    setPreviewWall(null); // Clear any preview wall

    // Also clear drawing chain when switching to pan mode
    if (newPanMode) {
      setIsDrawingChain(false);
      setDrawingStartPoint(null);
    }
  }, [isPanMode]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    const result = undo(history, currentIndex);
    // Apply normalization here too
    const normalizedWalls = normalizeWallConnections(result.walls);
    setWalls(normalizedWalls);
    setHistory(result.history);
    setCurrentIndex(result.currentIndex);
    setCanUndo(result.canUndo);
    setCanRedo(result.canRedo);

    // Clear drawing chain when undoing
    setIsDrawingChain(false);
    setDrawingStartPoint(null);
    setSelectedWallIndex(-1);
    setShowWallEditor(false);
  }, [history, currentIndex, canUndo]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (!canRedo) return;

    const result = redo(history, currentIndex);
    // Apply normalization here too
    const normalizedWalls = normalizeWallConnections(result.walls);
    setWalls(normalizedWalls);
    setHistory(result.history);
    setCurrentIndex(result.currentIndex);
    setCanUndo(result.canUndo);
    setCanRedo(result.canRedo);
  }, [history, currentIndex, canRedo]);

  // Register keyboard shortcuts with memoized handlers
  useKeyboardShortcuts(
    useMemo(
      () => ({
        onUndo: handleUndo,
        onRedo: handleRedo,
        onTogglePan: handleTogglePanMode,
      }),
      [handleUndo, handleRedo, handleTogglePanMode]
    ),
    true
  );

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((e) => {
    e.evt.preventDefault();
  }, []);

  // Memoize transformed walls for WallTool
  const wallsForDrawer = useMemo(() => {
    return walls.map((wall) => ({
      start: canvasToScreenCoordinates(wall.start, pan, zoom),
      end: canvasToScreenCoordinates(wall.end, pan, zoom),
      thickness: wall.thickness || 30, // Default 30mm thickness
      originalStart: { ...wall.start },
      originalEnd: { ...wall.end },
    }));
  }, [walls, pan, zoom]);

  // Pixel ratio for high-quality rendering
  const pixelRatio = getOptimalPixelRatio();

  // Determine current mode for status display
  const currentMode = isPanMode
    ? "Pan Mode"
    : isTemporaryPanMode
    ? "Temporary Pan (Space)"
    : isDragWithLeftMouse
    ? "Dragging Canvas"
    : previewWall
    ? "Drawing..."
    : selectedTool === "select"
    ? "Select Mode"
    : "Wall Mode";

  // Get the selected wall for the editor
  const selectedWall =
    selectedWallIndex >= 0 && selectedWallIndex < walls.length
      ? walls[selectedWallIndex]
      : null;

  // Function to create a floorplan from template data
  // Function to create 1 BHK floorplan with proper coordinate handling
  // Function to create 1 BHK floorplan with measurements in feet and inches
  const createCustomFloorplan = () => {
    // Reset any existing walls
    setWalls([]);

    // Define scale factor (convert feet and inches to mm)
    const ftToMm = 304.8;
    const inToMm = 25.4;

    // Parse dimensions like "7'-0"" to mm
    const parseDimension = (dimStr) => {
      const parts = dimStr.split("'");
      const feet = parseFloat(parts[0]);
      const inches = parts[1] ? parseFloat(parts[1].replace('"', "")) : 0;
      return feet * ftToMm + inches * inToMm;
    };

    // Define room dimensions from the floorplan
    const rooms = {
      bedroom: {
        width: parseDimension("9'-10\""),
        height: parseDimension("9'-0\""),
        position: { x: 1000, y: 500 },
      },
      living: {
        width: parseDimension("9'-0\""),
        height: parseDimension("12'-0\""),
        position: { x: 400, y: 500 },
      },
      kitchen: {
        width: parseDimension("7'-0\""),
        height: parseDimension("8'-5\""),
        position: { x: 400, y: 200 },
      },
      toilet1: {
        width: parseDimension("6'-7\""),
        height: parseDimension("3'-7\""),
        position: { x: 1000, y: 200 },
      },
      toilet2: {
        width: parseDimension("6'-7\""),
        height: parseDimension("3'-7\""),
        position: { x: 1000, y: 350 },
      },
      lobby: {
        width: parseDimension("3'-7\""),
        height: parseDimension("3'-0\""),
        position: { x: 900, y: 350 },
      },
      cb1: {
        width: parseDimension("7'-0\""),
        height: parseDimension("2'-0\""),
        position: { x: 400, y: 100 },
      },
      cb2: {
        width: parseDimension("7'-0\""),
        height: parseDimension("2'-0\""),
        position: { x: 600, y: 100 },
      },
      balcony: {
        width: parseDimension("2'-11\""),
        height: parseDimension("9'-0\""),
        position: { x: 400, y: 750 },
      },
      balconyLeft: {
        width: parseDimension("3'-0\""),
        height: parseDimension("8'-5\""),
        position: { x: 200, y: 200 },
      },
      balconyRight: {
        width: parseDimension("2'-6\""),
        height: parseDimension("9'-0\""),
        position: { x: 1250, y: 500 },
      },
      rccService: {
        width: parseDimension("4'-0\""),
        height: parseDimension("3'-7\""),
        position: { x: 1200, y: 200 },
      },
    };

    // Array to hold all walls
    const allWalls = [];
    let wallId = 0;

    // Create walls for each room
    Object.entries(rooms).forEach(([roomName, room]) => {
      const { width, height, position } = room;
      const x = position.x;
      const y = position.y;

      // Room color based on type
      let color = "#000000";
      let thickness = 30;

      if (roomName.includes("toilet")) {
        color = "#20B2AA"; // Light sea green for toilets
      } else if (roomName === "bedroom") {
        color = "#8B4513"; // Brown for bedroom
      } else if (roomName === "living") {
        color = "#228B22"; // Forest green for living
      } else if (roomName === "kitchen") {
        color = "#FF8C00"; // Dark orange for kitchen
      } else if (roomName.includes("balcony")) {
        color = "#A9A9A9"; // Gray for balconies
        thickness = 15; // Thinner for balconies
      }

      // Create the four walls of the room
      const walls = [
        // Top wall
        {
          id: wallId++,
          start: { x, y },
          end: { x: x + width, y },
          thickness,
          originalStart: { x, y },
          originalEnd: { x: x + width, y },
          roomName,
          color,
        },
        // Right wall
        {
          id: wallId++,
          start: { x: x + width, y },
          end: { x: x + width, y: y + height },
          thickness,
          originalStart: { x: x + width, y },
          originalEnd: { x: x + width, y: y + height },
          roomName,
          color,
        },
        // Bottom wall
        {
          id: wallId++,
          start: { x: x + width, y: y + height },
          end: { x, y: y + height },
          thickness,
          originalStart: { x: x + width, y: y + height },
          originalEnd: { x, y: y + height },
          roomName,
          color,
        },
        // Left wall
        {
          id: wallId++,
          start: { x, y: y + height },
          end: { x, y },
          thickness,
          originalStart: { x, y: y + height },
          originalEnd: { x, y },
          roomName,
          color,
        },
      ];

      allWalls.push(...walls);
    });

    // Add door openings and internal walls
    const doors = [
      // Bedroom door
      {
        start: { x: 950, y: 500 },
        end: { x: 1000, y: 500 },
        thickness: 0, // No wall at door
        roomName: "doorBedroom",
        color: "#FFFFFF",
      },
      // Toilet1 door
      {
        start: { x: 1030, y: 350 },
        end: { x: 1080, y: 350 },
        thickness: 0,
        roomName: "doorToilet1",
        color: "#FFFFFF",
      },
      // Toilet2 door
      {
        start: { x: 1030, y: 450 },
        end: { x: 1080, y: 450 },
        thickness: 0,
        roomName: "doorToilet2",
        color: "#FFFFFF",
      },
      // Kitchen door
      {
        start: { x: 550, y: 500 },
        end: { x: 600, y: 500 },
        thickness: 0,
        roomName: "doorKitchen",
        color: "#FFFFFF",
      },
    ];

    // Add internal connecting walls
    const internalWalls = [
      // Wall between living and lobby
      {
        id: wallId++,
        start: { x: 900, y: 500 },
        end: { x: 900, y: 350 },
        thickness: 30,
        originalStart: { x: 900, y: 500 },
        originalEnd: { x: 900, y: 350 },
        roomName: "internalWall",
        color: "#000000",
      },
      // Wall connecting the two toilets
      {
        id: wallId++,
        start: { x: 1000, y: 350 },
        end: { x: 1200, y: 350 },
        thickness: 30,
        originalStart: { x: 1000, y: 350 },
        originalEnd: { x: 1200, y: 350 },
        roomName: "internalWall",
        color: "#000000",
      },
    ];

    // Add doors with IDs
    const doorsWithIds = doors.map((door, index) => ({
      ...door,
      id: wallId + index,
    }));

    // Add all walls together
    setWalls([...allWalls, ...internalWalls, ...doorsWithIds]);

    // Apply rescaling to fit the drawing on the canvas
    setTimeout(() => {
      rescaleAndCenterDrawing();
    }, 100);
  };
  return (
    <div className="p-4 relative">
      <h2 className="text-xl font-bold mb-2">Architectural Drawing Tool</h2>

      <div className="flex flex-wrap justify-between items-start mb-4">
        <div className="flex-grow">
          <button
            onClick={rescaleAndCenterDrawing}
            className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 ml-2"
            title="Fix Drawing Scale"
          >
            Fix Drawing Scale
          </button>

          <ToolControls
            zoom={zoom}
            setZoom={setZoom}
            isPanMode={isPanMode}
            toggleMode={toggleMode}
            handleClear={handleClear}
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            snapEnabled={snapEnabled}
            toggleSnap={toggleSnap}
          />
        </div>
        <button
          onClick={createCustomFloorplan}
          className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 ml-2 mt-2"
          title="Load 1 BHK Layout"
        >
          Load 1 BHK Layout
        </button>
        <div className="ml-4">
          <ExportButton walls={walls} canvasDimensions={canvasDimensions} />
          {/* Add this button to the controls area */}
          <button
            onClick={centerViewOnContent}
            className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 ml-2"
            title="Center View"
          >
            Center View
          </button>
        </div>
      </div>

      <StatusBar
        canvasMode="infinite"
        zoom={zoom}
        isPanMode={isPanMode || isTemporaryPanMode || isDragWithLeftMouse}
        hoveredPosition={hoveredPosition}
        isDrawingChain={isDrawingChain}
        snapEnabled={snapEnabled}
      />

      {/* Add FloorplanPanel and RoomInfoPanel */}
      <FloorplanPanel onImportFloorplan={handleImportFloorplan} />
      <RoomInfoPanel floorplanData={floorplanData} walls={walls} />

      {/* Wall editor panel - appears when a wall is selected */}
      {showWallEditor && selectedWall && (
        <WallEditor
          selectedWall={selectedWall}
          onUpdateWall={handleUpdateWall}
          onCancel={handleCancelWallEdit}
        />
      )}

      <div
        className="relative bg-gray-100 overflow-hidden"
        style={{
          cursor:
            isPanMode || isTemporaryPanMode || isDragWithLeftMouse
              ? isDragging
                ? "grabbing"
                : "grab"
              : hoveredEndpoint
              ? "pointer"
              : selectedTool === "select"
              ? "default"
              : cursorStyle,
          ...getCanvasHQStyles(),
        }}
      >
        {/* Helper text */}
        <div className="absolute bottom-2 left-2 bg-white/80 px-3 py-1 rounded text-xs z-10 border border-gray-200">
          <div>
            Tip: Left-click and drag outside the paper to move the canvas
          </div>
          <div>Hold Shift to temporarily disable snapping</div>
          <div>Press 'H' for horizontal walls, 'V' for vertical walls</div>
          <div>Press 'Escape' to cancel current drawing</div>
          {isDrawingChain && drawingStartPoint && (
            <div className="text-blue-600">
              Drawing chain active - connect walls continuously
            </div>
          )}
          {selectedTool === "select" && (
            <div className="text-green-600">
              Select Mode - Click on walls to edit thickness
            </div>
          )}
        </div>

        {/* Tooltip for endpoint hover */}
        {hoveredEndpoint &&
          !isPanMode &&
          !isTemporaryPanMode &&
          !isDragWithLeftMouse && (
            <div
              className="absolute z-10 bg-white border border-gray-300 shadow-md px-3 py-1 rounded text-sm"
              style={{
                left:
                  canvasToScreenCoordinates(hoveredEndpoint, pan, zoom).x + 10,
                top:
                  canvasToScreenCoordinates(hoveredEndpoint, pan, zoom).y - 30,
              }}
            >
              Click to start new wall from here
            </div>
          )}

        {/* Starting point indicator */}
        {drawingStartPoint && isDrawingChain && (
          <div
            className="absolute z-10 bg-blue-100 border border-blue-500 shadow-md px-3 py-1 rounded text-sm"
            style={{
              left: Math.min(
                canvasToScreenCoordinates(drawingStartPoint, pan, zoom).x + 10,
                stageSize.width - 220 // Prevent tooltip from going off-screen
              ),
              top: Math.max(
                canvasToScreenCoordinates(drawingStartPoint, pan, zoom).y - 60,
                10 // Prevent tooltip from going off-screen at the top
              ),
              pointerEvents: "none", // This makes the tooltip ignore mouse events
            }}
          >
            Starting point (return here to close shape)
          </div>
        )}

        {/* Status indicator */}
        <div className="absolute top-2 right-2 bg-white/80 px-3 py-1 rounded text-sm z-10 border border-gray-200">
          <div>{currentMode}</div>
          <div>Snap: {snapEnabled ? "ON" : "OFF"}</div>
          {isDrawingChain && <div className="text-blue-600">Chain Drawing</div>}
        </div>

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          className="border border-gray-300"
          pixelRatio={pixelRatio}
        >
          {/* Background Layer */}
          <Layer>
            <Rect
              x={0}
              y={0}
              width={stageSize.width}
              height={stageSize.height}
              fill="#ffffff"
            />
          </Layer>

          {/* Drawing Layer */}
          <Layer>
            <WallTool
              walls={wallsForDrawer}
              preview={
                previewWall && {
                  start: canvasToScreenCoordinates(
                    previewWall.start,
                    pan,
                    zoom
                  ),
                  end: canvasToScreenCoordinates(previewWall.end, pan, zoom),
                  thickness: previewWall.thickness || 30, // Default 30mm
                  originalStart: { ...previewWall.start },
                  originalEnd: { ...previewWall.end },
                }
              }
              onWallClick={handleWallClick}
              onEndpointHover={handleEndpointHover}
              onEndpointLeave={handleEndpointLeave}
              hoveredEndpoint={
                hoveredEndpoint &&
                canvasToScreenCoordinates(hoveredEndpoint, pan, zoom)
              }
              selectedWallIndex={selectedWallIndex}
              zoom={zoom}
              showMeasurements={true}
            />
            {previewWall && drawingStartPoint && (
              <Text
                x={canvasToScreenCoordinates(previewWall.end, pan, zoom).x + 10}
                y={canvasToScreenCoordinates(previewWall.end, pan, zoom).y + 10}
                text={`Angle: ${getAngleBetweenWalls(
                  { start: drawingStartPoint, end: previewWall.start },
                  { start: previewWall.start, end: previewWall.end }
                )}°`}
                fontSize={14}
                fill="blue"
                background="white"
              />
            )}
            {hoveredSplitPoint && (
              <Circle
                x={canvasToScreenCoordinates(hoveredSplitPoint, pan, zoom).x}
                y={canvasToScreenCoordinates(hoveredSplitPoint, pan, zoom).y}
                radius={6}
                fill="rgba(255, 100, 100, 0.8)"
                shadowBlur={10}
                shadowColor="red"
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default CanvasPage;
