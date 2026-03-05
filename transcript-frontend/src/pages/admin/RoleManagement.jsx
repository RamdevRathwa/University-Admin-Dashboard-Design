import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";
import { Shield, Save } from "lucide-react";

const PERMISSIONS = [
  { key: "users.manage", label: "Manage Users" },
  { key: "roles.manage", label: "Manage Roles" },
  { key: "institution.manage", label: "Manage Faculty/Departments" },
  { key: "curriculum.manage", label: "Manage Curriculum" },
  { key: "grading.manage", label: "Manage Grading Schemes" },
  { key: "transcripts.view", label: "View Transcript Records" },
  { key: "transcripts.publish", label: "Publish Transcript" },
  { key: "payments.view", label: "View Payments" },
  { key: "audit.view", label: "View Audit Logs" },
  { key: "settings.manage", label: "System Settings" },
];

export default function RoleManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [permMap, setPermMap] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await adminService.listRoles();
        const list = Array.isArray(res?.items) ? res.items : Array.isArray(res?.roles) ? res.roles : Array.isArray(res) ? res : [];
        if (!alive) return;
        setRoles(list);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load roles.");
        setRoles([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openPermissions = (r) => {
    setSelected(r);
    const current = r.permissions || r.permissionKeys || [];
    const map = {};
    for (const p of PERMISSIONS) map[p.key] = current.includes(p.key);
    setPermMap(map);
    setOpen(true);
  };

  const save = async () => {
    try {
      const keys = Object.keys(permMap).filter((k) => permMap[k]);
      await adminService.updateRolePermissions(selected.id || selected.roleId || selected.name, { permissions: keys });
      toast({ title: "Permissions saved" });
      setOpen(false);
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || "Unable to save permissions.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Role Management</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Permission matrix view for governance (Admin is not academic approver).</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Shield className="h-4 w-4 text-[#1e40af]" />
              RBAC
            </div>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-10">
                      No roles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((r) => (
                    <TableRow key={r.id || r.roleId || r.name} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{r.name || r.roleName || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{r.description || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <Badge variant="secondary">{(r.permissions || r.permissionKeys || []).length || 0} keys</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" className="rounded-xl" onClick={() => openPermissions(r)}>
                          Edit Permissions
                        </Button>
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
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[760px] rounded-xl">
          <DialogHeader>
            <DialogTitle>Permissions: {selected?.name || selected?.roleName || "Role"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERMISSIONS.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.label}</p>
                    <p className="text-xs text-gray-500 truncate">{p.key}</p>
                  </div>
                  <Switch checked={Boolean(permMap[p.key])} onCheckedChange={(v) => setPermMap((m) => ({ ...m, [p.key]: v }))} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <Label>Notes</Label>
              <Input className="mt-1 rounded-xl" value="Admin can publish after Dean approval; cannot approve academically." readOnly />
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

