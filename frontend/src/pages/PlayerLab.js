import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import { Users, Search, ArrowRight } from "lucide-react";

export default function PlayerLab() {
  const [players, setPlayers] = useState(null);
  const [q, setQ] = useState("");
  const [lookup, setLookup] = useState("");
  const navigate = useNavigate();

  useEffect(() => { api.get("/players").then(({ data }) => setPlayers(data.players)); }, []);
  if (!players) return <Loading />;

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) || p.archetype.toLowerCase().includes(q.toLowerCase()));

  const doLookup = (e) => {
    e.preventDefault();
    const name = lookup.trim();
    if (!name) return;
    navigate(`/players/${name.toLowerCase().replace(/\s+/g, "-")}`);
  };

  return (
    <div>
      <PageHeader title="Player Lab" subtitle="Study elite historical & modern players. Look up anyone — the AI scouts them for you." icon={Users} />

      <form onSubmit={doLookup} className="surface p-5 mb-6 fade-up">
        <span className="text-xs uppercase tracking-widest text-[#C6FF00]">AI Player Lookup</span>
        <div className="flex gap-2 mt-2">
          <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Search any player e.g. Kyrie Irving" data-testid="player-lookup"
            className="flex-1 rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C6FF00] focus:outline-none transition-colors" />
          <button type="submit" data-testid="player-lookup-btn" className="btn-lime rounded-lg px-5 inline-flex items-center gap-1.5">Scout <ArrowRight className="h-4 w-4" /></button>
        </div>
      </form>

      <div className="relative mb-6 fade-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter the elite database…" data-testid="player-filter"
          className="w-full rounded-lg bg-[#121318] border border-[#282C37] pl-10 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C6FF00] focus:outline-none transition-colors" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <button key={p.id} onClick={() => navigate(`/players/${p.id}`)} data-testid={`player-${p.id}`}
            className="surface surface-hover p-5 text-left group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-500">{p.position} · {p.era}</span>
            </div>
            <h3 className="heading text-2xl text-white group-hover:text-[#C6FF00] transition-colors">{p.name}</h3>
            <p className="mt-1 text-sm text-[#2F80FF]">{p.archetype}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
