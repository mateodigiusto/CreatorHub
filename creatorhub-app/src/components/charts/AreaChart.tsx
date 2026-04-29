"use client";

import { useLayoutEffect, useRef, useState } from "react";

export type AreaPoint = { x?: string; y: number };

export function AreaChart({
  data,
  height = 240,
}: {
  data: AreaPoint[];
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    setW(Math.round(wrapRef.current.getBoundingClientRect().width));
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect?.width;
      if (cw) setW((curr) => (Math.abs(cw - curr) > 1 ? Math.round(cw) : curr));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const h = height;
  const pad = { l: 40, r: 20, t: 24, b: 36 };
  const xs = data.map((_, i) => i);
  const ys = data.map((d) => d.y);
  const maxY = Math.max(...ys, 1) * 1.15;
  const minY = 0;
  const sx = (i: number) =>
    pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, xs.length - 1);
  const sy = (y: number) =>
    pad.t + (h - pad.t - pad.b) * (1 - (y - minY) / (maxY - minY || 1));

  let line = `M ${sx(0)} ${sy(ys[0])}`;
  for (let i = 1; i < ys.length; i++) line += ` L ${sx(i)} ${sy(ys[i])}`;
  const area =
    line +
    ` L ${sx(xs.length - 1)} ${h - pad.b} L ${sx(0)} ${h - pad.b} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(
    (t) => pad.t + (h - pad.t - pad.b) * t
  );
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round(maxY * (1 - t))
  );

  return (
    <div ref={wrapRef} className="w-full max-w-full overflow-hidden">
      {w > 0 && (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width={w}
          height={h}
          className="block max-w-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="ch-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14315E" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#14315E" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ch-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0B1F3A" />
              <stop offset="100%" stopColor="#1B4FD4" />
            </linearGradient>
          </defs>
          {ticks.map((y, i) => (
            <line
              key={i}
              x1={pad.l}
              x2={w - pad.r}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray={i === ticks.length - 1 ? "0" : "3 4"}
              strokeWidth={1}
            />
          ))}
          {yLabels.map((v, i) => (
            <text
              key={i}
              x={pad.l - 8}
              y={ticks[i] + 3}
              textAnchor="end"
              fontSize="10.5"
              fill="var(--text-muted)"
              fontFamily="inherit"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {v}
            </text>
          ))}
          <path d={area} fill="url(#ch-area)" />
          <path
            d={line}
            fill="none"
            stroke="url(#ch-line)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {data.map((d, i) =>
            d.x ? (
              <text
                key={i}
                x={sx(i)}
                y={h - 10}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-muted)"
                fontFamily="inherit"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {d.x}
              </text>
            ) : null
          )}
          {ys.length > 0 && (
            <>
              <circle
                cx={sx(ys.length - 1)}
                cy={sy(ys[ys.length - 1])}
                r={6}
                fill="#14315E"
                opacity={0.18}
              />
              <circle
                cx={sx(ys.length - 1)}
                cy={sy(ys[ys.length - 1])}
                r={3.5}
                fill="var(--surface)"
                stroke="#14315E"
                strokeWidth={2}
              />
            </>
          )}
        </svg>
      )}
    </div>
  );
}
