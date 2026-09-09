import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Loading } from "@/components/common";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";

export default function PlayerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null); setError(null);
    api.get(`/players/${id}`).then(({ data }) => setData(data))
      .catch((e) => setError(e.response?.data?.detail || "Player not found"));
  }, [id]);

  if (error) return (
    <div className="py-6">
      <Link to="/players" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6"><ArrowLeft className="h-4 w-4" /> Player Lab</Link>
      <div className="surface p-10 text-center">
        <AlertCircle className="h-10 w-10 text-[#FF3B30] mx-auto mb-3" />
        <p className="text-white font-semibold">Couldn't scout that player</p>
        <p className="text-sm text-gray-500 mt-1">{error}. Try a different name.</p>
      </div>
    </div>
  );
  if (!data) return <div className="py-6"><Loading label="Scouting" /></div>;

  const p = data.player;
  return (
    <div>
      <Link to="/players" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-5 transition-colors"><ArrowLeft className="h-4 w-4" /> Player Lab</Link>

      <div className="fade-up">
        {data.source === "ai" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2F80FF]/15 border border-[#2F80FF]/40 text-[#2F80FF] px-3 py-1 text-xs mb-3"><Sparkles className="h-3.5 w-3.5" /> AI scouted</span>
        )}
        <p className="text-xs uppercase tracking-widest text-gray-500">{p.position} · {p.era}</p>
        <h1 className="heading text-4xl sm:text-5xl text-white leading-none mt-1">{p.name}</h1>
        <p className="mt-2 text-lg text-[#2F80FF] font-semibold">{p.archetype}</p>
        <p className="mt-3 text-sm text-gray-400 max-w-2xl">{p.study}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="surface p-6 fade-up">
          <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">Signature Traits</span>
          <div className="flex flex-wrap gap-2 mt-3">
            {p.traits?.map((t, i) => (
              <span key={i} className="rounded-full bg-[#1A1C23] border border-[#282C37] px-3 py-1.5 text-sm text-gray-200">{t}</span>
            ))}
          </div>
        </div>

        <div className="surface p-6 fade-up">
          <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">Steal From Their Game</span>
          <ol className="mt-3 space-y-2.5">
            {p.steal?.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-200">
                <span className="font-mono-nums text-[#C6FF00] font-bold">{i + 1}</span>{s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
