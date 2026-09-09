import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import { FlaskConical, Loader2, Target, Users, BookOpen, Brain, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function ArchetypeLab() {
  const [cur, setCur] = useState(null);
  const [target, setTarget] = useState("");
  const [gap, setGap] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [buildText, setBuildText] = useState("");
  const [build, setBuild] = useState(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [expText, setExpText] = useState("");
  const [exp, setExp] = useState(null);
  const [expLoading, setExpLoading] = useState(false);

  useEffect(() => { api.get("/archetype/current").then(({ data }) => { setCur(data); setTarget(data.target || data.all_archetypes[0]); }); }, []);
  if (!cur) return <Loading />;

  const analyze = async () => {
    setGapLoading(true);
    try { const { data } = await api.post("/archetype/target", { target }); setGap(data); }
    catch { toast.error("Could not analyze target."); } finally { setGapLoading(false); }
  };
  const doBuild = async () => {
    if (!buildText.trim()) return; setBuildLoading(true);
    try { const { data } = await api.post("/archetype/build", { description: buildText }); setBuild(data); }
    catch { toast.error("Try rephrasing your build."); } finally { setBuildLoading(false); }
  };
  const doExp = async () => {
    if (!expText.trim()) return; setExpLoading(true);
    try { const { data } = await api.post("/archetype/experiment", { description: expText }); setExp(data); }
    catch { toast.error("Try rephrasing."); } finally { setExpLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Archetype Lab" icon={FlaskConical}
        subtitle="Connect your DNA to a target archetype: see the gap, the training path, and who to study." />

      {/* current */}
      <div className="surface p-6 mb-6 fade-up">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#7C3AED]">Current Archetype</span>
            <h2 className="heading text-3xl text-white">{cur.primary || "Undefined"}</h2>
            {cur.secondary && <p className="text-sm text-gray-500">Secondary: {cur.secondary}</p>}
          </div>
          {cur.confidence != null && (
            <div className="text-right">
              <span className="text-xs uppercase tracking-widest text-gray-500">Fit Confidence{cur.estimate ? " (est.)" : ""}</span>
              <div className="font-mono-nums text-3xl text-[#C6FF00]">{cur.confidence}%</div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div><span className="text-[10px] uppercase tracking-widest text-[#00E676]">Supporting</span>
            <p className="text-sm text-gray-300 mt-1">{cur.supporting.length ? cur.supporting.join(" · ") : "Not enough data yet"}</p></div>
          <div><span className="text-[10px] uppercase tracking-widest text-[#FF3B30]">Biggest Gaps</span>
            <p className="text-sm text-gray-300 mt-1">{cur.gaps.length ? cur.gaps.join(" · ") : "Not enough data yet"}</p></div>
        </div>
      </div>

      {/* target selector */}
      <div className="surface p-6 mb-6 fade-up">
        <span className="text-xs uppercase tracking-widest text-[#2F80FF]">Target Archetype</span>
        <div className="flex flex-wrap gap-2 mt-2">
          <select value={target} onChange={(e) => setTarget(e.target.value)} data-testid="archetype-target-select"
            className="flex-1 min-w-[220px] rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3 py-2.5 text-white focus:border-[#2F80FF] focus:outline-none">
            {cur.all_archetypes.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={analyze} disabled={gapLoading} data-testid="archetype-analyze" className="btn-lime rounded-lg px-5 py-2.5 flex items-center gap-2">
            {gapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />} Analyze Gap
          </button>
        </div>
      </div>

      {gap && (
        <div className="space-y-5 fade-up mb-8" data-testid="archetype-gap">
          <div className="surface p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="heading text-2xl text-white">{gap.target}</h3>
              <span className="font-mono-nums text-2xl text-[#C6FF00]">{gap.fit}%<span className="text-xs text-gray-500 ml-1">fit{gap.estimate ? " (est.)" : ""}</span></span>
            </div>
            <div className="h-3 rounded-full bg-[#0A0A0C] border border-[#282C37] overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-[#7C3AED] to-[#C6FF00] rounded-full transition-all duration-700" style={{ width: `${gap.fit}%` }} />
            </div>
            <p className="text-sm text-gray-400">{gap.summary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card title="Strengths You Have" accent="#00E676" items={gap.strengths} empty="Log more data to confirm strengths" />
            <Card title="Weak Attributes" accent="#FF3B30" items={gap.gaps} empty="No clear gaps yet" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="surface p-5">
              <span className="text-[10px] uppercase tracking-widest text-[#C6FF00] flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Skills To Sharpen</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {gap.missing_skills.map((s) => <Link key={s.slug} to={`/skills/${s.slug}`} data-testid={`gap-skill-${s.slug}`} className="rounded-full bg-[#1A1C23] border border-[#282C37] px-3 py-1 text-xs text-gray-200 hover:border-[#C6FF00] transition-colors">{s.name}</Link>)}
              </div>
              <span className="text-[10px] uppercase tracking-widest text-gray-500 mt-4 block">Recommended Drills</span>
              <ul className="mt-1 space-y-1">{gap.recommended_drills.map((d, i) => <li key={i} className="text-xs text-gray-400">→ {d}</li>)}</ul>
            </div>
            <div className="surface p-5">
              <span className="text-[10px] uppercase tracking-widest text-[#7C3AED] flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> IQ Scenarios</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {gap.iq_focus.map((f) => <Link key={f.key} to={`/iq?category=${f.key}`} data-testid={`gap-iq-${f.key}`} className="rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/40 px-3 py-1 text-xs text-[#b794f6] hover:border-[#7C3AED] transition-colors">{f.label}</Link>)}
              </div>
            </div>
            <div className="surface p-5">
              <span className="text-[10px] uppercase tracking-widest text-[#2F80FF] flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Players To Study</span>
              <div className="mt-2 flex flex-col gap-1.5">
                {gap.players.map((p) => <Link key={p.id} to={`/players/${p.id}`} data-testid={`gap-player-${p.id}`} className="text-sm text-gray-200 hover:text-[#2F80FF] transition-colors flex items-center gap-1.5"><ArrowRight className="h-3 w-3" />{p.name} <span className="text-xs text-gray-500">· {p.archetype}</span></Link>)}
              </div>
            </div>
          </div>

          <div className="surface p-5 border-l-2 border-l-[#C6FF00]">
            <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">Development Path</span>
            <ol className="mt-2 space-y-1.5">{gap.development_path.map((s, i) => <li key={i} className="text-sm text-gray-200 flex gap-2"><span className="font-mono-nums text-[#C6FF00]">{i + 1}</span>{s}</li>)}</ol>
          </div>
        </div>
      )}

      {/* Build & Experiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface p-6 fade-up">
          <span className="text-xs uppercase tracking-widest text-[#7C3AED]">Build Your Version</span>
          <p className="text-xs text-gray-500 mt-1">e.g. "Curry shooting + Kobe footwork + Wade rim pressure". We extract transferable traits — not a promise you'll become them.</p>
          <textarea value={buildText} onChange={(e) => setBuildText(e.target.value)} rows={2} data-testid="build-input"
            className="mt-3 w-full rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3 py-2.5 text-sm text-white focus:border-[#7C3AED] focus:outline-none" placeholder="Describe your dream build…" />
          <button onClick={doBuild} disabled={buildLoading} data-testid="build-btn" className="mt-2 btn-lime rounded-lg px-5 py-2 flex items-center gap-2">
            {buildLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Generate Build
          </button>
          {build && (
            <div className="mt-4 space-y-2 text-sm" data-testid="build-result">
              <L label="Desired" v={build.desired_traits} /><L label="You have" v={build.current_traits} accent="#00E676" />
              <L label="Missing" v={build.missing_traits} accent="#FF3B30" /><L label="Priorities" v={build.training_priorities} accent="#C6FF00" />
              <L label="Skills" v={build.skills_to_learn} /><L label="Study" v={build.players_to_study} accent="#2F80FF" />
              <L label="Watch out" v={build.potential_weaknesses} accent="#FFB300" />
            </div>
          )}
        </div>

        <div className="surface p-6 fade-up">
          <span className="text-xs uppercase tracking-widest text-[#2F80FF]">Archetype Experiment</span>
          <p className="text-xs text-gray-500 mt-1">A planning simulation, not a prediction. Ask a "what if".</p>
          <input value={expText} onChange={(e) => setExpText(e.target.value)} data-testid="exp-input"
            className="mt-3 w-full rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3 py-2.5 text-sm text-white focus:border-[#2F80FF] focus:outline-none" placeholder="What if I became more of a downhill scorer?" />
          <button onClick={doExp} disabled={expLoading} data-testid="exp-btn" className="mt-2 btn-lime rounded-lg px-5 py-2 flex items-center gap-2">
            {expLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Run Experiment
          </button>
          {exp && (
            <div className="mt-4 space-y-2 text-sm" data-testid="exp-result">
              <p className="text-gray-300"><span className="text-[#2F80FF]">Now: </span>{exp.current_profile}</p>
              <L label="Required changes" v={exp.required_changes} /><L label="Skills needed" v={exp.skills_needed} />
              <L label="Training" v={exp.training_required} /><L label="Benefits" v={exp.potential_benefits} accent="#00E676" />
              <L label="Trade-offs" v={exp.potential_tradeoffs} accent="#FFB300" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, accent, items, empty }) {
  return (
    <div className="surface p-5">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>{title}</span>
      <p className="mt-1 text-sm text-gray-200">{items && items.length ? items.join(" · ") : empty}</p>
    </div>
  );
}
function L({ label, v, accent = "#9CA3AF" }) {
  if (!v || !v.length) return null;
  return <p className="text-xs text-gray-400"><span className="uppercase tracking-widest" style={{ color: accent }}>{label}: </span>{Array.isArray(v) ? v.join(", ") : v}</p>;
}
