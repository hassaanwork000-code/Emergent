import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { Dumbbell, Loader2, Check, Sparkles, Flame } from "lucide-react";
import { toast } from "sonner";

export default function TrainingPlan() {
  const [minutes, setMinutes] = useState(30);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [completing, setCompleting] = useState(false);

  const generate = async () => {
    setLoading(true);
    setDone(false);
    try {
      const { data } = await api.post("/training/plan", { minutes, focus: "auto" });
      setPlan(data);
    } catch {
      toast.error("Could not generate plan. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    setCompleting(true);
    try {
      await api.post("/workouts/log", { type: "training" });
      setDone(true);
      toast.success("Workout logged. Streak updated.");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Training Plan" subtitle="Adaptive workouts built around your weaknesses and archetype." icon={Dumbbell} />

      <div className="surface p-6 mb-6 fade-up">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <span className="text-xs uppercase tracking-widest text-gray-500">Session Length</span>
            <div className="flex gap-2 mt-2">
              {[20, 30, 45, 60].map((m) => (
                <button key={m} data-testid={`plan-min-${m}`} onClick={() => setMinutes(m)}
                  className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                    minutes === m ? "bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00] font-semibold" : "border-[#282C37] text-gray-300 hover:border-gray-500"}`}>
                  {m}m
                </button>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={loading} data-testid="plan-generate"
            className="btn-lime rounded-lg px-6 py-3 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Building…" : "Generate Workout"}
          </button>
        </div>
      </div>

      {loading && <div className="surface p-8 text-center text-gray-400">Your coach is designing today's session…</div>}

      {plan && !loading && (
        <div className="fade-up space-y-5">
          <div className="surface p-6">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="rounded-full bg-[#C6FF00]/10 border border-[#C6FF00]/30 text-[#C6FF00] px-3 py-1 text-xs uppercase tracking-widest">{plan.plan.difficulty}</span>
              <span className="rounded-full bg-[#2F80FF]/10 border border-[#2F80FF]/30 text-[#2F80FF] px-3 py-1 text-xs uppercase tracking-widest">Focus: {plan.focus}</span>
              <span className="text-xs text-gray-500">{plan.minutes} min</span>
            </div>
            <h2 className="heading text-2xl sm:text-3xl text-white" data-testid="plan-title">{plan.plan.title}</h2>
            <p className="mt-2 text-sm text-gray-400">{plan.plan.objective}</p>
          </div>

          {plan.plan.warmup?.length > 0 && (
            <Section title="Warm-Up"><ul className="space-y-1.5">{plan.plan.warmup.map((w, i) => <li key={i} className="text-sm text-gray-300">• {w}</li>)}</ul></Section>
          )}

          <div className="space-y-3">
            {plan.plan.drills?.map((dr, i) => (
              <div key={i} className="surface p-5" data-testid={`plan-drill-${i}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="heading text-lg text-white">{i + 1}. {dr.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                      {dr.duration_min && <span className="font-mono-nums">{dr.duration_min} min</span>}
                      {dr.sets && <span className="font-mono-nums">· {dr.sets} sets</span>}
                      {dr.reps && <span className="font-mono-nums">· {dr.reps} reps</span>}
                    </div>
                  </div>
                  <Flame className="h-5 w-5 text-[#FFB300] shrink-0" />
                </div>
                {dr.cues?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">Cues</span>
                    <ul className="mt-1 space-y-1">{dr.cues.map((c, j) => <li key={j} className="text-sm text-gray-300">→ {c}</li>)}</ul>
                  </div>
                )}
                {dr.success && <p className="mt-3 text-sm text-gray-400"><span className="text-white font-semibold">Success: </span>{dr.success}</p>}
              </div>
            ))}
          </div>

          {plan.plan.cooldown?.length > 0 && (
            <Section title="Cooldown"><ul className="space-y-1.5">{plan.plan.cooldown.map((c, i) => <li key={i} className="text-sm text-gray-300">• {c}</li>)}</ul></Section>
          )}

          {plan.plan.coaching_note && (
            <div className="surface p-5 border-l-2 border-l-[#2F80FF]">
              <span className="text-[10px] uppercase tracking-widest text-[#2F80FF]">Coach's Note</span>
              <p className="mt-1 text-sm text-gray-300">{plan.plan.coaching_note}</p>
            </div>
          )}

          <button onClick={complete} disabled={done || completing} data-testid="plan-complete"
            className={`w-full rounded-lg py-4 flex items-center justify-center gap-2 font-bold uppercase tracking-wide transition-colors ${
              done ? "bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40" : "btn-lime"}`}>
            {completing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {done ? "Workout Complete" : "Mark Workout Complete"}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="surface p-5">
      <span className="text-[10px] uppercase tracking-widest text-gray-500">{title}</span>
      <div className="mt-2">{children}</div>
    </div>
  );
}
