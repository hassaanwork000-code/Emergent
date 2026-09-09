import axios from "axios";
import { useRef, useState, useCallback } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const BACKEND_URL = BACKEND;
export const API = `${BACKEND}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

// TTS hook: POST /tts then play mp3
export function useTTS() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  const speak = useCallback(async (text) => {
    if (playing) { stop(); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/tts", { text, voice: "onyx" });
      const audio = new Audio(`${BACKEND}${data.url}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onpause = () => setPlaying(false);
      await audio.play();
      setPlaying(true);
    } catch (e) {
      console.error("TTS failed", e);
    } finally {
      setLoading(false);
    }
  }, [playing, stop]);

  return { speak, stop, playing, loading };
}
