import { useEffect, useState } from "react";
import { Bell, Moon, Save, Sun, UserCog } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../components/ui/use-toast";
import { accountService } from "../../services/accountService";

function PreferenceRow({ icon: Icon, title, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1e40af] dark:bg-slate-800 dark:text-sky-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function DeanSettings() {
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const { user, setCurrentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", email: "", mobile: "" });
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifFinalQueue, setNotifFinalQueue] = useState(true);
  const [notifPublished, setNotifPublished] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await accountService.getProfile();
        if (!alive) return;
        setProfile({
          fullName: res?.fullName || "",
          email: res?.email || "",
          mobile: res?.mobile || "",
        });
      } catch (e) {
        if (!alive) return;
        toast({ title: "Failed to load profile", description: e?.message || "Unable to load Dean profile.", variant: "destructive" });
      }

      try {
        const prefs = await accountService.getPreferences();
        if (!alive) return;
        setNotifEmail(Boolean(prefs?.emailNotifications ?? true));
        setNotifFinalQueue(Boolean(prefs?.finalApprovalQueue ?? true));
        setNotifPublished(Boolean(prefs?.publishFollowUp ?? true));
      } catch {
        if (!alive) return;
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await accountService.updateProfile(profile);
      setProfile({
        fullName: updated?.fullName || "",
        email: updated?.email || "",
        mobile: updated?.mobile || "",
      });
      setCurrentUser(updated);
      toast({ title: "Profile updated", description: "Updated Dean profile is now reflected across the application." });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || "Unable to update profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSavingPreferences(true);
    try {
      await accountService.updatePreferences({
        emailNotifications: notifEmail,
        inAppAlerts: true,
        approvalUpdates: true,
        queueUpdates: true,
        returnedCases: true,
        finalApprovalQueue: notifFinalQueue,
        publishFollowUp: notifPublished,
      });
      toast({ title: "Preferences updated", description: "Dean notifications are now saved to your account." });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || "Unable to update preferences.", variant: "destructive" });
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your Dean profile, alerts, and display preferences."
        actions={<Badge variant="neutral">Dean Preferences</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={profile.fullName} disabled={loading || saving} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profile.email} disabled={loading || saving} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input value={profile.mobile} disabled={loading || saving} onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={user?.role || "Dean"} disabled />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={loading || saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Theme Mode</p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">Currently using {isDark ? "dark" : "light"} mode.</p>
                </div>
                <Button variant="outline" onClick={toggleTheme}>
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  Toggle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PreferenceRow icon={Bell} title="Email Notifications" description="Receive final approval alerts by email." checked={notifEmail} onCheckedChange={setNotifEmail} />
            <PreferenceRow icon={UserCog} title="Final Approval Queue" description="Stay informed about new HoD-approved transcript requests." checked={notifFinalQueue} onCheckedChange={setNotifFinalQueue} />
            <PreferenceRow icon={Bell} title="Publish Follow-up" description="Get updates when approved transcripts are published by Admin." checked={notifPublished} onCheckedChange={setNotifPublished} />
          </div>
          <div className="flex justify-end">
            <Button onClick={savePreferences} disabled={loading || savingPreferences}>
              <Save className="h-4 w-4" />
              {savingPreferences ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
