import { cn } from "../../lib/utils";

export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-start md:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

