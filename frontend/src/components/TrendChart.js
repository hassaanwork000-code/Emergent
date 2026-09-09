import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#282C37] bg-[#0A0A0C] px-3 py-2 text-xs">
      <div className="text-gray-400 mb-1">Week of {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="font-mono-nums" style={{ color: p.color }}>
          {p.name}: {p.value == null ? "—" : p.dataKey === "fg_pct" ? `${p.value}%` : p.value}
        </div>
      ))}
    </div>
  );
}

export default function TrendChart() {
  const [weeks, setWeeks] = useState(null);
  useEffect(() => { api.get("/progress/trends").then(({ data }) => setWeeks(data.weeks)); }, []);

  const hasData = weeks && weeks.some((w) => w.attempts > 0 || w.dev_score > 50);

  return (
    <div className="surface p-6 fade-up">
      <div className="flex items-center gap-2 text-[#C6FF00] mb-4">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs uppercase tracking-widest">Progress Trends — Last 8 Weeks</span>
      </div>
      {!weeks ? (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">Loading trends…</div>
      ) : !hasData ? (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm text-center px-6">
          Log shots and workouts across a few weeks to watch your curve climb.
        </div>
      ) : (
        <div className="h-64" data-testid="trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeks} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282C37" vertical={false} />
              <XAxis dataKey="label" stroke="#6B7280" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#282C37" }} />
              <YAxis domain={[0, 100]} stroke="#6B7280" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }} />
              <Line type="monotone" dataKey="dev_score" name="Dev Score" stroke="#C6FF00" strokeWidth={2.5} dot={{ r: 3, fill: "#C6FF00" }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="fg_pct" name="FG%" stroke="#2F80FF" strokeWidth={2.5} dot={{ r: 3, fill: "#2F80FF" }} activeDot={{ r: 5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
