import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import { Brain, Check, X, ArrowRight, Loader2, Sparkles, Timer, AlertTriangle } from "lucide-react";

export default function IqLab() {
  const [params] = useSearchParams();
  const [meta, setMeta] = useState(null);
  const [category, setCategory] = useState(params.get("category") || "all");
  const [difficulty, setDifficulty] = useState("all");
  const [mode, setMode] = useState("practice");
  const [scenario, setScenario] = useState(null);
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insLoading, setInsLoading] = useState(false);
  const [clock, setClock] = useState(null);
  const startRef = useRef(0);
  const timerRef = useRef(null);

  const loadProfile = () => api.get("/iq/profile").then(({ data }) => setProfile(data));
  useEffect(() => { api.get("/iq/scenarios").then(({ data }) => setMeta(data)); loadProfile(); }, []);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const next = async () => {
    setLoading(true); setResult(null); setPicked(null); clearInterval(timerRef.current);
    try {
      const { data } = await api.get("/iq/next", { params: { category, difficulty, mode } });
      setScenario(data.scenario);
      startRef.current = Date.now();
      if (mode === "timed") {
        setClock(15);
        timerRef.current = setInterval(() => setClock((c) => {
          if (c <= 1) { clearInterval(timerRef.current); submit("TIMEUP", data.scenario); return 0; }
          return c - 1;
        }), 1000);
      } else setClock(null);
    } finally { setLoading(false); }
  };

  const submit = async (choice, sc) => {
    const scen = sc || scenario;
    if (!scen || result) return;
    clearInterval(timerRef.current);
    setPicked(choice);
    const time_ms = Date.now() - startRef.current;
    const { data } = await api.post("/iq/answer", { scenario_id: scen.id, choice, time_ms, mode });
    setResult(data);
    loadProfile();
  };

  const getInsights = async () => { setInsLoading(true); try { const { data } = await api.get("/iq/insights"); setInsights(data); } finally { setInsLoading(false); } };

  if (!meta) return <Loading />;

  return (
    <div>
      <PageHeader title="IQ Lab" icon={Brain}
        subtitle="Read realistic basketball situations and make the best decision. Every answer explains the read." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="surface p-4 flex flex-wrap items-center gap-3 fade-up">
            <select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="iq-category"
              className="rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3 py-2 text-sm text-white focus:border-[#7C3AED] focus:outline-none">
              <option value="all">All categories</option>
              {meta.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} data-testid="iq-difficulty"
              className="rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3 py-2 text-sm text-white focus:border-[#7C3AED] focus:outline-none">
              <option value="all">All levels</option>
              {meta.difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="flex rounded-lg border border-[#282C37] overflow-hidden">
              {["practice", "timed"].map((m) => (
                <button key={m} data-testid={`iq-mode-${m}`} onClick={() => setMode(m)}
                  className={`px-3 py-2 text-sm ${mode === m ? "bg-[#7C3AED] text-white" : "text-gray-400"}`}>{m === "timed" ? "Game-like" : "Practice"}</button>
              ))}
            </div>
            <button onClick={next} disabled={loading} data-testid="iq-start"
              className="ml-auto btn-lime rounded-lg px-5 py-2 flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {scenario ? "New Scenario" : "Start"}
            </button>
          </div>

          {scenario && (
            <div className="surface p-6 fade-up" data-testid="iq-scenario">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest text-[#7C3AED]">{scenario.category_label} · {scenario.difficulty} · {scenario.context}</span>
                {mode === "timed" && clock !== null && !result && (
                  <span className={`font-mono-nums font-bold flex items-center gap-1 ${clock <= 5 ? "text-[#FF3B30]" : "text-white"}`}><Timer className="h-4 w-4" />{clock}s</span>
                )}
              </div>
              <p className="text-white leading-relaxed">{scenario.situation}</p>
              <p className="text-xs text-gray-500 mt-2">You: {scenario.position}</p>

              <div className="mt-4 space-y-2">
                {scenario.options.map((o) => {
                  const isCorrect = result && o.key === result.correct_key;
                  const isPicked = picked === o.key;
                  const wrongPick = result && isPicked && !isCorrect;
                  return (
                    <button key={o.key} disabled={!!result} onClick={() => submit(o.key)} data-testid={`iq-option-${o.key}`}
                      className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                        isCorrect ? "border-[#00E676] bg-[#00E676]/10 text-white" :
                        wrongPick ? "border-[#FF3B30] bg-[#FF3B30]/10 text-white" :
                        "border-[#282C37] text-gray-200 hover:border-[#7C3AED]"}`}>
                      <span className="font-mono-nums font-bold text-[#7C3AED]">{o.key}</span>{o.text}
                      {isCorrect && <Check className="h-4 w-4 text-[#00E676] ml-auto" />}
                      {wrongPick && <X className="h-4 w-4 text-[#FF3B30] ml-auto" />}
                    </button>
                  );
                })}
              </div>

              {result && (
                <div className="mt-5 space-y-3 fade-up" data-testid="iq-result">
                  <div className={`rounded-lg px-4 py-3 font-semibold ${result.correct ? "bg-[#00E676]/15 text-[#00E676]" : result.acceptable ? "bg-[#FFB300]/15 text-[#FFB300]" : "bg-[#FF3B30]/15 text-[#FF3B30]"}`}>
                    {result.correct ? "Correct read" : result.acceptable ? "Acceptable — but not the best" : "Not the best read"} · Best: {result.best_decision}
                  </div>
                  <Info label="Why" body={result.why} />
                  <Info label="What the defense was giving you" body={result.defense_giving} />
                  <Info label="What you should have noticed" body={result.should_notice} />
                  {result.alternatives?.length > 0 && <Info label="Also acceptable" body={result.alternatives.join(" · ")} />}
                  <Info label="Game application" body={result.game_application} accent="#7C3AED" />
                  <button onClick={next} data-testid="iq-next" className="btn-lime rounded-lg px-5 py-2 inline-flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Next Scenario</button>
                </div>
              )}
            </div>
          )}

          {!scenario && !loading && (
            <div className="surface p-10 text-center text-gray-400">Pick a category and level, then Start. Your reads build your IQ profile.</div>
          )}
        </div>

        {/* IQ profile */}
        <div className="space-y-4">
          <div className="surface p-5 fade-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-widest text-[#7C3AED]">Your IQ Profile</span>
              <span className="font-mono-nums text-sm text-white">{profile?.overall != null ? `${profile.overall}%` : "—"}</span>
            </div>
            {profile?.total_answered ? <p className="text-xs text-gray-500 mb-3">{profile.total_answered} decisions · avg {profile.avg_decision_sec ?? "—"}s</p> : null}
            <div className="space-y-2.5">
              {profile?.categories.map((c) => (
                <div key={c.key} data-testid={`iq-cat-${c.key}`}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{c.label}</span>
                    <span className="font-mono-nums text-white">{c.score != null ? `${c.score}%` : "—"}</span></div>
                  <div className="h-1.5 rounded-full bg-[#0A0A0C]">
                    {c.score != null && <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${c.score}%` }} />}
                  </div>
                </div>
              ))}
            </div>
            {(!profile || profile.total_answered < 3) && <p className="text-xs text-gray-500 mt-3">Not enough data yet — complete more scenarios.</p>}
          </div>

          {profile?.repeated_mistakes?.length > 0 && (
            <div className="surface p-5 fade-up">
              <span className="text-xs uppercase tracking-widest text-[#FFB300] flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Repeated Mistakes</span>
              <ul className="mt-2 space-y-1.5">{profile.repeated_mistakes.map((m, i) => <li key={i} className="text-xs text-gray-400">{m}</li>)}</ul>
            </div>
          )}

          <div className="surface p-5 fade-up">
            <button onClick={getInsights} disabled={insLoading} data-testid="iq-insights-btn"
              className="w-full rounded-lg border border-[#7C3AED]/50 text-[#7C3AED] py-2.5 flex items-center justify-center gap-2 hover:bg-[#7C3AED]/10 transition-colors">
              {insLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Coach Insights
            </button>
            {insights && (insights.enough_data ? (
              <div className="mt-3 space-y-2 text-sm" data-testid="iq-insights">
                <p className="text-gray-200">{insights.summary}</p>
                <p className="text-xs text-gray-400"><span className="text-[#C6FF00]">Skill:</span> {insights.recommended_skill} · <span className="text-[#C6FF00]">Drill:</span> {insights.recommended_drill}</p>
                <p className="text-xs text-gray-400"><span className="text-[#2F80FF]">Study:</span> {insights.recommended_player} · <span className="text-[#2F80FF]">Priority:</span> {insights.training_priority}</p>
              </div>
            ) : <p className="mt-3 text-xs text-gray-500">{insights.message}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, body, accent = "#9CA3AF" }) {
  return (
    <div className="surface p-4">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>{label}</span>
      <p className="mt-1 text-sm text-gray-200">{body}</p>
    </div>
  );
}
