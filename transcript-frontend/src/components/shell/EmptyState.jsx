import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  hint,
  actionLabel,
  onAction,
  actionDisabled = false,
  badge,
}) {
  return (
    <Card className="rounded-xl border-dashed">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1e40af] dark:bg-slate-800 dark:text-sky-300">
          {Icon ? <Icon className="h-7 w-7" aria-hidden="true" /> : null}
        </div>
        {badge ? (
          <div className="mb-2 flex justify-center">
            <Badge variant="neutral">{badge}</Badge>
          </div>
        ) : null}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {description ? <p className="mx-auto max-w-2xl text-sm text-gray-500 dark:text-slate-400">{description}</p> : null}
        {hint ? <p className="text-xs text-gray-500 dark:text-slate-500">{hint}</p> : null}
        {actionLabel ? (
          <div className="flex justify-center">
            <Button onClick={onAction} disabled={actionDisabled}>
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

