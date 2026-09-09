import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, StatPill } from "@/components/common";
import ShareCard from "@/components/ShareCard";
import { Timer, Check, X, Play, RotateCcw, Trophy } from "lucide-react";

function buzz() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square"; osc.frequency.value = 180;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    osc.stop(ctx.currentTime + 1.1);
  } catch { /* ignore */ }
}

export default function Pressure() {
  const [duration, setDuration] = useState(60);
  const [state, setState] = useState("idle"); // idle | running | done
  const [timeLeft, setTimeLeft] = useState(60);
  const [makes, setMakes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [best, setBest] = useState(0);
  const [lastRun, setLastRun] = useState(null);
  const timerRef = useRef(null);

  const load = () => api.get("/challenge/history").then(({ data }) => setBest(data.best_makes));
  useEffect(() => { load(); }, []);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const start = () => {
    setMakes(0); setAttempts(0); setTimeLeft(duration); setState("running"); setLastRun(null);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); finish(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const finish = async () => {
    buzz();
    setState("done");
    setMakes((mk) => {
      setAttempts((at) => {
        api.post("/challenge/log", { makes: mk, attempts: at, duration_sec: duration, mode: "rapid-fire" })
          .then(({ data }) => { setLastRun(data); setBest(data.best_makes); });
        return at;
      });
      return mk;
    });
  };

  const reset = () => { clearInterval(timerRef.current); setState("idle"); setTimeLeft(duration); setMakes(0); setAttempts(0); };

  const pct = attempts ? Math.round((makes / attempts) * 100) : 0;
  const running = state === "running";

  return (
    <div>
      <PageHeader title="Pressure Mode" subtitle="Rapid-fire shooting on the clock. Beat the buzzer and your personal best." icon={Timer} />

      <div className="grid grid-cols-3 gap-4 mb-6 fade-up">
        <StatPill label="Personal Best" value={best} accent="#FFB300" />
        <StatPill label="Live FG%" value={`${pct}%`} accent="#00E676" />
        <StatPill label="Makes" value={`${makes}/${attempts}`} accent="#C6FF00" />
      </div>

      {state === "idle" && (
        <div className="surface p-8 text-center fade-up">
          <span className="text-xs uppercase tracking-widest text-gray-500">Choose Duration</span>
          <div className="flex justify-center gap-3 mt-3 mb-6">
            {[30, 60, 90].map((d) => (
              <button key={d} data-testid={`pressure-dur-${d}`} onClick={() => { setDuration(d); setTimeLeft(d); }}
                className={`rounded-xl px-6 py-4 border font-mono-nums text-xl font-bold transition-colors ${
                  duration === d ? "bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00]" : "border-[#282C37] text-gray-300 hover:border-gray-500"}`}>
                {d}s
              </button>
            ))}
          </div>
          <button onClick={start} data-testid="pressure-start" className="btn-lime rounded-full px-8 py-3.5 inline-flex items-center gap-2 text-lg">
            <Play className="h-5 w-5 fill-current" /> Start Challenge
          </button>
        </div>
      )}

      {running && (
        <div className="fade-up">
          <div className={`surface p-8 text-center mb-4 ${timeLeft <= 5 ? "border-[#FF3B30]" : ""}`}>
            <span className="text-xs uppercase tracking-widest text-gray-500">Time Left</span>
            <div className={`font-mono-nums text-7xl sm:text-8xl font-black ${timeLeft <= 5 ? "text-[#FF3B30]" : "text-white"}`} data-testid="pressure-clock">
              {timeLeft}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setMakes((m) => m + 1); setAttempts((a) => a + 1); }} data-testid="pressure-make"
              className="rounded-2xl py-16 bg-[#00E676] text-[#0A0A0A] font-black uppercase text-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <Check className="h-10 w-10" /> Make
            </button>
            <button onClick={() => setAttempts((a) => a + 1)} data-testid="pressure-miss"
              className="rounded-2xl py-16 bg-[#FF3B30] text-white font-black uppercase text-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <X className="h-10 w-10" /> Miss
            </button>
          </div>
          <button onClick={reset} className="mt-4 mx-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
            <RotateCcw className="h-4 w-4" /> Cancel
          </button>
        </div>
      )}

      {state === "done" && (
        <div className="surface p-8 text-center fade-up">
          {lastRun?.is_best && (
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFB300]/15 border border-[#FFB300]/40 text-[#FFB300] px-4 py-1.5 text-sm mb-4">
              <Trophy className="h-4 w-4" /> New Personal Best!
            </div>
          )}
          <span className="text-xs uppercase tracking-widest text-gray-500">Time's Up</span>
          <div className="font-mono-nums text-6xl font-black text-[#C6FF00] my-2" data-testid="pressure-result">{makes}/{attempts}</div>
          <p className="text-gray-400">{pct}% from the field in {duration} seconds</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button onClick={start} data-testid="pressure-again" className="btn-lime rounded-full px-6 py-2.5 inline-flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Run It Back
            </button>
            <ShareCard title="Pressure Run" subtitle={`${duration}s rapid-fire`} accent="#C6FF00"
              lines={[{ label: "Makes", value: `${makes}` }, { label: "FG%", value: `${pct}%` }]} />
          </div>
        </div>
      )}
    </div>
  );
}
