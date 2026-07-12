import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  colorClass?: string;
  bgClass?: string;
  description?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  colorClass = "text-purple-600",
  bgClass = "bg-purple-50",
  description,
}: KpiCardProps) {
  return (
    <div className="premium-card p-6 flex items-start gap-4">
      <div className={`p-3.5 rounded-2xl transition-transform duration-300 hover:scale-105 ${bgClass} ${colorClass} shadow-2xs`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
          {title}
        </p>
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display leading-none">
          {value}
        </h3>
        {description && (
          <p className="text-xs text-slate-400 mt-2 font-medium truncate">{description}</p>
        )}
      </div>
    </div>
  );
}
