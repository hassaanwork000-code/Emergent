import { useEffect, useState } from "react";
import { api, BACKEND_URL } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import AnalysisCard from "@/components/AnalysisCard";
import { Clapperboard, ChevronDown, ChevronUp } from "lucide-react";

function scoreColor(s) {
  if (s >= 70) return "#00E676";
  if (s >= 50) return "#FFB300";
  return "#FF3B30";
}

export default function ClipHistory() {
  const [analyses, setAnalyses] = useState(null);
  const [open, setOpen] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => { api.get("/analyses", { params: { kind: "video" } }).then(({ data }) => setAnalyses(data.analyses)); }, []);
  if (!analyses) return <Loading />;

  return (
    <div>
      <PageHeader title="Clip History" subtitle="Every saved film breakdown. Rewatch the clip and expand the full analysis." icon={Clapperboard} />

      {analyses.length === 0 ? (
        <div className="surface p-10 text-center text-gray-500">No film sessions yet. Head to the Film Room to record your first breakdown.</div>
      ) : (
        <div className="space-y-4">
          {analyses.map((a) => (
            <div key={a.id} className="surface overflow-hidden fade-up" data-testid={`clip-${a.id}`}>
              <button onClick={() => setOpen(open === a.id ? null : a.id)} data-testid={`clip-toggle-${a.id}`}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-[#1A1C23] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: `${scoreColor(a.result?.score)}20`, border: `1px solid ${scoreColor(a.result?.score)}55` }}>
                    <span className="font-mono-nums text-xl font-bold" style={{ color: scoreColor(a.result?.score) }}>{a.result?.score ?? "—"}</span>
                  </div>
                  <div>
                    <h3 className="heading text-lg text-white capitalize">{a.mode} Breakdown</h3>
                    <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {open === a.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>

              {open === a.id && (
                <div className="p-5 border-t border-[#282C37] space-y-4">
                  {a.video_path && (
                    <video controls className="w-full rounded-lg bg-black max-h-96" data-testid={`clip-video-${a.id}`}
                      src={`${BACKEND_URL}/api/files/${a.video_path}?token=${token}`} />
                  )}
                  <AnalysisCard result={a.result} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
