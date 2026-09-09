const ZONES = [
  { id: "corner-L", label: "Corner L", x: 45, y: 400, r: 30 },
  { id: "corner-R", label: "Corner R", x: 455, y: 400, r: 30 },
  { id: "wing-L", label: "Wing L", x: 90, y: 235, r: 34 },
  { id: "wing-R", label: "Wing R", x: 410, y: 235, r: 34 },
  { id: "top", label: "Top", x: 250, y: 150, r: 36 },
  { id: "mid-L", label: "Mid L", x: 155, y: 330, r: 30 },
  { id: "mid-R", label: "Mid R", x: 345, y: 330, r: 30 },
  { id: "paint", label: "Paint", x: 250, y: 375, r: 38 },
  { id: "ft", label: "FT", x: 250, y: 285, r: 30 },
];

export const SHOT_ZONES = ZONES;

function zoneColor(stat) {
  if (!stat || stat.attempts === 0) return "#4A4E5D";
  const pct = (stat.makes / stat.attempts) * 100;
  if (pct >= 50) return "#00E676";
  if (pct >= 40) return "#FFB300";
  return "#FF3B30";
}

export default function ShotChart({ byZone = {}, selected, onSelect }) {
  return (
    <svg viewBox="0 0 500 470" className="w-full h-auto select-none" data-testid="shot-chart">
      {/* court */}
      <rect x="10" y="10" width="480" height="450" rx="6" fill="#0E0F14" stroke="#282C37" strokeWidth="2" />
      {/* paint */}
      <rect x="180" y="300" width="140" height="150" fill="none" stroke="#2b2f3a" strokeWidth="2" />
      {/* ft circle */}
      <circle cx="250" cy="300" r="45" fill="none" stroke="#2b2f3a" strokeWidth="2" />
      {/* hoop */}
      <circle cx="250" cy="425" r="8" fill="none" stroke="#C6FF00" strokeWidth="2.5" />
      <line x1="215" y1="440" x2="285" y2="440" stroke="#C6FF00" strokeWidth="3" />
      {/* 3pt arc */}
      <path d="M 40 450 L 40 300 A 220 220 0 0 1 460 300 L 460 450" fill="none" stroke="#2b2f3a" strokeWidth="2" />

      {ZONES.map((z) => {
        const stat = byZone[z.id];
        const fill = zoneColor(stat);
        const pct = stat && stat.attempts ? Math.round((stat.makes / stat.attempts) * 100) : null;
        const isSel = selected === z.id;
        return (
          <g
            key={z.id}
            data-testid={`zone-${z.id}`}
            onClick={() => onSelect && onSelect(z.id)}
            style={{ cursor: onSelect ? "pointer" : "default" }}
          >
            <circle
              cx={z.x} cy={z.y} r={z.r}
              fill={fill} fillOpacity={stat && stat.attempts ? 0.85 : 0.35}
              stroke={isSel ? "#C6FF00" : "#0A0A0C"} strokeWidth={isSel ? 4 : 2}
              className="transition-all duration-200"
            />
            <text x={z.x} y={z.y - 4} textAnchor="middle" fontSize="12" fontWeight="700"
              fill={stat && stat.attempts ? "#0A0A0C" : "#9CA3AF"} fontFamily="Barlow Condensed">
              {z.label.toUpperCase()}
            </text>
            <text x={z.x} y={z.y + 13} textAnchor="middle" fontSize="13" fontWeight="800"
              fill={stat && stat.attempts ? "#0A0A0C" : "#6B7280"} fontFamily="JetBrains Mono">
              {pct !== null ? `${pct}%` : "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
