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
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 truncate">
          {title}
        </p>
        <h3 className="text-2xl font-bold text-gray-900 leading-none">
          {value}
        </h3>
        {description && (
          <p className="text-xs text-gray-500 mt-2 truncate">{description}</p>
        )}
      </div>
    </div>
  );
}
