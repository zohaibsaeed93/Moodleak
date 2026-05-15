export function formatResolution(width: number, height: number) {
  if (!width || !height) {
    return "waiting";
  }

  return `${width} x ${height}`;
}
