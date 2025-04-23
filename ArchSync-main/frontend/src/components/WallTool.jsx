import React from "react";
import { Line, Group, Text, Circle } from "react-konva";
import * as martinez from 'martinez-polygon-clipping';
import { Path } from "react-konva";
import { Arc } from 'react-konva';
/**
 * WallTool Component - Renders walls with proper scaling
 */
const WallTool = ({ 
  walls, 
  preview, 
  onWallClick, 
  onEndpointHover, 
  onEndpointLeave, 
  hoveredEndpoint,
  selectedWallIndex,
  zoom,
  showMeasurements = true
}) => {

  

  
  // Converts 4-point wall fill to martinez format
  const getPolygonShape = (p1, p2, p3, p4) => {
    const round = (v) => Math.round(v * 1000) / 1000;
  
    return [[
      [round(p1.x), round(p1.y)],
      [round(p2.x), round(p2.y)],
      [round(p3.x), round(p3.y)],
      [round(p4.x), round(p4.y)],
      [round(p1.x), round(p1.y)] // close polygon
    ]];
  };
  

  // Check if two polygons overlap
  const doPolygonsOverlap = (polyA, polyB) => {
    try {
      const intersection = martinez.intersection(polyA, polyB);
      return intersection && intersection.length > 0;
    } catch (e) {
      console.warn("Martinez failed:", e);
      return false;
    }
  };
  
  const expandPolygon = (poly, margin = 0.1) => {
    return [[...poly[0].map(([x, y]) => [x + margin, y + margin])]];
  };
  
  const getAllWallPolygons = () => {
    return walls.map(w => {
      const { line1Start, line1End, line2End, line2Start } =
        buildWallPolygon(w, walls, w.thickness || 30);
  
      return getPolygonShape(line1Start, line1End, line2End, line2Start);
    });
  };
  
  const getMergedWallShape = () => {
    const polygons = getAllWallPolygons();
    if (polygons.length === 0) return [];
  
    try {
      return polygons.reduce((merged, poly) => martinez.union(merged, poly), polygons[0]);
    } catch (e) {
      console.warn("Union failed:", e);
      return [];
    }
  };
  

  // Calculate the actual thickness that scales properly with zoom
  const getScaledThickness = (thickness) => {
    return thickness * zoom;  // Scale thickness with zoom level
  };

  // Calculate the distance between two points
  const getDistance = (start, end) => {
    if (!start || !end) return 0;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate the angle for measurement text
  const getAngle = (start, end) => {
    if (!start || !end) return 0;
    return Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
  };

  // Calculate the midpoint between two points
  const getMidpoint = (start, end) => {
    if (!start || !end) return { x: 0, y: 0 };
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };
  };

  // Format length dynamically based on size
  const formatLength = (lengthInMm) => {
    const lengthInM = lengthInMm / 1000;
    
    if (lengthInM >= 100) {
      // For very large lengths, show as whole meters
      return `${Math.round(lengthInM)}m`;
    } else if (lengthInM >= 10) {
      // For large lengths, show with 1 decimal place
      return `${lengthInM.toFixed(1)}m`;
    } else if (lengthInM >= 0.1) {
      // For medium lengths, show with 2 decimal places
      return `${lengthInM.toFixed(2)}m`;
    } else {
      // For small lengths, show with 3 decimal places
      return `${lengthInM.toFixed(3)}m`;
    }
  };

  // Improved point matching with higher precision
  const exactPointMatch = (p1, p2) => {
    if (!p1 || !p2) return false;
    const dx = Math.abs(Number(p1.x) - Number(p2.x));
    const dy = Math.abs(Number(p1.y) - Number(p2.y));
    return dx < 0.01 && dy < 0.01; // Not too strict, but precise enough
  };

  // Get normalized direction vector between two points
  const getNormalizedDirection = (start, end) => {
    if (!start || !end) return { x: 0, y: 0 };
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 0.0001) return { x: 0, y: 0 };
    
    return {
      x: dx / length,
      y: dy / length
    };
  };

  // Get perpendicular offset vector to a line segment
  const getPerpendicularOffset = (start, end, thickness) => {
    if (!start || !end) return { dx: 0, dy: 0 };
    
    const direction = getNormalizedDirection(start, end);
    
    // Calculate perpendicular direction (rotate 90 degrees)
    const perpX = -direction.y;
    const perpY = direction.x;
    
    // Half thickness for each side of centerline
    const halfThickness = thickness / 2;
    
    return {
      dx: perpX * halfThickness,
      dy: perpY * halfThickness
    };
  };

  // Calculate mitered corner point for a wall joint
  // Improved version with direct line intersection for precise corners
  const getMiteredCornerPoint = (prevWall, currentWall, thickness, isOutside) => {
    if (!prevWall || !currentWall) return null;
    
    // Determine the common point (junction)
    let junction;
    if (exactPointMatch(prevWall.end, currentWall.start)) {
      // Use exact coordinates from the end of the previous wall
      junction = { x: prevWall.end.x, y: prevWall.end.y };
    } else if (exactPointMatch(prevWall.start, currentWall.start)) {
      // Handle case where prev wall start connects to current wall start
      junction = { x: prevWall.start.x, y: prevWall.start.y };
    } else if (exactPointMatch(prevWall.end, currentWall.end)) {
      // Handle case where prev wall end connects to current wall end
      junction = { x: prevWall.end.x, y: prevWall.end.y };
    } else {
      // No exact match, use current wall start as fallback
      junction = { x: currentWall.start.x, y: currentWall.start.y };
    }
    
    // Get directions for both walls (ensure they point AWAY from junction)
    let dir1, dir2;
    
    if (exactPointMatch(prevWall.end, junction)) {
      dir1 = getNormalizedDirection(prevWall.start, prevWall.end);
    } else {
      dir1 = getNormalizedDirection(prevWall.end, prevWall.start);
    }
    
    if (exactPointMatch(currentWall.start, junction)) {
      dir2 = getNormalizedDirection(currentWall.start, currentWall.end);
    } else {
      dir2 = getNormalizedDirection(currentWall.end, currentWall.start);
    }
    
    // Calculate perpendicular directions 
    const perp1 = { x: -dir1.y, y: dir1.x };
    const perp2 = { x: -dir2.y, y: dir2.x };
    
    // For "outside" corner we use original perp directions,
    // for "inside" we flip them
    const finalPerp1 = isOutside ? perp1 : { x: -perp1.x, y: -perp1.y };
    const finalPerp2 = isOutside ? perp2 : { x: -perp2.x, y: -perp2.y };
    
    // Calculate half-thickness for offset
    const halfThickness = thickness / 2;
    
    // Calculate the offset points for each wall
    const offPoint1 = {
      x: junction.x + finalPerp1.x * halfThickness,
      y: junction.y + finalPerp1.y * halfThickness
    };
    
    const offPoint2 = {
      x: junction.x + finalPerp2.x * halfThickness,
      y: junction.y + finalPerp2.y * halfThickness
    };
    
    // Calculate the intersection of the two offset lines
    // Line 1: from offPoint1 in the direction of dir1
    // Line 2: from offPoint2 in the direction of dir2
    
    // Check for nearly parallel lines (avoid division by zero)
    const cross = dir1.x * dir2.y - dir1.y * dir2.x;
    if (Math.abs(cross) < 0.01) {
      // Lines are nearly parallel, use the midpoint of the offset points
      return {
        x: (offPoint1.x + offPoint2.x) / 2,
        y: (offPoint1.y + offPoint2.y) / 2
      };
    }
    
    // Calculate intersection
    // This uses the parametric form of the line equation
    // See: https://en.wikipedia.org/wiki/Line–line_intersection
    
    const dx = offPoint2.x - offPoint1.x;
    const dy = offPoint2.y - offPoint1.y;
    
    const t = (dx * dir2.y - dy * dir2.x) / cross;
    
    // Calculate the intersection point
    const intersectionPoint = {
      x: offPoint1.x + dir1.x * t,
      y: offPoint1.y + dir1.y * t
    };
    
    // Check if the intersection point is too far (can happen with very acute angles)
    const distToJunction = Math.sqrt(
      Math.pow(intersectionPoint.x - junction.x, 2) + 
      Math.pow(intersectionPoint.y - junction.y, 2)
    );
    
    // If distance is too large (more than 5x the thickness), use a controlled point
    if (distToJunction > halfThickness * 10) {
      // Calculate a bisector direction
      const bisector = {
        x: finalPerp1.x + finalPerp2.x,
        y: finalPerp1.y + finalPerp2.y
      };
      
      // Normalize the bisector
      const bisectorLength = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y);
      if (bisectorLength < 0.0001) {
        // If bisector is too small, use midpoint
        return {
          x: (offPoint1.x + offPoint2.x) / 2,
          y: (offPoint1.y + offPoint2.y) / 2
        };
      }
      
      const normalizedBisector = {
        x: bisector.x / bisectorLength,
        y: bisector.y / bisectorLength
      };
      
      // Use a capped distance
      return {
        x: junction.x + normalizedBisector.x * halfThickness * 5,
        y: junction.y + normalizedBisector.y * halfThickness * 5
      };
    }
    
    return intersectionPoint;
  };

  // Function to build the polygon points for a wall
  const buildWallPolygon = (wall, allWalls, thickness) => {
    const { start, end } = wall;
    const scaledThickness = getScaledThickness(thickness || 30);
    
    // Check for the case of preview wall that might not be in allWalls yet
    const wallsToCheck = allWalls.some(w => w === wall) ? allWalls : [...allWalls, wall];
    
    // More robust connection detection - check both directions for better connectivity
    const prevWalls = wallsToCheck.filter(w => 
      w !== wall && (
        exactPointMatch(w.end, wall.start) || 
        exactPointMatch(w.start, wall.start) ||
        (wall.originalStart && (
          exactPointMatch(w.end, wall.originalStart) || 
          exactPointMatch(w.start, wall.originalStart)
        ))
      )
    );
    
    const nextWalls = wallsToCheck.filter(w => 
      w !== wall && (
        exactPointMatch(w.start, wall.end) || 
        exactPointMatch(w.end, wall.end) ||
        (wall.originalEnd && (
          exactPointMatch(w.start, wall.originalEnd) || 
          exactPointMatch(w.end, wall.originalEnd)
        ))
      )
    );
    
    // Standard perpendicular offsets for the wall
    const offset = getPerpendicularOffset(start, end, scaledThickness);
    
    // Points for a simple rectangle (when no connections)
    let line1Start = { x: start.x + offset.dx, y: start.y + offset.dy };
    let line1End = { x: end.x + offset.dx, y: end.y + offset.dy };
    let line2Start = { x: start.x - offset.dx, y: start.y - offset.dy };
    let line2End = { x: end.x - offset.dx, y: end.y - offset.dy };
    
    // Handle start point (miter with previous wall if exists)
    if (prevWalls.length > 0) {
      // Use the "closest" previous wall for mitering (in case of multiple)
      const prevWall = prevWalls[0];
      
      // Calculate mitered points for both sides (outside and inside corner)
      const outsideCorner = getMiteredCornerPoint(prevWall, wall, scaledThickness, true);
      const insideCorner = getMiteredCornerPoint(prevWall, wall, scaledThickness, false);
      
      if (outsideCorner && insideCorner) {
        // Update the appropriate start points
        line1Start = outsideCorner;
        line2Start = insideCorner;
      }
    }
    
    // Handle end point (miter with next wall if exists)
    if (nextWalls.length > 0) {
      // Use the "closest" next wall for mitering (in case of multiple)
      const nextWall = nextWalls[0];
      
      // Calculate mitered points for both sides (outside and inside corner)
      const outsideCorner = getMiteredCornerPoint(wall, nextWall, scaledThickness, true);
      const insideCorner = getMiteredCornerPoint(wall, nextWall, scaledThickness, false);
      
      if (outsideCorner && insideCorner) {
        // Update the appropriate end points
        line1End = outsideCorner;
        line2End = insideCorner;
      }
    }
    
    return {
      line1Start,
      line1End,
      line2Start,
      line2End
    };
  };

  // FIXED: Function to check if a point is an endpoint or a junction
  const isRealEndpoint = (point) => {
    if (!point) return false;
    
    // Count how many walls connect to this point
    let connectionCount = 0;
    
    // Check connections with existing walls
    for (const wall of walls) {
      if (exactPointMatch(wall.start, point)) {
        connectionCount++;
      }
      if (exactPointMatch(wall.end, point)) {
        connectionCount++;
      }
    }
    
    // Also check connections with preview wall if it exists
    if (preview && preview.start && preview.end) {
      if (exactPointMatch(preview.start, point)) {
        connectionCount++;
      }
      if (exactPointMatch(preview.end, point)) {
        connectionCount++;
      }
    }
    
    // It's a real endpoint if it only connects to one wall segment
    return connectionCount === 1;
  };

  // Render all walls with proper connections at endpoints
  const renderWalls = () => {
    return walls.map((wall, index) => {
      if (!wall.start || !wall.end) return null;
      
      const isSelected = index === selectedWallIndex;
      const actualThickness = getScaledThickness(wall.thickness || 30); // Default 30mm
      
      // Build the wall polygon with proper mitered corners
      const { line1Start, line1End, line2Start, line2End } = 
        buildWallPolygon(wall, walls, wall.thickness || 30);

        
      
      // Calculate wall length for display
      const length = wall.length || getDistance(wall.originalStart, wall.originalEnd);
      const lengthText = formatLength(length);
      const angle = getAngle(wall.start, wall.end);
      const midpoint = getMidpoint(wall.start, wall.end);
      
      // Adjust text position to be centered on the wall
      const textPosition = {
        x: midpoint.x,
        y: midpoint.y - 5
      };
      
      // Check if this endpoint is hovered
      const isStartHovered = hoveredEndpoint && 
        exactPointMatch(hoveredEndpoint, wall.originalStart);
      
      const isEndHovered = hoveredEndpoint && 
        exactPointMatch(hoveredEndpoint, wall.originalEnd);
      
      // Determine if start/end points are real endpoints or junctions
      const startIsRealEndpoint = isRealEndpoint(wall.start);
      const endIsRealEndpoint = isRealEndpoint(wall.end);
      
      return (
        <Group key={index} onClick={() => onWallClick(index)}>
          {/* Wall consists of two parallel lines */}
          
          
          {/* Fill between the lines */}
          {(() => {
          const thisPoly = getPolygonShape(line1Start, line1End, line2End, line2Start);

          let isOverlapping = false;

          // Check this wall against every other wall
          for (let j = 0; j < walls.length; j++) {
            if (j === index) continue;

            const other = buildWallPolygon(walls[j], walls, walls[j].thickness || 30);

            const otherPoly = getPolygonShape(
              other.line1Start,
              other.line1End,
              other.line2End,
              other.line2Start
            );

            const expandedOther = expandPolygon(otherPoly, 0.1);
            if (doPolygonsOverlap(thisPoly, expandedOther)) {
              isOverlapping = true;
              break;
            }

          }

          null
        })()}

          
          {/* Only show X markers on real endpoints, not at junctions */}
          {/* Start point markers */}
          {startIsRealEndpoint && (
            <>
              <Line
                points={[wall.start.x - 8, wall.start.y - 8, wall.start.x + 8, wall.start.y + 8]}
                stroke={isStartHovered ? "#ff0000" : "#000000"}
                strokeWidth={2}
                onMouseEnter={() => onEndpointHover(wall.originalStart)}
                onMouseLeave={onEndpointLeave}
              />
              <Line
                points={[wall.start.x + 8, wall.start.y - 8, wall.start.x - 8, wall.start.y + 8]}
                stroke={isStartHovered ? "#ff0000" : "#000000"}
                strokeWidth={2}
                onMouseEnter={() => onEndpointHover(wall.originalStart)}
                onMouseLeave={onEndpointLeave}
              />
            </>
          )}
          
          {/* End point markers */}
          {endIsRealEndpoint && (
            <>
              <Line
                points={[wall.end.x - 8, wall.end.y - 8, wall.end.x + 8, wall.end.y + 8]}
                stroke={isEndHovered ? "#ff0000" : "#000000"}
                strokeWidth={2}
                onMouseEnter={() => onEndpointHover(wall.originalEnd)}
                onMouseLeave={onEndpointLeave}
              />
              <Line
                points={[wall.end.x + 8, wall.end.y - 8, wall.end.x - 8, wall.end.y + 8]}
                stroke={isEndHovered ? "#ff0000" : "#000000"}
                strokeWidth={2}
                onMouseEnter={() => onEndpointHover(wall.originalEnd)}
                onMouseLeave={onEndpointLeave}
              />
            </>
          )}
          
          {/* Display length measurement - centered on wall with better positioning */}
          {showMeasurements && lengthText.trim() && (
          <Text
            x={textPosition.x}
            y={textPosition.y}
            text={lengthText}
              fontSize={12}
              fill="#333333"
              align="center"
              offsetX={lengthText.length * 3} // Center the text
              rotation={angle > 90 || angle < -90 ? angle + 180 : angle}
              background="#ffffff"
              padding={2}
            />
          )}
        </Group>
      );
    });
  };

  // Render preview wall when drawing
  const renderPreview = () => {
    if (!preview || !preview.start || !preview.end) return null;
    
    const actualThickness = getScaledThickness(preview.thickness || 30); // Default 30mm
    
    // To ensure proper mitering with existing walls, create a combined array
    // that includes both existing walls and the preview
    const allWallsWithPreview = [...walls, preview];
    
    // Build the preview wall with proper mitering
    const { line1Start, line1End, line2Start, line2End } = 
      buildWallPolygon(preview, allWallsWithPreview, preview.thickness || 30);
    
    // Calculate preview length for display
    const length = getDistance(preview.originalStart || preview.start, preview.originalEnd || preview.end);
    const lengthText = formatLength(length);
    const angle = getAngle(preview.start, preview.end);
    const midpoint = getMidpoint(preview.start, preview.end);
    
    // Position text centered on the wall
    const textPosition = {
      x: midpoint.x,
      y: midpoint.y - 5
    };
    
    return (
      <Group>
        {/* Preview wall consists of two parallel lines */}
        <Line
          points={[line1Start.x, line1Start.y, line1End.x, line1End.y]}
          stroke="#3498db"
          strokeWidth={1}
          dash={[5, 5]}
        />
        <Line
          points={[line2Start.x, line2Start.y, line2End.x, line2End.y]}
          stroke="#3498db"
          strokeWidth={1}
          dash={[5, 5]}
        />
        
        {/* Fill between the lines */}
        
        
        {/* Display length measurement - with background for better visibility */}
        {showMeasurements && (
          <Text
            x={textPosition.x}
            y={textPosition.y}
            text={lengthText}
            fontSize={12}
            fill="#3498db"
            align="center"
            offsetX={lengthText.length * 3} // Center the text
            rotation={angle > 90 || angle < -90 ? angle + 180 : angle}
            background="#ffffff"
            padding={2}
          />
        )}
      </Group>
    );
  };

  const renderUnifiedWallFill = () => {
    const merged = getMergedWallShape();
    if (!Array.isArray(merged) || merged.length === 0) return null;
  
    return merged.map((shape, i) => {
      let path = "";
  
      shape.forEach((ring) => {
        if (ring.length === 0) return;
        const [first, ...rest] = ring;
        path += `M ${first[0]} ${first[1]} `;
        rest.forEach(([x, y]) => {
          path += `L ${x} ${y} `;
        });
        path += "Z ";
      });
  
      return (
        <Path
          key={`merged-wall-${i}`}
          data={path}
          fill="rgba(200,200,200,0.5)"
          fillRule="evenodd"   // ✅ This solves the nested fill issue
          stroke="black"
          strokeWidth={0.5}
        />
      );
    });
  };
  
  const renderWallOutlines = () => {
    const merged = getMergedWallShape();
    if (!merged || merged.length === 0) return null;
  
    return merged.map((shape, i) => {
      let path = "";
  
      shape.forEach((ring) => {
        if (ring.length === 0) return;
        const [first, ...rest] = ring;
        path += `M ${first[0]} ${first[1]} `;
        rest.forEach(([x, y]) => {
          path += `L ${x} ${y} `;
        });
        path += "Z ";
      });
  
      return (
        <Path
          key={`outline-${i}`}
          data={path}
          fill="transparent"
          stroke="black"
          strokeWidth={1}
        />
      );
    });
  };
  
  
  

  return (
    <>
  {renderUnifiedWallFill()}
  {renderWalls()}

    {renderPreview()}
    </>
  );
};

export default WallTool;