import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import ShotChart, { SHOT_ZONES } from "@/components/ShotChart";
import { GitCompare, ArrowRight } from "lucide-react";

function scoreColor(s) { return s >= 70 ? "#00E676" : s >= 50 ? "#FFB300" : "#FF3B30"; }

export default function Compare() {
  const [mode, setMode] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/sessions"), api.get("/analyses")]).then(([s, an]) => {
      setSessions(s.data.sessions);
      setAnalyses(an.data.analyses);
      setLoading(false);
    });
  }, []);

  const items = mode === "sessions" ? sessions : analyses;
  const label = (it) => mode === "sessions"
    ? `${new Date(it.created_at).toLocaleDateString()} · ${it.makes}/${it.attempts} (${it.pct}%)`
    : `${it.mode} ${it.kind} · ${it.result?.score ?? "—"} · ${new Date(it.created_at).toLocaleDateString()}`;

  const switchMode = (m) => { setMode(m); setA(null); setB(null); };

  return (
    <div>
      <PageHeader title="Session Compare" icon={GitCompare}
        subtitle="Put two sessions or two breakdowns side by side to see exactly what changed." />

      <div className="flex gap-2 mb-6 fade-up">
        {[["sessions", "Shooting Sessions"], ["analyses", "Film / Form"]].map(([m, l]) => (
          <button key={m} data-testid={`compare-mode-${m}`} onClick={() => switchMode(m)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
              mode === m ? "bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00] font-semibold" : "border-[#282C37] text-gray-300 hover:border-gray-500"}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : items.length < 2 ? (
        <div className="surface p-10 text-center text-gray-500">
          You need at least two {mode === "sessions" ? "saved shooting sessions" : "saved analyses"} to compare. Log a couple first.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 fade-up">
            <Picker label="A" items={items} value={a} onChange={setA} labelFn={label} testid="compare-select-a" />
            <Picker label="B" items={items} value={b} onChange={setB} labelFn={label} testid="compare-select-b" />
          </div>

          {a && b ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-up" data-testid="compare-result">
              {mode === "sessions"
                ? [a, b].map((id, i) => <SessionCol key={i} id={id} sessions={sessions} />)
                : [a, b].map((id, i) => <AnalysisCol key={i} id={id} analyses={analyses} />)}
            </div>
          ) : (
            <div className="surface p-10 text-center text-gray-500">Pick two above to compare.</div>
          )}
        </>
      )}
    </div>
  );
}

function Picker({ label, items, value, onChange, labelFn, testid }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-gray-500">Session {label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testid}
        className="mt-1.5 w-full rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3.5 py-2.5 text-white focus:border-[#C6FF00] focus:outline-none transition-colors">
        <option value="">Select…</option>
        {items.map((it) => <option key={it.id} value={it.id}>{labelFn(it)}</option>)}
      </select>
    </label>
  );
}

function SessionCol({ id, sessions }) {
  const s = sessions.find((x) => x.id === id);
  if (!s) return null;
  return (
    <div className="surface p-5">
      <p className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</p>
      <div className="flex items-baseline gap-3 mt-1">
        <span className="font-mono-nums text-3xl font-bold text-[#C6FF00]">{s.pct}%</span>
        <span className="text-sm text-gray-400 font-mono-nums">{s.makes}/{s.attempts}</span>
      </div>
      <div className="mt-3"><ShotChart byZone={s.by_zone} /></div>
      {s.weak_zone && <p className="mt-2 text-xs text-[#FF3B30]">Coldest: {SHOT_ZONES.find((z) => z.id === s.weak_zone)?.label || s.weak_zone}</p>}
    </div>
  );
}

function AnalysisCol({ id, analyses }) {
  const a = analyses.find((x) => x.id === id);
  if (!a) return null;
  const r = a.result || {};
  const keys = [["balance", "Balance"], ["lower_body", "Lower Body"], ["elbow_alignment", "Elbow"], ["release", "Release"], ["follow_through", "Follow"], ["landing", "Landing"]];
  return (
    <div className="surface p-5">
      <p className="text-xs text-gray-500 capitalize">{a.mode} {a.kind} · {new Date(a.created_at).toLocaleDateString()}</p>
      <div className="font-mono-nums text-4xl font-bold mt-1" style={{ color: scoreColor(r.score) }}>{r.score ?? "—"}</div>
      <div className="mt-4 space-y-2">
        {keys.filter(([k]) => r.breakdown?.[k] != null).map(([k, lbl]) => (
          <div key={k}>
            <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{lbl}</span><span className="font-mono-nums text-white">{r.breakdown[k]}</span></div>
            <div className="h-1.5 rounded-full bg-[#0A0A0C]"><div className="h-full rounded-full" style={{ width: `${r.breakdown[k]}%`, background: scoreColor(r.breakdown[k]) }} /></div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400"><span className="text-white">Issue: </span>{r.biggest_issue}</p>
    </div>
  );
}
