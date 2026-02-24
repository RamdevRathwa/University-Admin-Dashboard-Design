import { useToast } from "./use-toast";
import { Toast, ToastDescription, ToastTitle } from "./toast";
import { Button } from "./button";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {t.title ? <ToastTitle>{t.title}</ToastTitle> : null}
              {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <span className="text-lg leading-none">&times;</span>
            </Button>
          </div>
        </Toast>
      ))}
    </div>
  );
}

