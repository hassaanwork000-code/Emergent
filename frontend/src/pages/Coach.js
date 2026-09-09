import { useEffect, useRef, useState } from "react";
import { api, useTTS } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Send, Volume2, VolumeX, Loader2, Headphones } from "lucide-react";

const PRESETS = [
  "What should I work on today?",
  "Build me a 3-drill shooting workout",
  "How do I get separation for my jumper?",
  "Break down my primary archetype's must-have moves",
];

export default function Coach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const { speak, playing, loading: ttsLoading } = useTTS();
  const scrollRef = useRef(null);

  useEffect(() => { api.get("/coach/history").then(({ data }) => setMessages(data.messages)); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg, _local: true }]);
    setSending(true);
    try {
      const { data } = await api.post("/coach/chat", { message: msg });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      if (autoSpeak) { setSpeakingIdx(-1); speak(data.reply); }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong. Try again." }]);
    } finally {
      setSending(false);
    }
  };

  const handleSpeak = (idx, text) => {
    setSpeakingIdx(idx);
    speak(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] lg:h-[calc(100vh-5rem)]">
      <PageHeader title="AI Coach" subtitle="Advice tuned to your profile, archetype and weaknesses." icon={MessageSquare}
        action={
          <div className="flex items-center gap-2.5 surface px-3.5 py-2.5" data-testid="handsfree-toggle">
            <Headphones className={`h-4 w-4 ${autoSpeak ? "text-[#2F80FF]" : "text-gray-500"}`} />
            <span className="text-xs uppercase tracking-widest text-gray-400 hidden sm:inline">Hands-free</span>
            <Switch checked={autoSpeak} onCheckedChange={setAutoSpeak} data-testid="handsfree-switch" />
          </div>
        } />

      <div ref={scrollRef} data-testid="coach-messages" className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.length === 0 && !sending && (
          <div className="surface p-6 text-center">
            <p className="text-gray-400 mb-4">Ask your coach anything. Try one of these:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PRESETS.map((p) => (
                <button key={p} data-testid="coach-preset" onClick={() => send(p)}
                  className="rounded-full border border-[#282C37] px-3.5 py-1.5 text-sm text-gray-300 hover:border-[#C6FF00] hover:text-white transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} fade-up`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 border ${
              m.role === "user" ? "bg-[#2F80FF]/10 border-[#2F80FF]/30 text-white" : "bg-[#121318] border-[#282C37] text-gray-200"}`}>
              {m.role === "assistant" && (
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-[#C6FF00]">Elite Coach</span>
                  <button data-testid="coach-tts-btn" onClick={() => handleSpeak(i, m.text)}
                    className={`inline-flex items-center gap-1 text-xs transition-colors ${playing && speakingIdx === i ? "text-[#2F80FF]" : "text-gray-500 hover:text-white"}`}>
                    {ttsLoading && speakingIdx === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : playing && speakingIdx === i ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    {playing && speakingIdx === i ? "Stop" : "Listen"}
                  </button>
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3 bg-[#121318] border border-[#282C37]">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-[#C6FF00] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 pt-2 border-t border-[#282C37]">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your coach…" data-testid="coach-input"
          className="flex-1 rounded-full bg-[#121318] border border-[#282C37] px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#C6FF00] focus:outline-none transition-colors" />
        <button type="submit" disabled={sending || !input.trim()} data-testid="coach-send"
          className="btn-lime rounded-full h-12 w-12 flex items-center justify-center shrink-0">
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
