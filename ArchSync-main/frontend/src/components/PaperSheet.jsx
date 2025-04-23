import React from "react";
import { Rect, Group, Line, Text } from "react-konva";
import { snapToPixel } from "../utils/renderUtils";

/**
 * PaperSheet component that renders a paper with optional grid and measurements
 * Enhanced for high resolution rendering
 */
const PaperSheet = ({ 
  position = { x: 0, y: 0 },
  dimensions = { width: 500, height: 700 },
  showGrid = true,
  gridSpacing = 10, // mm
  zoom = 1,
  scaleGrid = true
}) => {
  // Snap position to pixel for sharper rendering
  const snappedX = snapToPixel(position.x);
  const snappedY = snapToPixel(position.y);
  
  const renderGrid = () => {
    if (!showGrid) return null;
    
    const lines = [];
    const { width, height } = dimensions;
    
    // Calculate grid spacing in pixels adjusted for zoom
    const spacing = scaleGrid 
      ? Math.max(5, Math.round(gridSpacing * zoom))
      : gridSpacing;
    
    // Major grid interval (every 5 cells)
    const majorInterval = 5;
    
    // Vertical lines
    for (let x = 0; x <= width; x += spacing) {
      const isMajor = Math.round(x / spacing) % majorInterval === 0;
      const snappedLineX = snapToPixel(x);
      
      lines.push(
        <Line
          key={`v-${x}`}
          points={[snappedLineX, 0, snappedLineX, height]}
          stroke={isMajor ? "#aaa" : "#ddd"}
          strokeWidth={isMajor ? 0.5 : 0.25}
          perfectDrawEnabled={true}
          listening={false}
        />
      );
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += spacing) {
      const isMajor = Math.round(y / spacing) % majorInterval === 0;
      const snappedLineY = snapToPixel(y);
      
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, snappedLineY, width, snappedLineY]}
          stroke={isMajor ? "#aaa" : "#ddd"}
          strokeWidth={isMajor ? 0.5 : 0.25}
          perfectDrawEnabled={true}
          listening={false}
        />
      );
    }
    
    return lines;
  };
  
  // Add subtle grid label measurements (mm)
  const renderGridLabels = () => {
    if (!showGrid) return null;
    
    const labels = [];
    const { width, height } = dimensions;
    
    // Calculate grid spacing in pixels adjusted for zoom
    const spacing = scaleGrid 
      ? Math.max(5, Math.round(gridSpacing * zoom))
      : gridSpacing;
    
    // Only show labels for major grid lines (every 50mm)
    const labelInterval = 50;
    const scaledInterval = (labelInterval / gridSpacing) * spacing;
    
    // Ensure we only render when zoomed enough to see the labels
    if (zoom >= 0.8) {
      // Horizontal labels (along top edge)
      for (let x = scaledInterval; x < width; x += scaledInterval) {
        const labelValue = Math.round((x / dimensions.width) * 100) / 100 * width;
        labels.push(
          <Text
            key={`label-h-${x}`}
            x={x - 10}
            y={4}
            text={`${Math.round(labelValue)}mm`}
            fontSize={8}
            fill="#888"
            listening={false}
          />
        );
      }
      
      // Vertical labels (along left edge)
      for (let y = scaledInterval; y < height; y += scaledInterval) {
        const labelValue = Math.round((y / dimensions.height) * 100) / 100 * height;
        labels.push(
          <Text
            key={`label-v-${y}`}
            x={4}
            y={y - 6}
            text={`${Math.round(labelValue)}mm`}
            fontSize={8}
            fill="#888"
            listening={false}
          />
        );
      }
    }
    
    return labels;
  };
  
  return (
    <Group x={snappedX} y={snappedY}>
      {/* Paper background */}
      <Rect
        width={dimensions.width}
        height={dimensions.height}
        fill="white"
        stroke="#ccc"
        strokeWidth={1}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={5}
        shadowOffsetX={2}
        shadowOffsetY={2}
        cornerRadius={1}
        perfectDrawEnabled={true}
      />
      
      {/* Grid lines */}
      {renderGrid()}
      
      {/* Grid measurements */}
      {renderGridLabels()}
    </Group>
  );
};

export default PaperSheet;