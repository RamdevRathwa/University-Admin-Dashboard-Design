import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";

export default function RemarksModal({
  open,
  title = "Remarks",
  placeholder = "Type remarks...",
  initialValue = "",
  confirmText = "Submit",
  onConfirm,
  onClose,
}) {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) setRemarks(initialValue || "");
  }, [open, initialValue]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={placeholder}
            rows={5}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af] focus-visible:ring-offset-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm?.(remarks)}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

