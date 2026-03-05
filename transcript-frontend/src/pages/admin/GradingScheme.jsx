import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";
import { Plus, GraduationCap, Save } from "lucide-react";

export default function GradingScheme() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schemes, setSchemes] = useState([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "10-Point", maxGradePoint: 10 });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await adminService.listGradingSchemes();
        const list = Array.isArray(res?.items) ? res.items : Array.isArray(res?.schemes) ? res.schemes : Array.isArray(res) ? res : [];
        if (!alive) return;
        setSchemes(list);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load grading schemes.");
        setSchemes([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    try {
      await adminService.upsertGradingScheme?.(form);
      toast({ title: "Scheme saved" });
      setOpen(false);
    } catch (e) {
      toast({ title: "Not implemented", description: e?.message || "Backend endpoint not available yet.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Grading Scheme</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Define grade ranges and grade points. Cannot modify if in use.</p>
            </div>
            <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Scheme
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Scheme</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Max GP</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : schemes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-10">
                      No grading schemes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  schemes.map((s) => (
                    <TableRow key={String(s.id || s.schemeId)} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{s.name || s.schemeName || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{s.type || s.schemeType || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{s.maxGradePoint ?? s.max_grade_point ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-xl">
          <DialogHeader>
            <DialogTitle>New Grading Scheme</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <Label>Scheme Name</Label>
              <Input className="rounded-xl" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Max Grade Point</Label>
              <Input
                className="rounded-xl"
                type="number"
                value={form.maxGradePoint}
                onChange={(e) => setForm((p) => ({ ...p, maxGradePoint: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="sm:col-span-3 rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-4 w-4 text-[#1e40af]" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Type</p>
                  <p className="text-xs text-gray-500">10-Point / 7-Point / Letter (future)</p>
                </div>
              </div>
              <Badge variant="secondary">{form.type}</Badge>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={save}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

