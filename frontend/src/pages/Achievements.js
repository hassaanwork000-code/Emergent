import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import ShareCard from "@/components/ShareCard";
import { Trophy, Flame, Lock } from "lucide-react";

export default function Achievements() {
  const [a, setA] = useState(null);
  useEffect(() => { api.get("/achievements").then(({ data }) => setA(data)); }, []);
  if (!a) return <Loading />;

  const next = a.next_streak_milestone;
  const progress = next ? Math.min(100, Math.round((a.streak / next) * 100)) : 100;

  return (
    <div>
      <PageHeader title="Achievements" subtitle="Track your streak, chase milestones and unlock badges." icon={Trophy}
        action={<ShareCard title="My Streak" accent="#FFB300" lines={[{ label: "Day Streak", value: `${a.streak}` }, { label: "Badges", value: `${a.earned_count}/${a.total_count}` }]} />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="surface p-6 fade-up flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-[#FFB300]/15 border border-[#FFB300]/40 flex items-center justify-center">
            <Flame className="h-8 w-8 text-[#FFB300]" />
          </div>
          <div>
            <div className="font-mono-nums text-4xl font-bold text-white" data-testid="streak-value">{a.streak}</div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Day Streak</div>
          </div>
        </div>

        <div className="surface p-6 fade-up lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-widest text-gray-500">Next Milestone</span>
            {next ? <span className="font-mono-nums text-sm text-[#C6FF00]">{a.streak} / {next} days</span> : <span className="text-sm text-[#00E676]">All milestones hit!</span>}
          </div>
          <div className="h-3 rounded-full bg-[#0A0A0C] overflow-hidden border border-[#282C37]">
            <div className="h-full bg-[#C6FF00] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5">
            <Mini label="Sessions" value={a.sessions} />
            <Mini label="Shots" value={a.shots} />
            <Mini label="Films" value={a.films} />
            <Mini label="Coach Msgs" value={a.coach_msgs} />
          </div>
        </div>
      </div>

      <h3 className="heading text-xl text-white mb-4 fade-up">Badges — {a.earned_count}/{a.total_count}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {a.badges.map((b) => (
          <div key={b.key} data-testid={`badge-${b.key}`}
            className={`surface p-5 flex flex-col items-center text-center transition-all ${b.earned ? "border-[#C6FF00]/40" : "opacity-60"}`}>
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl mb-3 ${b.earned ? "bg-[#C6FF00]/10" : "bg-[#1A1C23]"}`}>
              {b.earned ? b.emoji : <Lock className="h-6 w-6 text-gray-600" />}
            </div>
            <span className="text-sm font-semibold text-white">{b.label}</span>
            <span className={`mt-1 text-[10px] uppercase tracking-widest ${b.earned ? "text-[#C6FF00]" : "text-gray-600"}`}>
              {b.earned ? "Unlocked" : "Locked"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="text-center">
      <div className="font-mono-nums text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
    </div>
  );
}
