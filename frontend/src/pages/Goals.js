import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import { Target, CalendarClock, Check } from "lucide-react";
import { toast } from "sonner";

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Goals() {
  const [goals, setGoals] = useState(null);

  const load = () => api.get("/goals").then(({ data }) => setGoals(data.goals));
  useEffect(() => { load(); }, []);
  if (!goals) return <Loading />;

  const save = async (g, patch) => {
    const next = { ...g, ...patch };
    setGoals((gs) => gs.map((x) => (x.text === g.text ? next : x)));
    try {
      await api.post("/goals/update", { text: g.text, target_date: next.target_date, progress: next.progress });
    } catch { toast.error("Could not save goal."); }
  };

  return (
    <div>
      <PageHeader title="Goals" icon={Target}
        subtitle="Set a deadline for each goal and track your progress with a live countdown." />

      {goals.length === 0 ? (
        <div className="surface p-10 text-center text-gray-500">No goals yet. Add them in your profile onboarding.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {goals.map((g) => {
            const dl = daysLeft(g.target_date);
            const done = g.progress >= 100;
            return (
              <div key={g.text} className="surface p-6 fade-up" data-testid={`goal-${g.text}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="heading text-xl text-white">{g.text}</h3>
                  {done && <span className="rounded-full bg-[#00E676]/15 text-[#00E676] px-2.5 py-0.5 text-[10px] uppercase tracking-widest flex items-center gap-1"><Check className="h-3 w-3" /> Done</span>}
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 uppercase tracking-widest">Progress</span>
                    <span className="font-mono-nums text-[#C6FF00]">{g.progress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#0A0A0C] border border-[#282C37] overflow-hidden">
                    <div className="h-full bg-[#C6FF00] rounded-full transition-all duration-500" style={{ width: `${g.progress}%` }} />
                  </div>
                  <input type="range" min="0" max="100" step="5" value={g.progress} data-testid={`goal-progress-${g.text}`}
                    onChange={(e) => save(g, { progress: parseInt(e.target.value) })}
                    className="w-full mt-3 accent-[#C6FF00]" />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <CalendarClock className="h-4 w-4 text-[#2F80FF]" />
                    <input type="date" value={g.target_date || ""} data-testid={`goal-date-${g.text}`}
                      onChange={(e) => save(g, { target_date: e.target.value })}
                      className="rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3 py-1.5 text-white focus:border-[#C6FF00] focus:outline-none transition-colors" />
                  </label>
                  {dl != null && (
                    <span className={`font-mono-nums text-2xl font-bold ${dl < 0 ? "text-[#FF3B30]" : dl <= 7 ? "text-[#FFB300]" : "text-white"}`}>
                      {dl < 0 ? `${Math.abs(dl)}d over` : `${dl}d left`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
