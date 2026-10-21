// On-screen thumbstick (mobile): turns the thumb's offset from the
// stick's center into an analog direction of length <= 1.

const DEADZONE = 0.15;

export function joystickVector(dx, dy, radius) {
  const len = Math.hypot(dx, dy) / radius;
  if (len < DEADZONE) return { x: 0, y: 0 };
  const scale = Math.min(len, 1) / len / radius;
  return { x: dx * scale, y: dy * scale };
}
