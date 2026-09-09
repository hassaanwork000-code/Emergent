import { useRef } from "react";
import { Share2, Download } from "lucide-react";

// Draws a shareable card on a canvas and exports via Web Share API or PNG download.
export default function ShareCard({ title, subtitle, lines = [], accent = "#C6FF00", playerName = "" }) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    // bg
    ctx.fillStyle = "#0A0A0C";
    ctx.fillRect(0, 0, 1080, 1080);
    // dot grid
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < 1080; x += 44) for (let y = 0; y < 1080; y += 44) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
    // border
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, 1000, 1000);

    // brand
    ctx.fillStyle = accent;
    ctx.font = "900 34px 'Barlow Condensed', sans-serif";
    ctx.fillText("ELITE AI BASKETBALL COACH", 90, 130);

    // title
    ctx.fillStyle = "#F4F5F7";
    ctx.font = "900 96px 'Barlow Condensed', sans-serif";
    ctx.fillText(title.toUpperCase(), 90, 300);

    if (subtitle) {
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "600 40px Inter, sans-serif";
      ctx.fillText(subtitle, 90, 370);
    }

    // lines
    let y = 520;
    lines.forEach((ln) => {
      ctx.fillStyle = accent;
      ctx.font = "800 120px 'JetBrains Mono', monospace";
      ctx.fillText(ln.value, 90, y);
      ctx.fillStyle = "#6B7280";
      ctx.font = "600 34px Inter, sans-serif";
      ctx.fillText(ln.label.toUpperCase(), 95, y + 50);
      y += 200;
    });

    // footer player
    if (playerName) {
      ctx.fillStyle = "#F4F5F7";
      ctx.font = "700 40px 'Barlow Condensed', sans-serif";
      ctx.fillText(playerName.toUpperCase(), 90, 990);
    }
    return canvas;
  };

  const share = async () => {
    const canvas = draw();
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "elite-card.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Elite AI Basketball Coach" });
          return;
        } catch { /* fall through to download */ }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "elite-card.png"; a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <button data-testid="share-card-btn" onClick={share}
      className="inline-flex items-center gap-2 rounded-full btn-lime px-5 py-2.5 text-sm">
      {navigator.canShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      Share Card
      <canvas ref={canvasRef} className="hidden" />
    </button>
  );
}
