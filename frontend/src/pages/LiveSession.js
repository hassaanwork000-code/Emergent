import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, StatPill } from "@/components/common";
import ShotChart, { SHOT_ZONES } from "@/components/ShotChart";
import { Radio, Check, X, Flag, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";

function defaultType(zone) {
  if (zone === "ft") return "Free Throw";
  if (zone === "paint") return "Layup";
  if (["mid-L", "mid-R"].includes(zone)) return "Pull-Up";
  return "Catch & Shoot";
}

function aggregate(shots) {
  const by = {};
  shots.forEach((s) => {
    by[s.zone] = by[s.zone] || { makes: 0, attempts: 0 };
    by[s.zone].attempts += 1;
    if (s.made) by[s.zone].makes += 1;
  });
  return by;
}

export default function LiveSession() {
  const [active, setActive] = useState(false);
  const [shots, setShots] = useState([]);
  const [zone, setZone] = useState("top");
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState(null);
  const startTime = useState(() => Date.now())[0];

  const makes = shots.filter((s) => s.made).length;
  const pct = shots.length ? Math.round((makes / shots.length) * 100) : 0;
  const byZone = aggregate(shots);

  const start = () => { setActive(true); setShots([]); setResult(null); };
  const log = (made) => setShots((s) => [...s, { zone, shot_type: defaultType(zone), made }]);
  const undo = () => setShots((s) => s.slice(0, -1));

  const finish = async () => {
    if (!shots.length) { toast.error("Log some shots first."); return; }
    setFinishing(true);
    try {
      const { data } = await api.post("/sessions/finish", { shots, duration_sec: Math.round((Date.now() - startTime) / 1000) });
      setResult(data);
      setActive(false);
      toast.success("Session saved. Your coach broke it down.");
    } catch {
      toast.error("Could not save session.");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div>
      <PageHeader title="Live Session" icon={Radio}
        subtitle="Run a full shooting session with a live heatmap, then get an instant AI recap. Saved to your history and shot chart." />

      {!active && !result && (
        <div className="surface p-10 text-center fade-up">
          <div className="h-14 w-14 rounded-2xl bg-[#C6FF00]/10 border border-[#C6FF00]/30 flex items-center justify-center mx-auto mb-4">
            <Radio className="h-7 w-7 text-[#C6FF00]" />
          </div>
          <h2 className="heading text-2xl text-white">Ready to get up shots?</h2>
          <p className="text-sm text-gray-400 mt-1 mb-6">Tap a zone, hit make or miss for every rep. Finish to lock in your recap.</p>
          <button onClick={start} data-testid="session-start" className="btn-lime rounded-full px-8 py-3">Start Session</button>
        </div>
      )}

      {active && (
        <div className="fade-up">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatPill label="Makes" value={makes} accent="#00E676" />
            <StatPill label="Reps" value={shots.length} accent="#C6FF00" />
            <StatPill label="FG%" value={`${pct}%`} accent="#2F80FF" />
            <StatPill label="Zone" value={SHOT_ZONES.find((z) => z.id === zone)?.label || "-"} accent="#FFB300" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 surface p-4">
              <ShotChart byZone={byZone} selected={zone} onSelect={setZone} />
            </div>
            <div className="lg:col-span-2 surface p-6 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => log(true)} data-testid="session-make"
                  className="rounded-2xl py-14 bg-[#00E676] text-[#0A0A0A] font-black uppercase text-xl flex flex-col items-center gap-2 active:scale-95 transition-transform">
                  <Check className="h-8 w-8" /> Make
                </button>
                <button onClick={() => log(false)} data-testid="session-miss"
                  className="rounded-2xl py-14 bg-[#FF3B30] text-white font-black uppercase text-xl flex flex-col items-center gap-2 active:scale-95 transition-transform">
                  <X className="h-8 w-8" /> Miss
                </button>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button onClick={undo} disabled={!shots.length} data-testid="session-undo"
                  className="flex-1 rounded-lg border border-[#282C37] py-2.5 text-sm text-gray-300 hover:border-gray-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
                  <Undo2 className="h-4 w-4" /> Undo
                </button>
                <button onClick={finish} disabled={finishing} data-testid="session-finish"
                  className="flex-1 btn-lime rounded-lg py-2.5 flex items-center justify-center gap-2">
                  {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />} Finish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="fade-up space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatPill label="Makes" value={`${result.makes}/${result.attempts}`} accent="#C6FF00" />
            <StatPill label="FG%" value={`${result.pct}%`} accent="#00E676" />
            <StatPill label="Coldest Zone" value={result.weak_zone ? (SHOT_ZONES.find((z) => z.id === result.weak_zone)?.label || result.weak_zone) : "-"} accent="#FF3B30" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 surface p-4"><ShotChart byZone={result.by_zone} /></div>
            <div className="lg:col-span-2 surface p-6 border-l-2 border-l-[#C6FF00]">
              <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">Coach's Recap</span>
              <p className="mt-2 text-sm text-gray-200 whitespace-pre-wrap" data-testid="session-recap">{result.recap}</p>
            </div>
          </div>
          <button onClick={start} data-testid="session-again" className="btn-lime rounded-full px-6 py-2.5 inline-flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> New Session
          </button>
        </div>
      )}
    </div>
  );
}
