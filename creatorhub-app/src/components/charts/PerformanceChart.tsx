"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { reachSeries } from "@/lib/mock/data";

export function PerformanceChart({ height = 240 }: { height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={reachSeries} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="reachFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="engFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--indigo-soft)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--indigo-soft)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          interval={3}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}K` : v)}
        />
        <Tooltip
          cursor={{ stroke: "var(--accent)", strokeOpacity: 0.25 }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--text)",
            boxShadow: "var(--shadow-card)",
          }}
          labelStyle={{ color: "var(--text)" }}
          itemStyle={{ color: "var(--text)" }}
          formatter={(v) => Number(v).toLocaleString()}
        />
        <Area
          type="monotone"
          dataKey="reach"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#reachFill)"
          name="Reach"
        />
        <Area
          type="monotone"
          dataKey="engagement"
          stroke="var(--indigo-soft)"
          strokeWidth={2}
          fill="url(#engFill)"
          name="Engagement"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
