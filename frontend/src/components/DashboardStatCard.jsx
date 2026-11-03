const tones = {
  blue: "bg-[#edf1ff] text-[#4d7cfe]",
  purple: "bg-[#f1eaff] text-[#7c35f5]",
  rose: "bg-[#fff0f2] text-[#f44f70]",
  cyan: "bg-[#e8faff] text-[#16b9e7]",
  orange: "bg-[#fff1eb] text-[#e67c54]",
};

export default function DashboardStatCard({ icon: Icon, label, value, hint, tone = "blue" }) {
  return (
    <div className="app-panel flex min-w-0 items-center gap-4 rounded-lg bg-white px-5 py-7 sm:min-h-[148px] sm:gap-5 sm:px-6 sm:py-8">
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg sm:h-16 sm:w-16 ${tones[tone]}`}>
        <Icon aria-hidden="true" className="h-7 w-7" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 break-words text-[28px] font-bold leading-none tracking-tight text-slate-900 sm:text-[30px]">{value ?? 0}</p>
        {hint ? <p className="mt-2 text-xs leading-snug text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}
