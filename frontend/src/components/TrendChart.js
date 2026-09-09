import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Share2, Download } from "lucide-react";

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

  const shareTrend = () => {
    if (!weeks) return;
    const W = 1080, H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0A0A0C"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#C6FF00"; ctx.lineWidth = 8; ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.fillStyle = "#C6FF00"; ctx.font = "900 34px 'Barlow Condensed', sans-serif";
    ctx.fillText("ELITE AI BASKETBALL COACH", 90, 130);
    ctx.fillStyle = "#F4F5F7"; ctx.font = "900 84px 'Barlow Condensed', sans-serif";
    ctx.fillText("8-WEEK TREND", 90, 240);

    // plot area
    const px = 120, py = 340, pw = W - 240, ph = 480;
    ctx.strokeStyle = "#282C37"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = py + (ph * i) / 4; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke(); }
    const n = weeks.length;
    const xAt = (i) => px + (pw * i) / (n - 1);
    const yAt = (v) => py + ph - (ph * v) / 100;
    const drawLine = (key, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath();
      let started = false;
      weeks.forEach((w, i) => {
        const v = w[key];
        if (v == null) return;
        const x = xAt(i), y = yAt(v);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = color;
      weeks.forEach((w, i) => { if (w[key] != null) { ctx.beginPath(); ctx.arc(xAt(i), yAt(w[key]), 8, 0, Math.PI * 2); ctx.fill(); } });
    };
    drawLine("dev_score", "#C6FF00");
    drawLine("fg_pct", "#2F80FF");

    // legend + latest
    ctx.font = "700 30px Inter, sans-serif";
    ctx.fillStyle = "#C6FF00"; ctx.fillText("DEV SCORE", 120, 900);
    ctx.fillStyle = "#2F80FF"; ctx.fillText("FG%", 420, 900);
    const last = weeks[weeks.length - 1];
    ctx.fillStyle = "#F4F5F7"; ctx.font = "900 120px 'JetBrains Mono', monospace";
    ctx.fillText(`${last.dev_score}`, 90, 1010);
    ctx.fillStyle = "#6B7280"; ctx.font = "600 34px Inter, sans-serif";
    ctx.fillText("CURRENT DEV SCORE", 95, 1050);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], "elite-trend.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "My 8-Week Trend" }); return; } catch { /* fall through */ }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "elite-trend.png"; link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="surface p-6 fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[#C6FF00]">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs uppercase tracking-widest">Progress Trends — Last 8 Weeks</span>
        </div>
        {hasData && (
          <button onClick={shareTrend} data-testid="share-trend-btn"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#282C37] px-3.5 py-1.5 text-xs text-gray-300 hover:border-[#C6FF00] hover:text-white transition-colors">
            {navigator.canShare ? <Share2 className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />} Share Trend
          </button>
        )}
      </div>
      {!weeks ? (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">Loading trends…</div>
      ) : !hasData ? (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm text-center px-6">
          Log shots and workouts across a few weeks to watch your curve climb.
        </div>
      ) : (
        <div className="h-64" data-testid="trend-chart">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256} debounce={1}>
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
