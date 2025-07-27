const colors: string[] = [
  "#FF0000",
  "#0066FF",
  "#00CC00",
  "#FF6600",
  "#9900CC",
  "#FFCC00",
  "#FF0099",
  "#00CCFF",
  "#CC3300",
  "#006600",
];

export function pickCycleColor(id: number): string {
  return colors[id % colors.length] as string;
}
