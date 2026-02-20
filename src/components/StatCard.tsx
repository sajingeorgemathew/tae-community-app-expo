import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  linkLabel?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  href,
  linkLabel,
}: StatCardProps) {
  const content = (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-950 dark:border-slate-700">
      <div>
        <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
        {href && linkLabel ? (
          <p className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
            {linkLabel} &rarr;
          </p>
        ) : (
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
        )}
      </div>
      <div className="text-2xl text-gray-400 dark:text-slate-500">{icon}</div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
