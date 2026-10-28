// Pure maths for the scene camera and the world map. No DOM, so it's unit-tested in Node.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Where a scene's camera box must sit so `target` ([x%, y%] of the image) is centred
 * on screen at `zoom`. The result is clamped so the image always covers the screen —
 * near an image edge the target ends up slightly off-centre instead of showing a gap.
 *
 * @param look  turn sideways, in screen widths (+ = look right, − = look left)
 * @returns {{x: number, y: number, scale: number}}  ready for GSAP
 */
export function computeCameraView({ screenWidth, screenHeight, coverHeight, boxWidth, boxHeight, target, zoom = 1, look = 0 }) {
  const [targetX, targetY] = target;
  const centredX = screenWidth / 2 - zoom * (targetX / 100) * boxWidth - look * screenWidth;
  const centredY = screenHeight / 2 - zoom * (targetY / 100) * boxHeight;
  return {
    x: clamp(centredX, screenWidth - zoom * boxWidth, 0),
    y: clamp(centredY, coverHeight - zoom * boxHeight, 0),
    scale: zoom,
  };
}

// Equirectangular projection: longitude maps straight to x, latitude to y.
export function projectToMap([lat, lng], mapWidth, mapHeight) {
  return [((lng + 180) / 360) * mapWidth, ((90 - lat) / 180) * mapHeight];
}

// Running total of route length: 0 at the first point, then + each straight leg.
export function cumulativeLengths(points) {
  const lengths = points.length ? [0] : [];
  for (let i = 1; i < points.length; i++) {
    const [fromX, fromY] = points[i - 1];
    const [toX, toY] = points[i];
    lengths.push(lengths[i - 1] + Math.hypot(toX - fromX, toY - fromY));
  }
  return lengths;
}
