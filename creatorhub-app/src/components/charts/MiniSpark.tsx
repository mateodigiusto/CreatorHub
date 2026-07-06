export function MiniSpark({
  values,
  height = 28,
  width = 80,
  color = "#14315E",
}: {
  values: number[];
  height?: number;
  width?: number;
  color?: string;
}) {
  if (values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const sx = (i: number) => (i * width) / (values.length - 1);
  const sy = (v: number) => height - ((v - min) / range) * height;
  let d = `M ${sx(0)} ${sy(values[0])}`;
  for (let i = 1; i < values.length; i++) d += ` L ${sx(i)} ${sy(values[i])}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
