import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";
import { accountService } from "../../services/accountService";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/shell/PageHeader";

export default function SystemSettings() {
  const { toast } = useToast();
  const { user, setCurrentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", email: "", mobile: "" });

  const [settings, setSettings] = useState({
    appName: "Online Transcript Management System",
    contactEmail: "",
    maintenanceMode: false,
    otp: { ttlSeconds: 300, length: 6, maxSendPerHour: 20 },
    smtp: { host: "", port: 587, username: "", fromEmail: "", fromName: "Maharaja Sayajirao University of Baroda" },
    payment: { gateway: "", enabled: false, notes: "" },
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [res, profileRes] = await Promise.all([
          adminService.getSystemSettings(),
          accountService.getProfile(),
        ]);
        if (!alive) return;
        setSettings((p) => ({ ...p, ...(res || {}) }));
        setProfile({
          fullName: profileRes?.fullName || "",
          email: profileRes?.email || "",
          mobile: profileRes?.mobile || "",
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load settings.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await adminService.updateSystemSettings(settings);
      toast({ title: "Settings saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || "Unable to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const updated = await accountService.updateProfile(profile);
      setProfile({
        fullName: updated?.fullName || "",
        email: updated?.email || "",
        mobile: updated?.mobile || "",
      });
      setCurrentUser(updated);
      toast({ title: "Profile updated" });
    } catch (e) {
      toast({ title: "Profile save failed", description: e?.message || "Unable to update profile.", variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="System Settings"
        description="Configure global application settings for identity, OTP, email, and future payment integration."
      />

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Admin Profile</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Update your own account details. Changes reflect across admin views and shared headers.</p>
            </div>
            <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={saveProfile} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Full Name</Label>
            <Input value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label>Mobile</Label>
            <Input value={profile.mobile} onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Input value={user?.role || "Admin"} disabled className="rounded-xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">System Settings</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Configure application name, OTP, SMTP, and maintenance mode.</p>
            </div>
            <Button
              className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue="general">
            <TabsList className="rounded-xl">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="otp">OTP</TabsTrigger>
              <TabsTrigger value="smtp">SMTP</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Application Name</Label>
                  <Input
                    className="rounded-xl"
                    value={settings.appName || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, appName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contact Email</Label>
                  <Input
                    className="rounded-xl"
                    value={settings.contactEmail || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3 lg:col-span-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
                    <p className="text-xs text-gray-500">If enabled, block user actions and show maintenance banner.</p>
                  </div>
                  <Switch
                    checked={Boolean(settings.maintenanceMode)}
                    onCheckedChange={(v) => setSettings((p) => ({ ...p, maintenanceMode: v }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="otp" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>OTP Length</Label>
                  <Input
                    className="rounded-xl"
                    type="number"
                    value={settings.otp?.length ?? 6}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, otp: { ...(p.otp || {}), length: Number(e.target.value || 0) } }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>TTL (seconds)</Label>
                  <Input
                    className="rounded-xl"
                    type="number"
                    value={settings.otp?.ttlSeconds ?? 300}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, otp: { ...(p.otp || {}), ttlSeconds: Number(e.target.value || 0) } }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max Send / Hour</Label>
                  <Input
                    className="rounded-xl"
                    type="number"
                    value={settings.otp?.maxSendPerHour ?? 20}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        otp: { ...(p.otp || {}), maxSendPerHour: Number(e.target.value || 0) },
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="smtp" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>SMTP Host</Label>
                  <Input
                    className="rounded-xl"
                    value={settings.smtp?.host || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, smtp: { ...(p.smtp || {}), host: e.target.value } }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>SMTP Port</Label>
                  <Input
                    className="rounded-xl"
                    type="number"
                    value={settings.smtp?.port ?? 587}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, smtp: { ...(p.smtp || {}), port: Number(e.target.value || 0) } }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Username</Label>
                  <Input
                    className="rounded-xl"
                    value={settings.smtp?.username || ""}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, smtp: { ...(p.smtp || {}), username: e.target.value } }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>From Email</Label>
                  <Input
                    className="rounded-xl"
                    value={settings.smtp?.fromEmail || ""}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, smtp: { ...(p.smtp || {}), fromEmail: e.target.value } }))
                    }
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label>From Name</Label>
                  <Input
                    className="rounded-xl"
                    value={settings.smtp?.fromName || ""}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, smtp: { ...(p.smtp || {}), fromName: e.target.value } }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Payment Module</p>
                  <p className="text-xs text-gray-500">Enable later. For now, keep disabled.</p>
                </div>
                <Switch
                  checked={Boolean(settings.payment?.enabled)}
                  onCheckedChange={(v) => setSettings((p) => ({ ...p, payment: { ...(p.payment || {}), enabled: v } }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Gateway</Label>
                <Input
                  className="rounded-xl"
                  value={settings.payment?.gateway || ""}
                  onChange={(e) => setSettings((p) => ({ ...p, payment: { ...(p.payment || {}), gateway: e.target.value } }))}
                  placeholder="Razorpay / PayU / ..."
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  className="rounded-xl min-h-[120px]"
                  value={settings.payment?.notes || ""}
                  onChange={(e) => setSettings((p) => ({ ...p, payment: { ...(p.payment || {}), notes: e.target.value } }))}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
