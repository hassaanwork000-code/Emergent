import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/common";
import AnalysisCard from "@/components/AnalysisCard";
import { Video, Upload, Circle, Square, Loader2, Camera, FileVideo } from "lucide-react";
import { toast } from "sonner";

const MODES = [
  { id: "shooting", label: "Shooting" }, { id: "handle", label: "Handle" },
  { id: "finishing", label: "Finishing" }, { id: "footwork", label: "Footwork" }, { id: "defense", label: "Defense" },
];

async function extractFrames(url, count = 5) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = url; video.muted = true; video.playsInline = true; video.crossOrigin = "anonymous";
    const frames = [];
    video.onloadedmetadata = () => {
      const duration = video.duration && isFinite(video.duration) ? video.duration : 1;
      const times = Array.from({ length: count }, (_, i) => (duration * (i + 0.5)) / count);
      let idx = 0;
      const canvas = document.createElement("canvas");
      const seekNext = () => {
        if (idx >= times.length) { resolve(frames); return; }
        video.currentTime = Math.min(times[idx], duration - 0.05);
      };
      video.onseeked = () => {
        const w = 640, ratio = video.videoHeight / video.videoWidth || 0.75;
        canvas.width = w; canvas.height = Math.round(w * ratio);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.8));
        idx += 1; seekNext();
      };
      seekNext();
    };
    video.onerror = () => reject(new Error("Could not read video"));
  });
}

export default function FilmRoom() {
  const [mode, setMode] = useState("shooting");
  const [source, setSource] = useState("upload");
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  const liveRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (liveRef.current) { liveRef.current.srcObject = stream; liveRef.current.play(); }
    } catch { toast.error("Camera access denied or unavailable."); }
  };

  const startRec = () => {
    if (!streamRef.current) { toast.error("Start the camera first."); return; }
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoBlob(blob); setVideoUrl(URL.createObjectURL(blob)); setResult(null);
    };
    rec.start(); recorderRef.current = rec; setRecording(true);
  };
  const stopRec = () => { recorderRef.current?.stop(); setRecording(false); };

  const onUpload = (file) => {
    if (!file) return;
    if (file.size > 60 * 1024 * 1024) { toast.error("Max 60MB."); return; }
    setVideoBlob(file); setVideoUrl(URL.createObjectURL(file)); setResult(null);
  };

  const analyze = async () => {
    if (!videoBlob) return;
    setLoading(true); setResult(null);
    try {
      setStatus("Extracting frames…");
      const frames = await extractFrames(videoUrl, 5);
      if (!frames.length) throw new Error("no frames");

      setStatus("Uploading clip to your film room…");
      const fd = new FormData();
      const name = videoBlob.name || "clip.webm";
      fd.append("file", videoBlob, name);
      const up = await api.post("/upload/video", fd, { headers: { "Content-Type": "multipart/form-data" } });

      setStatus("Coach is analyzing your motion…");
      const { data } = await api.post("/analyze/video", { frames, mode, video_path: up.data.path });
      setResult(data.result);
      toast.success("Film breakdown saved to Clip History.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Analysis failed. Try a shorter clip.");
    } finally {
      setLoading(false); setStatus("");
    }
  };

  return (
    <div>
      <PageHeader title="Film Room" subtitle="Record on your webcam or upload a clip. Your coach breaks down the motion frame by frame." icon={Video} />

      <div className="mb-4 fade-up">
        <span className="text-xs uppercase tracking-widest text-gray-500">Analyze</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {MODES.map((m) => (
            <button key={m.id} data-testid={`film-mode-${m.id}`} onClick={() => setMode(m.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                mode === m.id ? "bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00] font-semibold" : "border-[#282C37] text-gray-300 hover:border-gray-500"}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="fade-up">
          <div className="flex gap-2 mb-4">
            {[["upload", "Upload", FileVideo], ["record", "Webcam", Camera]].map(([id, label, Icon]) => (
              <button key={id} data-testid={`film-source-${id}`} onClick={() => setSource(id)}
                className={`flex-1 rounded-lg py-2.5 text-sm border flex items-center justify-center gap-2 transition-colors ${
                  source === id ? "bg-[#1A1C23] border-[#C6FF00]/40 text-white" : "border-[#282C37] text-gray-400"}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>

          <div className="surface p-4">
            {source === "record" ? (
              <div>
                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                  {videoUrl && !recording ? (
                    <video src={videoUrl} controls className="w-full h-full" data-testid="film-preview" />
                  ) : (
                    <video ref={liveRef} className="w-full h-full object-cover" muted playsInline />
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={startCam} data-testid="film-start-cam" className="flex-1 rounded-lg border border-[#282C37] py-2.5 text-sm text-gray-300 hover:border-gray-500 transition-colors">
                    Start Camera
                  </button>
                  {!recording ? (
                    <button onClick={startRec} data-testid="film-record" className="flex-1 rounded-lg bg-[#FF3B30] text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                      <Circle className="h-4 w-4 fill-current" /> Record
                    </button>
                  ) : (
                    <button onClick={stopRec} data-testid="film-stop" className="flex-1 rounded-lg bg-white text-black py-2.5 text-sm font-semibold flex items-center justify-center gap-2 pulse-ring">
                      <Square className="h-4 w-4 fill-current" /> Stop
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {videoUrl ? (
                  <video src={videoUrl} controls className="w-full rounded-lg aspect-video bg-black" data-testid="film-preview" />
                ) : (
                  <label className="flex flex-col items-center justify-center text-center cursor-pointer aspect-video rounded-lg border border-dashed border-[#282C37] hover:border-[#C6FF00] transition-colors">
                    <FileVideo className="h-10 w-10 text-[#C6FF00] mb-3" />
                    <span className="text-white font-semibold">Tap to choose a video</span>
                    <span className="text-sm text-gray-500 mt-1">MP4 / WEBM · Max 60MB</span>
                    <input type="file" accept="video/*" className="hidden" data-testid="film-file-input" onChange={(e) => onUpload(e.target.files[0])} />
                  </label>
                )}
              </div>
            )}
          </div>

          <button onClick={analyze} disabled={!videoBlob || loading} data-testid="film-analyze"
            className="mt-4 w-full btn-lime rounded-lg py-3 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? (status || "Working…") : "Analyze Clip"}
          </button>
        </div>

        <div className="fade-up">
          {loading && <div className="surface p-10 text-center text-gray-400">{status || "Working…"}</div>}
          {result && <AnalysisCard result={result} />}
          {!result && !loading && (
            <div className="surface p-10 text-center text-gray-500 h-full flex items-center justify-center">
              Your multi-frame motion breakdown will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
