import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, StatPill } from "@/components/common";
import ShotChart, { SHOT_ZONES } from "@/components/ShotChart";
import { Target, Check, X } from "lucide-react";
import { toast } from "sonner";

const SHOT_TYPES = ["Catch & Shoot", "Pull-Up", "Layup", "Floater", "Step-Back", "Free Throw"];

function defaultType(zone) {
  if (zone === "ft") return "Free Throw";
  if (zone === "paint") return "Layup";
  if (["mid-L", "mid-R"].includes(zone)) return "Pull-Up";
  return "Catch & Shoot";
}

export default function ShotTracker() {
  const [stats, setStats] = useState({ by_zone: {}, makes: 0, total: 0, pct: 0 });
  const [selected, setSelected] = useState(null);
  const [shotType, setShotType] = useState("Catch & Shoot");
  const [logging, setLogging] = useState(false);

  const load = () => api.get("/shots").then(({ data }) => setStats(data));
  useEffect(() => { load(); }, []);

  const pick = (zone) => { setSelected(zone); setShotType(defaultType(zone)); };

  const log = async (made) => {
    if (!selected || logging) return;
    setLogging(true);
    try {
      await api.post("/shots/log", { zone: selected, shot_type: shotType, made });
      await load();
      toast[made ? "success" : "message"](made ? "Make logged" : "Miss logged", { duration: 900 });
    } finally {
      setLogging(false);
    }
  };

  const zoneStat = selected ? stats.by_zone[selected] : null;

  return (
    <div>
      <PageHeader title="Shot Tracker" subtitle="Log makes & misses by zone. Watch your half-court heatmap update live." icon={Target} />

      <div className="grid grid-cols-3 gap-4 mb-6 fade-up">
        <StatPill label="Total FG%" value={`${stats.pct}%`} accent="#00E676" />
        <StatPill label="Makes" value={stats.makes} accent="#C6FF00" />
        <StatPill label="Attempts" value={stats.total} accent="#2F80FF" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 surface p-4 fade-up">
          <ShotChart byZone={stats.by_zone} selected={selected} onSelect={pick} />
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <Legend color="#00E676" label="≥50%" /><Legend color="#FFB300" label="40-49%" />
            <Legend color="#FF3B30" label="<40%" /><Legend color="#4A4E5D" label="No data" />
          </div>
        </div>

        <div className="lg:col-span-2 surface p-6 fade-up">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <Target className="h-10 w-10 text-gray-600 mb-3" />
              <p className="text-gray-400">Tap a zone on the court to start logging shots.</p>
            </div>
          ) : (
            <div>
              <span className="text-xs uppercase tracking-widest text-[#C6FF00]">Logging zone</span>
              <h3 className="heading text-2xl text-white mt-1" data-testid="selected-zone">
                {SHOT_ZONES.find((z) => z.id === selected)?.label}
              </h3>
              {zoneStat && zoneStat.attempts > 0 && (
                <p className="text-sm text-gray-400 mt-1 font-mono-nums">
                  {zoneStat.makes}/{zoneStat.attempts} · {Math.round((zoneStat.makes / zoneStat.attempts) * 100)}%
                </p>
              )}

              <div className="mt-5">
                <span className="text-[10px] uppercase tracking-widest text-gray-500">Shot Type</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SHOT_TYPES.map((t) => (
                    <button key={t} data-testid={`shottype-${t}`} onClick={() => setShotType(t)}
                      className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
                        shotType === t ? "bg-[#2F80FF]/20 border-[#2F80FF] text-white" : "border-[#282C37] text-gray-400 hover:border-gray-500"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => log(true)} disabled={logging} data-testid="log-make"
                  className="rounded-xl py-6 bg-[#00E676] text-[#0A0A0A] font-black uppercase text-lg flex flex-col items-center gap-1 hover:brightness-110 transition-all">
                  <Check className="h-7 w-7" /> Make
                </button>
                <button onClick={() => log(false)} disabled={logging} data-testid="log-miss"
                  className="rounded-xl py-6 bg-[#FF3B30] text-white font-black uppercase text-lg flex flex-col items-center gap-1 hover:brightness-110 transition-all">
                  <X className="h-7 w-7" /> Miss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-400">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />{label}
    </div>
  );
}
