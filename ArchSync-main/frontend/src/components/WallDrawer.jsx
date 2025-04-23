import React from "react";
import { Line, Circle, Group, Text, Rect } from "react-konva";
import { getLineweightById, calculateLineweightPixels } from "./constants/lineweights";

/**
 * WallDrawer component that handles rendering of walls and endpoints
 * 
 * Note: All coordinates coming into this component are in screen space 
 * (already transformed by CanvasPage). However, we need to ensure that
 * measurements are consistent regardless of zoom level.
 */
const WallDrawer = ({ 
  walls = [],
  preview = null, 
  onEndpointHover,
  onEndpointLeave,
  hoveredEndpoint,
  lineweightId = "standard",
  zoom = 1,
  previewLineweightId = "standard",
  drawingStartPoint = null,
  snapEnabled = true,
  isShiftPressed = false,
  showMeasurements = true,
  // Added property to receive original walls in world space (if available)
  originalWalls = null,
  originalPreview = null
}) => {
  // Get lineweight details
  const lineweight = getLineweightById(lineweightId);
  const previewLineweight = getLineweightById(previewLineweightId);
  
  // Calculate pixel value for lineweight based on zoom level
  const strokeWidth = calculateLineweightPixels(lineweight.size, zoom);
  const previewStrokeWidth = calculateLineweightPixels(previewLineweight.size, zoom);

  // Use this for exact point matching to ensure perfect connections
  const exactPointMatch = (p1, p2) => {
    if (!p1 || !p2) return false;
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return dx < 0.1 && dy < 0.1; // Very strict tolerance for exact matches
  };

  // Find the exact endpoint that matches a given point
  const findExactEndpoint = (point) => {
    if (!point || walls.length === 0) return null;
    
    for (const wall of walls) {
      if (exactPointMatch(point, wall.start)) return { ...wall.start };
      if (exactPointMatch(point, wall.end)) return { ...wall.end };
    }
    
    return null;
  };

  // Find closest endpoint to a given point (for snapping)
  // Only used when snap is enabled
  const findClosestEndpoint = (point, threshold = 5) => {
    if (!point || !snapEnabled) return null;
    
    // First check for exact matches
    const exactMatch = findExactEndpoint(point);
    if (exactMatch) return exactMatch;
    
    // Only consider endpoints the user is actually hovering over
    // Much smaller threshold to avoid unwanted snapping
    let closestPoint = null;
    let minDistance = Infinity;
    
    walls.forEach(wall => {
      // Check start point
      const startDist = Math.hypot(point.x - wall.start.x, point.y - wall.start.y);
      if (startDist < minDistance && startDist < threshold) {
        minDistance = startDist;
        closestPoint = { ...wall.start }; // Create a fresh copy to avoid reference issues
      }
      
      // Check end point
      const endDist = Math.hypot(point.x - wall.end.x, point.y - wall.end.y);
      if (endDist < minDistance && endDist < threshold) {
        minDistance = endDist;
        closestPoint = { ...wall.end }; // Create a fresh copy to avoid reference issues
      }
    });
    
    return closestPoint;
  };
  
  // Check if a line is nearly horizontal or vertical (within threshold degrees)
  const isNearlyAligned = (start, end, thresholdDegrees = 2) => {
    if (!start || !end) return null;
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    // Calculate angle in degrees
    const angleDegrees = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Check if it's nearly horizontal (0° or 180°)
    const isNearlyHorizontal = 
      (Math.abs(angleDegrees) < thresholdDegrees) || 
      (Math.abs(Math.abs(angleDegrees) - 180) < thresholdDegrees);
    
    // Check if it's nearly vertical (90° or 270°)
    const isNearlyVertical = 
      (Math.abs(Math.abs(angleDegrees) - 90) < thresholdDegrees);
    
    if (isNearlyHorizontal) return 'horizontal';
    if (isNearlyVertical) return 'vertical';
    return null;
  };
  
  // Calculate distance in mm and convert to meters for display
  // The distance calculation must be independent of zoom level
  // It only depends on the actual coordinates in the model space
  const calculateDistance = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Format distance as meters only (no centimeters)
  const formatDistance = (distanceMm) => {
    // Always convert to meters
    const distanceM = distanceMm / 1000;
    
    // Show more decimal places for small distances
    if (distanceM < 1) {
      return distanceM.toFixed(3) + ' m';
    }
    
    // For medium measurements, show meters with higher precision
    if (distanceM < 10) {
      return distanceM.toFixed(2) + ' m';
    }
    
    // For large measurements, less decimal precision is fine
    return distanceM.toFixed(1) + ' m';
  };

  // Function to render endpoint markers with improved visuals
  const renderEndpoints = () => {
    const endpoints = [];
    
    walls.forEach((wall, wallIndex) => {
      // Add start point
      endpoints.push({
        point: wall.start,
        id: `${wallIndex}-start`,
        lineweightId: wall.lineweightId || lineweightId
      });
      
      // Add end point
      endpoints.push({
        point: wall.end,
        id: `${wallIndex}-end`,
        lineweightId: wall.lineweightId || lineweightId
      });
    });
    
    // Filter duplicates (where lines connect)
    const uniqueEndpoints = [];
    const seen = new Set();
    
    endpoints.forEach(endpoint => {
      // Round to more decimal places for better precision
      const key = `${Math.round(endpoint.point.x*1000)/1000},${Math.round(endpoint.point.y*1000)/1000}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEndpoints.push(endpoint);
      }
    });
    
    // Render all endpoints with improved visual cues
    return uniqueEndpoints.map(endpoint => {
      // Calculate endpoint marker radius - should be proportional to the line thickness
      // but with a minimum size for visibility
      const markerRadius = Math.max(5, strokeWidth * 1.5);
      
      // Check if this endpoint is being hovered over
      const isHovered = hoveredEndpoint && 
                Math.abs(hoveredEndpoint.x - endpoint.point.x) < 2 && 
                Math.abs(hoveredEndpoint.y - endpoint.point.y) < 2;
                
      // Check if this is the start point of current drawing
      const isStartPoint = drawingStartPoint && 
                Math.abs(drawingStartPoint.x - endpoint.point.x) < 2 && 
                Math.abs(drawingStartPoint.y - endpoint.point.y) < 2;
      
      // Different styles based on state
      let fillColor = "transparent";
      let strokeColor = "rgba(0,0,0,0.3)";
      
      if (isHovered) {
        fillColor = "rgba(0,128,0,0.3)";
        strokeColor = "green";
      } else if (isStartPoint) {
        fillColor = "rgba(0,0,255,0.3)";
        strokeColor = "blue";
      }
      
      return (
        <Group key={endpoint.id}>
          <Circle
            x={endpoint.point.x}
            y={endpoint.point.y}
            radius={markerRadius}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.5}
            onMouseEnter={() => onEndpointHover(endpoint.point)}
            onMouseLeave={onEndpointLeave}
            perfectDrawEnabled={false}
          />
          
          {/* Show a dot in the center for better visibility */}
          <Circle
            x={endpoint.point.x}
            y={endpoint.point.y}
            radius={1.5}
            fill={isHovered ? "green" : (isStartPoint ? "blue" : "black")}
          />
        </Group>
      );
    });
  };

  // Apply snapping to preview only when enabled (with reduced threshold)
  let adjustedPreview = preview;
  if (preview && walls.length > 0) {
    // Check if we're already at/near the starting point (reduced threshold)
    const isNearStartPoint = drawingStartPoint && 
      Math.hypot(preview.end.x - drawingStartPoint.x, preview.end.y - drawingStartPoint.y) < 5;
    
    if (isNearStartPoint) {
      adjustedPreview = {
        ...preview,
        end: drawingStartPoint
      };
    } else {
      // Check for alignment first before snapping to endpoints
      const alignmentType = isNearlyAligned(preview.start, preview.end);
      
      // Apply strict alignment (this addresses issue #1)
      if (alignmentType) {
        // Create a perfect horizontal or vertical alignment
        if (alignmentType === 'horizontal') {
          adjustedPreview = {
            ...preview,
            end: {
              ...preview.end,
              y: preview.start.y // Force exact horizontal alignment
            }
          };
        } else if (alignmentType === 'vertical') {
          adjustedPreview = {
            ...preview,
            end: {
              ...preview.end,
              x: preview.start.x // Force exact vertical alignment
            }
          };
        }
      } 
      // Only apply endpoint snapping if we're not in strict alignment mode
      else if (snapEnabled) {
        const snappedEnd = findClosestEndpoint(preview.end, 5);
        if (snappedEnd) {
          adjustedPreview = {
            ...preview,
            end: snappedEnd
          };
        }
      }
    }
  }

  // Render alignment guides for horizontal/vertical lines
  const renderAlignmentGuides = () => {
    if (!adjustedPreview) return null;
    
    const alignmentType = isNearlyAligned(adjustedPreview.start, adjustedPreview.end);
    if (!alignmentType) return null;
    
    if (alignmentType === 'horizontal') {
      // Draw horizontal guide
      return (
        <Line
          points={[
            adjustedPreview.start.x - 1000, adjustedPreview.start.y, 
            adjustedPreview.start.x + 1000, adjustedPreview.start.y
          ]}
          stroke="blue"
          strokeWidth={1}
          dash={[5, 5]}
          opacity={0.7}
        />
      );
    } else if (alignmentType === 'vertical') {
      // Draw vertical guide
      return (
        <Line
          points={[
            adjustedPreview.start.x, adjustedPreview.start.y - 1000, 
            adjustedPreview.start.x, adjustedPreview.start.y + 1000
          ]}
          stroke="blue"
          strokeWidth={1}
          dash={[5, 5]}
          opacity={0.7}
        />
      );
    }
    
    return null;
  };

  // Render snap indicators if we're snapping to something
  const renderSnapIndicators = () => {
    if (!adjustedPreview || !preview) return null;
    
    const indicators = [];
    
    // Special indicator for closing shape
    if (drawingStartPoint && 
        Math.hypot(adjustedPreview.end.x - drawingStartPoint.x, adjustedPreview.end.y - drawingStartPoint.y) < 0.1) {
      indicators.push(
        <Group key="close-shape">
          <Circle
            x={drawingStartPoint.x}
            y={drawingStartPoint.y}
            radius={10}
            stroke="blue"
            strokeWidth={2}
            dash={[3, 3]}
          />
          <Text
            x={drawingStartPoint.x + 12}
            y={drawingStartPoint.y - 15}
            text="Close Shape"
            fontSize={12}
            fill="blue"
          />
        </Group>
      );
    }
    // Regular snap indicator for end point
    else if (!exactPointMatch(adjustedPreview.end, preview.end)) {
      indicators.push(
        <Circle
          key="snap-end"
          x={adjustedPreview.end.x}
          y={adjustedPreview.end.y}
          radius={8}
          stroke="green"
          strokeWidth={2}
          dash={[2, 2]}
        />
      );
    }
    
    return indicators;
  };

  // Render measurements for walls with improved styling
  const renderMeasurements = () => {
    if (!showMeasurements) return null;
    
    const measurements = [];
    
    // For existing walls
    walls.forEach((wall, index) => {
      // Calculate the actual distance in model space using original coordinates
      // This is the key fix - we calculate distance based on the original coordinates
      // which are not affected by zoom level
      let distance;
      if (wall.originalStart && wall.originalEnd) {
        // Use the original coordinates if available
        distance = calculateDistance(wall.originalStart, wall.originalEnd);
      } else {
        // Fallback to displayed coordinates (this should be avoided)
        distance = calculateDistance(wall.start, wall.end);
      }
      
      const formattedDistance = formatDistance(distance);
      
      // Calculate midpoint for label
      const midX = (wall.start.x + wall.end.x) / 2;
      const midY = (wall.start.y + wall.end.y) / 2;
      
      // Calculate angle for proper text orientation
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x) * 180 / Math.PI;
      const adjustedAngle = angle > 90 || angle < -90 ? angle + 180 : angle;
      
      // Offset the label perpendicular to the line direction
      const perpAngle = angle + 90;
      const offsetDist = 15; // Increased from 10 to 15
      const offsetX = Math.cos(perpAngle * Math.PI / 180) * offsetDist;
      const offsetY = Math.sin(perpAngle * Math.PI / 180) * offsetDist;
      
      // Create a background for better readability
      measurements.push(
        <Group key={`measure-bg-${index}`}>
          <Rect
            x={midX + offsetX - 30}
            y={midY + offsetY - 10}
            width={60}
            height={20}
            fill="rgba(255, 255, 255, 0.7)"
            cornerRadius={3}
            rotation={adjustedAngle}
            offsetX={0}
            offsetY={0}
          />
        </Group>
      );
      
      // Add the measurement text with larger font
      measurements.push(
        <Group key={`measure-${index}`}>
          <Text
            x={midX + offsetX}
            y={midY + offsetY}
            text={formattedDistance}
            fontSize={14} // Increased from 12 to 14
            fontStyle="bold" // Added bold
            fill="#333"
            rotation={adjustedAngle}
            offsetX={0}
            offsetY={0}
            align="center"
          />
        </Group>
      );
    });
    
    // For preview wall - similar changes
    if (adjustedPreview) {
      // Calculate the actual distance in model space using original coordinates when available
      let distance;
      if (adjustedPreview.originalStart && adjustedPreview.originalEnd) {
        // Use the original coordinates if available
        distance = calculateDistance(adjustedPreview.originalStart, adjustedPreview.originalEnd);
      } else if (preview && preview.originalStart && preview.originalEnd) {
        // Try with the original preview if available
        distance = calculateDistance(preview.originalStart, preview.originalEnd);  
      } else {
        // Fallback to displayed coordinates
        distance = calculateDistance(adjustedPreview.start, adjustedPreview.end);
      }
      
      const formattedDistance = formatDistance(distance);
      
      // Calculate midpoint for label
      const midX = (adjustedPreview.start.x + adjustedPreview.end.x) / 2;
      const midY = (adjustedPreview.start.y + adjustedPreview.end.y) / 2;
      
      // Calculate angle for proper text orientation
      const angle = Math.atan2(
        adjustedPreview.end.y - adjustedPreview.start.y, 
        adjustedPreview.end.x - adjustedPreview.start.x
      ) * 180 / Math.PI;
      
      const adjustedAngle = angle > 90 || angle < -90 ? angle + 180 : angle;
      
      // Offset the label perpendicular to the line direction
      const perpAngle = angle + 90;
      const offsetDist = 15; // Increased from 10 to 15
      const offsetX = Math.cos(perpAngle * Math.PI / 180) * offsetDist;
      const offsetY = Math.sin(perpAngle * Math.PI / 180) * offsetDist;
      
      // Add background for preview measurement
      measurements.push(
        <Group key="measure-preview-bg">
          <Rect
            x={midX + offsetX - 30}
            y={midY + offsetY - 10}
            width={60}
            height={20}
            fill="rgba(255, 220, 220, 0.7)"
            cornerRadius={3}
            rotation={adjustedAngle}
            offsetX={0}
            offsetY={0}
          />
        </Group>
      );
      
      // Add the measurement text
      measurements.push(
        <Group key="measure-preview">
          <Text
            x={midX + offsetX}
            y={midY + offsetY}
            text={formattedDistance}
            fontSize={14} // Increased from 12 to 14
            fontStyle="bold" // Added bold
            fill="red"
            rotation={adjustedAngle}
            offsetX={0}
            offsetY={0}
            align="center"
          />
        </Group>
      );
    }
    
    return measurements;
  };

  return (
    <>
      {/* Wall lines */}
      {walls.map((wall, index) => {
        // Each wall can have its own lineweight, or use the default
        const wallLineweight = getLineweightById(wall.lineweightId || lineweightId);
        const wallStrokeWidth = calculateLineweightPixels(wallLineweight.size, zoom);
        
        return (
          <Line
            key={index}
            points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
            stroke={wallLineweight.color}
            strokeWidth={wallStrokeWidth}
            lineCap="round"
            lineJoin="round"
            perfectDrawEnabled={true}
          />
        );
      })}

      {/* Preview line */}
      {adjustedPreview && (
        <Line
          points={[
            adjustedPreview.start.x, adjustedPreview.start.y, 
            adjustedPreview.end.x, adjustedPreview.end.y
          ]}
          stroke="red"
          strokeWidth={previewStrokeWidth}
          dash={[6, 3]}
          lineCap="round"
          lineJoin="round"
        />
      )}

      {/* Alignment guides */}
      {renderAlignmentGuides()}

      {/* Snapping indicators */}
      {renderSnapIndicators()}

      {/* Endpoint markers */}
      {renderEndpoints()}
      
      {/* Measurements */}
      {renderMeasurements()}
    </>
  );
};

export default WallDrawer;