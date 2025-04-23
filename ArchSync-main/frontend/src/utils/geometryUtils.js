export function getArcAnglePreview(start, corner, end) {
    const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  
    const angle1 = angle(corner, start);
    const angle2 = angle(corner, end);
    let delta = angle2 - angle1;
  
    if (delta < 0) delta += 2 * Math.PI;
  
    const radius = 20; // radius of the arc
    return {
      x: corner.x,
      y: corner.y,
      innerRadius: radius - 3,
      outerRadius: radius + 3,
      angle: (delta * 180) / Math.PI,
      rotation: (angle1 * 180) / Math.PI,
    };
  }
  