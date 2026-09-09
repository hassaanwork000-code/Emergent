import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/common";
import AnalysisCard from "@/components/AnalysisCard";
import { ScanLine, Upload, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const MODES = [
  { id: "shooting", label: "Shooting" }, { id: "handle", label: "Handle" },
  { id: "finishing", label: "Finishing" }, { id: "footwork", label: "Footwork" }, { id: "defense", label: "Defense" },
];

export default function FormAnalysis({ embedded }) {
  const [mode, setMode] = useState("shooting");
  const [preview, setPreview] = useState(null);
  const [b64, setB64] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => { setB64(reader.result); setPreview(reader.result); setResult(null); };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!b64) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/analyze/form", { image_base64: b64, mode });
      setResult(data.result);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!embedded && <PageHeader title="Form Analysis" subtitle="Upload a photo of your form and get an AI breakdown with a score, issues and a fix." icon={ScanLine} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="fade-up">
          <div className="mb-4">
            <span className="text-xs uppercase tracking-widest text-gray-500">Analyze</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {MODES.map((m) => (
                <button key={m.id} data-testid={`form-mode-${m.id}`} onClick={() => setMode(m.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                    mode === m.id ? "bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00] font-semibold" : "border-[#282C37] text-gray-300 hover:border-gray-500"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div
            data-testid="form-dropzone"
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`surface p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[280px] transition-colors ${
              drag ? "border-[#C6FF00]" : ""}`}>
            {preview ? (
              <img src={preview} alt="preview" className="max-h-64 rounded-lg object-contain" />
            ) : (
              <>
                <div className="h-14 w-14 rounded-xl bg-[#1A1C23] flex items-center justify-center mb-4">
                  <ImageIcon className="h-7 w-7 text-[#C6FF00]" />
                </div>
                <p className="text-white font-semibold">Drop a photo or tap to browse</p>
                <p className="text-sm text-gray-500 mt-1">JPG, PNG or WEBP</p>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" data-testid="form-file-input"
              onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          <button onClick={analyze} disabled={!b64 || loading} data-testid="form-analyze"
            className="mt-4 w-full btn-lime rounded-lg py-3 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "Analyzing form…" : "Analyze My Form"}
          </button>
        </div>

        <div className="fade-up">
          {loading && <div className="surface p-10 text-center text-gray-400">Coach is breaking down your mechanics…</div>}
          {result && <AnalysisCard result={result} />}
          {!result && !loading && (
            <div className="surface p-10 text-center text-gray-500 h-full flex items-center justify-center">
              Your breakdown will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
