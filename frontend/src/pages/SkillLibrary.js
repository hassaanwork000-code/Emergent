import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import { BookOpen, Search, PlayCircle } from "lucide-react";

const CATEGORIES = ["All", "Ball Handling", "Shooting", "Finishing", "Playmaking", "Defense", "Post"];

const diffColor = { Beginner: "#00E676", Intermediate: "#FFB300", Advanced: "#FF3B30" };

export default function SkillLibrary() {
  const [skills, setSkills] = useState(null);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/skills").then(({ data }) => setSkills(data.skills)); }, []);
  if (!skills) return <Loading />;

  const filtered = skills.filter((s) =>
    (cat === "All" || s.category === cat) &&
    (s.name.toLowerCase().includes(q.toLowerCase()) || s.category.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageHeader title="Skill Library" subtitle="24 skills across 6 categories. Full tutorials, video and an AI walkthrough for each." icon={BookOpen} />

      <div className="flex flex-col sm:flex-row gap-4 mb-6 fade-up">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search skills…" data-testid="skill-search"
            className="w-full rounded-lg bg-[#121318] border border-[#282C37] pl-10 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C6FF00] focus:outline-none transition-colors" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button key={c} data-testid={`skill-cat-${c}`} onClick={() => setCat(c)}
            className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
              cat === c ? "bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00] font-semibold" : "border-[#282C37] text-gray-300 hover:border-gray-500"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <Link key={s.slug} to={`/skills/${s.slug}`} data-testid={`skill-${s.slug}`}
            className="surface surface-hover p-5 group">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-widest text-gray-500">{s.category}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ color: diffColor[s.difficulty], background: `${diffColor[s.difficulty]}18` }}>{s.difficulty}</span>
            </div>
            <h3 className="heading text-xl text-white group-hover:text-[#C6FF00] transition-colors">{s.name}</h3>
            <p className="mt-2 text-sm text-gray-400 line-clamp-2">{s.when}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#C6FF00]"><PlayCircle className="h-4 w-4" /> Open tutorial</div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <div className="surface p-10 text-center text-gray-500">No skills match your search.</div>}
    </div>
  );
}
