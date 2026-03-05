import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";
import { Plus, Search, Lock, Unlock, Pencil, Trash2 } from "lucide-react";

function StatusBadge({ active, locked }) {
  if (locked) return <Badge variant="destructive">Locked</Badge>;
  return <Badge variant={active ? "secondary" : "outline"}>{active ? "Active" : "Inactive"}</Badge>;
}

function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <p className="text-xs text-gray-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [role, setRole] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "", mobile: "", role: "Student", isActive: true, locked: false });

  const canSubmit = useMemo(() => {
    return String(form.fullName).trim() && String(form.email).trim() && String(form.mobile).trim() && String(form.role).trim();
  }, [form]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listUsers({
        q,
        role: role === "All" ? "" : role,
        page,
        pageSize,
      });
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res?.users) ? res.users : Array.isArray(res) ? res : [];
      setRows(items);
      setTotal(Number(res?.total || items.length || 0));
    } catch (e) {
      setError(e?.message || "Failed to load users.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, role]);

  const onSearch = () => {
    setPage(1);
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ fullName: "", email: "", mobile: "", role: "Student", isActive: true, locked: false });
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      fullName: u.fullName || u.name || "",
      email: u.email || "",
      mobile: u.mobile || "",
      role: u.role || "Student",
      isActive: u.isActive !== false,
      locked: Boolean(u.locked),
    });
    setOpen(true);
  };

  const submit = async () => {
    setError("");
    try {
      if (editing?.id) {
        await adminService.updateUser(editing.id, form);
        toast({ title: "User updated" });
      } else {
        await adminService.createUser(form);
        toast({ title: "User created" });
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Action failed", description: e?.message || "Unable to save user.", variant: "destructive" });
    }
  };

  const toggleLock = async (u) => {
    try {
      await adminService.setUserLocked(u.id, !u.locked);
      toast({ title: !u.locked ? "User locked" : "User unlocked" });
      await load();
    } catch (e) {
      toast({ title: "Action failed", description: e?.message || "Unable to update user.", variant: "destructive" });
    }
  };

  const remove = async (u) => {
    try {
      await adminService.softDeleteUser(u.id);
      toast({ title: "User deleted (soft)" });
      await load();
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message || "Unable to delete user.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">User Management</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Search, filter, and manage user accounts (soft delete, lock).</p>
            </div>
            <Button onClick={openCreate} className="bg-[#1e40af] hover:bg-[#1e3a8a] rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5">
              <Label htmlFor="q">Search</Label>
              <div className="relative mt-1">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                <Input
                  id="q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name or email"
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>
            <div className="lg:col-span-3">
              <Label>Role</Label>
              <div className="mt-1">
                <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Clerk">Clerk</SelectItem>
                    <SelectItem value="HoD">HoD</SelectItem>
                    <SelectItem value="Dean">Dean</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="lg:col-span-2 flex items-end">
              <Button variant="outline" className="w-full rounded-xl" onClick={onSearch}>
                Apply
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-52" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-gray-500 py-10">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((u) => (
                    <TableRow key={u.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{u.fullName || u.name || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{u.email || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{u.mobile || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{u.role || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge active={u.isActive !== false} locked={Boolean(u.locked)} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{u.lastLogin || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => openEdit(u)} aria-label="Edit user">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => toggleLock(u)}
                            aria-label={u.locked ? "Unlock user" : "Lock user"}
                          >
                            {u.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => remove(u)}
                            aria-label="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[640px] rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Clerk">Clerk</SelectItem>
                  <SelectItem value="HoD">HoD</SelectItem>
                  <SelectItem value="Dean">Dean</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Mobile</Label>
              <Input value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Active</p>
                <p className="text-xs text-gray-500">Inactive users cannot login.</p>
              </div>
              <Switch checked={Boolean(form.isActive)} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Locked</p>
                <p className="text-xs text-gray-500">Locked users are blocked.</p>
              </div>
              <Switch checked={Boolean(form.locked)} onCheckedChange={(v) => setForm((p) => ({ ...p, locked: v }))} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]"
              onClick={submit}
              disabled={!canSubmit}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

