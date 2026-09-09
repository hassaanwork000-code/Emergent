import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import ShareCard from "@/components/ShareCard";
import TrendChart from "@/components/TrendChart";
import { CalendarDays, TrendingUp, TrendingDown, Minus, Target, Dumbbell, Video, Flame } from "lucide-react";

export default function WeeklyReport() {
  const [r, setR] = useState(null);
  useEffect(() => { api.get("/report/weekly").then(({ data }) => setR(data)); }, []);
  if (!r) return <Loading />;

  const TrendIcon = r.delta_pct == null ? Minus : r.delta_pct > 0 ? TrendingUp : r.delta_pct < 0 ? TrendingDown : Minus;
  const trendColor = r.delta_pct == null ? "#9CA3AF" : r.delta_pct > 0 ? "#00E676" : r.delta_pct < 0 ? "#FF3B30" : "#9CA3AF";

  return (
    <div>
      <PageHeader title="Weekly Report" subtitle={`Sunday recap · ${r.week_start} → ${r.week_end}`} icon={CalendarDays}
        action={<ShareCard title="Week Recap" subtitle={`${r.week_start} → ${r.week_end}`} lines={[{ label: "FG%", value: `${r.shot_pct}%` }, { label: "Active Days", value: `${r.active_days}` }]} />} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 fade-up">
        <Metric icon={Target} label="Made" value={r.shots_made} />        <Metric icon={Target} label="Attempts" value={r.shots_attempted} />
        <Metric icon={Target} label="FG%" value={`${r.shot_pct}%`} accent="#00E676" />
        <Metric icon={Dumbbell} label="Workouts" value={r.workouts} />
        <Metric icon={Flame} label="Active Days" value={r.active_days} accent="#FFB300" />
        <Metric icon={Video} label="Films" value={r.films} accent="#2F80FF" />
      </div>

      <div className="mt-6"><TrendChart /></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="surface p-6 fade-up">
          <span className="text-xs uppercase tracking-widest text-gray-500">vs Last Week</span>
          <div className="flex items-center gap-2 mt-2" style={{ color: trendColor }}>
            <TrendIcon className="h-8 w-8" />
            <span className="font-mono-nums text-4xl font-bold">{r.delta_pct == null ? "—" : `${r.delta_pct > 0 ? "+" : ""}${r.delta_pct}%`}</span>
          </div>
          <p className="mt-3 text-sm text-gray-400">{r.improvement}</p>
        </div>

        <div className="surface p-6 fade-up">
          <span className="text-xs uppercase tracking-widest text-gray-500">Best Pressure Run</span>
          <div className="font-mono-nums text-4xl font-bold text-[#C6FF00] mt-2">{r.best_challenge}</div>
          <p className="mt-1 text-sm text-gray-500">makes this week</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
            <Flame className="h-4 w-4 text-[#FFB300]" /> {r.streak}-day streak
          </div>
        </div>

        <div className="surface p-6 fade-up border-l-2 border-l-[#C6FF00]">
          <span className="text-xs uppercase tracking-widest text-[#C6FF00]">Focus For Next Week</span>
          <p className="mt-2 text-lg text-white font-semibold">{r.focus}</p>
          {r.archetype && <p className="mt-2 text-sm text-gray-500">Keep building toward your {r.archetype} identity.</p>}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent = "#F4F5F7" }) {
  return (
    <div className="surface p-4">
      <Icon className="h-4 w-4 text-gray-500 mb-2" />
      <div className="font-mono-nums text-2xl font-bold" style={{ color: accent }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
