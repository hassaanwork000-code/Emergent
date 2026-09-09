export function Loading({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center py-20" data-testid="loading">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-[#282C37] border-t-[#C6FF00] animate-spin" />
        <span className="text-xs uppercase tracking-widest text-gray-500">{label}</span>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8 fade-up">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-1 h-11 w-11 shrink-0 rounded-xl bg-[#C6FF00]/10 border border-[#C6FF00]/30 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[#C6FF00]" />
          </div>
        )}
        <div>
          <h1 className="heading text-3xl sm:text-4xl lg:text-5xl leading-none">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-gray-400 max-w-2xl">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatPill({ label, value, accent = "#C6FF00" }) {
  return (
    <div className="surface px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
      <div className="font-mono-nums text-2xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}
