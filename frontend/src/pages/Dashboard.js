import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Loading } from "@/components/common";
import ShareCard from "@/components/ShareCard";
import {
  Flame, Zap, MessageSquare, Dumbbell, Target, Timer, BookOpen, Users, Trophy,
  TrendingUp, ArrowRight, ScanLine, CalendarDays, Bell, X, Radio, GitCompare, Flag,
  Brain, Dna, FlaskConical,
} from "lucide-react";

const QUICK = [
  { to: "/coach", label: "AI Coach", icon: MessageSquare },
  { to: "/iq", label: "IQ Lab", icon: Brain },
  { to: "/dna", label: "DNA Evolution", icon: Dna },
  { to: "/archetype", label: "Archetype Lab", icon: FlaskConical },
  { to: "/training", label: "Training Plan", icon: Dumbbell },
  { to: "/session", label: "Live Session", icon: Radio },
  { to: "/shots", label: "Shot Tracker", icon: Target },
  { to: "/analyze", label: "Analyze", icon: ScanLine },
  { to: "/pressure", label: "Pressure Mode", icon: Timer },
  { to: "/skills", label: "Skill Library", icon: BookOpen },
  { to: "/players", label: "Player Lab", icon: Users },
  { to: "/report", label: "Weekly Report", icon: CalendarDays },
];

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [nudgeClosed, setNudgeClosed] = useState(false);

  useEffect(() => { api.get("/dashboard").then(({ data }) => setD(data)); }, []);

  useEffect(() => {
    if (!d || d.trained_today) return;
    const key = `nudge-${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) return;
    if (typeof Notification === "undefined") return;
    const fire = () => {
      if (Notification.permission !== "granted") return;
      localStorage.setItem(key, "1");
      const body = d.streak > 0
        ? `Keep your ${d.streak}-day streak alive — get a session in today.`
        : "Start a new training streak today. One session is all it takes.";
      try { new Notification("Elite AI Basketball Coach", { body }); } catch { /* ignore */ }
    };
    if (Notification.permission === "granted") fire();
    else if (Notification.permission !== "denied") Notification.requestPermission().then((p) => { if (p === "granted") fire(); });
  }, [d]);

  if (!d) return <Loading />;

  const scorePct = d.development_score;
  const showNudge = !d.trained_today && !nudgeClosed;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#C6FF00]">Welcome back</p>
          <h1 className="heading text-4xl sm:text-5xl text-white leading-none mt-1">{d.name}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {d.archetype}{d.target ? <> · Chasing <span className="text-[#2F80FF]">{d.target}</span></> : null}
          </p>
        </div>
        <ShareCard title="Development" subtitle="Elite AI Basketball Coach" playerName={d.name}
          lines={[{ label: "Dev Score", value: `${d.development_score}` }, { label: "Day Streak", value: `${d.streak}` }]} />
      </div>

      {showNudge && (
        <div data-testid="streak-nudge" className="fade-up flex items-center justify-between gap-4 surface p-4 border-l-2 border-l-[#FFB300]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#FFB300]/15 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-[#FFB300]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {d.streak > 0 ? `Don't break your ${d.streak}-day streak` : "Start a training streak today"}
              </p>
              <p className="text-xs text-gray-400">You haven't logged a session today. A quick workout keeps the momentum.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/training" data-testid="nudge-train" className="btn-lime rounded-full px-4 py-2 text-xs">Train now</Link>
            <button data-testid="nudge-dismiss" onClick={() => setNudgeClosed(true)} className="text-gray-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority */}
        <div className="lg:col-span-2 surface p-6 fade-up">
          <div className="flex items-center gap-2 text-[#C6FF00] mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">Today's Priority</span>
          </div>
          <h2 className="heading text-2xl sm:text-3xl text-white">{d.priority}</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-xl">{d.priority_why}</p>
          <Link to="/training" data-testid="dash-start-training"
            className="mt-5 inline-flex items-center gap-2 btn-lime rounded-full px-5 py-2.5 text-sm">
            Generate Today's Workout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Dev score gauge */}
        <div className="surface p-6 flex flex-col items-center justify-center fade-up">
          <span className="text-xs uppercase tracking-widest text-gray-500 mb-3">Development Score</span>
          <div className="relative h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#282C37" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="#C6FF00" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(scorePct / 100) * 326.7} 326.7`} className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono-nums text-4xl font-bold text-white">{d.development_score}</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-500">/ 99</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 fade-up">
        <Stat icon={Flame} label="Day Streak" value={d.streak} accent="#FFB300" />
        <Stat icon={Target} label="FG%" value={`${d.shot_pct}%`} accent="#00E676" />
        <Stat icon={Zap} label="Makes" value={`${d.makes}/${d.attempts}`} accent="#2F80FF" />
        <Stat icon={Dumbbell} label="Sessions 30d" value={d.sessions_30d} accent="#C6FF00" />
      </div>

      {/* Daily 1% */}
      <div className="surface p-6 fade-up border-l-2 border-l-[#C6FF00]">
        <div className="flex items-center gap-2 text-[#C6FF00] mb-1">
          <Zap className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Daily 1% Challenge</span>
        </div>
        <p className="text-lg text-white font-medium">{d.daily_1pct}</p>
      </div>

      {/* Quick links */}
      <div className="fade-up">
        <h3 className="heading text-xl text-white mb-4">Your Tools</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {QUICK.map((q) => (
            <Link key={q.to} to={q.to} data-testid={`quick-${q.to.slice(1)}`}
              className="surface surface-hover p-5 flex flex-col items-start gap-3 group">
              <div className="h-10 w-10 rounded-lg bg-[#1A1C23] group-hover:bg-[#C6FF00]/10 flex items-center justify-center transition-colors">
                <q.icon className="h-5 w-5 text-[#C6FF00]" />
              </div>
              <span className="text-sm font-semibold text-white">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-4 w-4" style={{ color: accent }} />
        <span className="text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
      </div>
      <div className="font-mono-nums text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
