import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, useTTS } from "@/lib/api";
import { Loading } from "@/components/common";
import { ArrowLeft, Volume2, VolumeX, Loader2 } from "lucide-react";

const diffColor = { Beginner: "#00E676", Intermediate: "#FFB300", Advanced: "#FF3B30" };

export default function SkillDetail() {
  const { slug } = useParams();
  const [s, setS] = useState(null);
  const { speak, playing, loading } = useTTS();

  useEffect(() => { api.get(`/skills/${slug}`).then(({ data }) => setS(data.skill)); }, [slug]);
  if (!s) return <div className="py-6"><Loading /></div>;

  const walkthrough =
    `${s.name}. When to use it: ${s.when}. Why it works: ${s.why}. ` +
    `How to do it. ${s.how.map((h, i) => `Step ${i + 1}. ${h}`).join(" ")} ` +
    `Coaching cues: ${s.cues.join(", ")}. Common mistakes: ${s.mistakes.join(". ")}. ` +
    `Counter: ${s.counter}. Game application: ${s.game}.`;

  return (
    <div>
      <Link to="/skills" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-5 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Skill Library
      </Link>

      <div className="flex flex-wrap items-center gap-3 mb-2 fade-up">
        <span className="text-xs uppercase tracking-widest text-gray-500">{s.category}</span>
        <span className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wide" style={{ color: diffColor[s.difficulty], background: `${diffColor[s.difficulty]}18` }}>{s.difficulty}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 fade-up">
        <h1 className="heading text-4xl sm:text-5xl text-white leading-none">{s.name}</h1>
        <button data-testid="skill-walkthrough" onClick={() => speak(walkthrough)}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm border transition-colors shrink-0 ${
            playing ? "border-[#2F80FF] text-[#2F80FF] glow-blue" : "btn-lime"}`}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {playing ? "Stop Walkthrough" : "AI Coach Walkthrough"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="fade-up">
          <div className="surface overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe title={s.name} className="w-full h-full" data-testid="skill-video"
                src={`https://www.youtube.com/embed/${s.video_id}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </div>
        </div>

        <div className="space-y-4 fade-up">
          <Block title="When" body={s.when} />
          <Block title="Why" body={s.why} />
          <div className="surface p-5">
            <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">How — Step by Step</span>
            <ol className="mt-2 space-y-2">{s.how.map((h, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-200">
                <span className="font-mono-nums text-[#C6FF00] font-bold">{i + 1}</span>{h}
              </li>))}</ol>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="surface p-5">
          <span className="text-[10px] uppercase tracking-widest text-[#2F80FF]">Cues</span>
          <ul className="mt-2 space-y-1.5">{s.cues.map((c, i) => <li key={i} className="text-sm text-gray-200">→ {c}</li>)}</ul>
        </div>
        <div className="surface p-5">
          <span className="text-[10px] uppercase tracking-widest text-[#FF3B30]">Common Mistakes</span>
          <ul className="mt-2 space-y-1.5">{s.mistakes.map((m, i) => <li key={i} className="text-sm text-gray-200">✕ {m}</li>)}</ul>
        </div>
        <div className="surface p-5">
          <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">Counter</span>
          <p className="mt-2 text-sm text-gray-200">{s.counter}</p>
        </div>
      </div>

      <div className="surface p-5 mt-4 border-l-2 border-l-[#C6FF00]">
        <span className="text-[10px] uppercase tracking-widest text-gray-500">Game Application</span>
        <p className="mt-1 text-sm text-gray-200">{s.game}</p>
      </div>
    </div>
  );
}

function Block({ title, body }) {
  return (
    <div className="surface p-5">
      <span className="text-[10px] uppercase tracking-widest text-gray-500">{title}</span>
      <p className="mt-1 text-sm text-gray-200">{body}</p>
    </div>
  );
}
