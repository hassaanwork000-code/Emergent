import { useTTS } from "@/lib/api";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

const BAR_KEYS = [
  ["balance", "Balance"], ["lower_body", "Lower Body"], ["elbow_alignment", "Elbow"],
  ["release", "Release"], ["follow_through", "Follow-Through"], ["landing", "Landing"],
];

function scoreColor(s) {
  if (s >= 70) return "#00E676";
  if (s >= 50) return "#FFB300";
  return "#FF3B30";
}

export default function AnalysisCard({ result }) {
  const { speak, playing, loading } = useTTS();
  if (!result) return null;

  const narration =
    `Form analysis. Confidence ${result.confidence}. Overall score ${result.score} out of 100. ` +
    `Biggest issue: ${result.biggest_issue}. ${result.why}. The fix: ${result.fix}. Drill: ${result.drill}.`;

  return (
    <div className="space-y-4">
      <div className="surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-gray-500">Overall Score</span>
            <div className="font-mono-nums text-5xl font-bold" style={{ color: scoreColor(result.score) }} data-testid="analysis-score">{result.score}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-widest border ${
              result.confidence === "HIGH" ? "text-[#00E676] border-[#00E676]/40 bg-[#00E676]/10" :
              result.confidence === "LOW" ? "text-[#FF3B30] border-[#FF3B30]/40 bg-[#FF3B30]/10" :
              "text-[#FFB300] border-[#FFB300]/40 bg-[#FFB300]/10"}`}>
              {result.confidence} confidence
            </span>
            <button data-testid="analysis-tts" onClick={() => speak(narration)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition-colors ${
                playing ? "border-[#2F80FF] text-[#2F80FF]" : "border-[#282C37] text-gray-300 hover:border-[#C6FF00]"}`}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : playing ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {playing ? "Stop" : "Read Aloud"}
            </button>
          </div>
        </div>

        {result.breakdown && (
          <div className="mt-5 space-y-2.5">
            {BAR_KEYS.filter(([k]) => result.breakdown[k] != null).map(([k, label]) => {
              const v = result.breakdown[k];
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-mono-nums text-white">{v}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0A0A0C] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: scoreColor(v) }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {result.sequence?.length > 0 && (
        <div className="surface p-5">
          <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">Motion Sequence</span>
          <ol className="mt-2 space-y-1.5">
            {result.sequence.map((s, i) => <li key={i} className="text-sm text-gray-300">{i + 1}. {s}</li>)}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Block title="Biggest Issue" accent="#FF3B30" body={result.biggest_issue} />
        <Block title="Why It Matters" body={result.why} />
        <Block title="The Fix" accent="#C6FF00" body={result.fix} />
        <Block title="Drill" accent="#2F80FF" body={result.drill} />
      </div>

      {result.notes && (
        <div className="surface p-4 border-l-2 border-l-[#282C37]">
          <span className="text-[10px] uppercase tracking-widest text-gray-500">Notes</span>
          <p className="mt-1 text-sm text-gray-400">{result.notes}</p>
        </div>
      )}
    </div>
  );
}

function Block({ title, body, accent = "#9CA3AF" }) {
  return (
    <div className="surface p-4">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>{title}</span>
      <p className="mt-1 text-sm text-gray-200">{body}</p>
    </div>
  );
}
