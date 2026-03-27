import { useState } from "react";
import { Bell, Moon, Save, Sun, UserCog } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import { useTheme } from "../../context/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../components/ui/use-toast";

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

export default function ClerkSettings() {
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState({ name: "Clerk User", email: "clerk@msubaroda.ac.in" });
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifApprovals, setNotifApprovals] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, alerts, and display preferences without leaving the clerk workspace."
        actions={<Badge variant="neutral">Clerk Preferences</Badge>}
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
                <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => toast({ title: "Profile saved", description: "UI preferences updated locally." })}
              >
                <Save className="h-4 w-4" />
                Save Changes
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
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
                    Currently using {isDark ? "dark" : "light"} mode.
                  </p>
                </div>
                <Button variant="outline" onClick={toggleTheme}>
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  Toggle
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-800 p-4 text-sm text-gray-500 dark:text-slate-400">
              Theme preference is shared across staff dashboards, so Clerk, HoD, Dean, and Admin stay visually consistent.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PreferenceRow
            icon={Bell}
            title="Email Notifications"
            description="Receive request and verification updates by email."
            checked={notifEmail}
            onCheckedChange={setNotifEmail}
          />
          <PreferenceRow
            icon={UserCog}
            title="In-app Alerts"
            description="Keep action reminders visible inside the clerk panel."
            checked={notifPush}
            onCheckedChange={setNotifPush}
          />
          <PreferenceRow
            icon={Bell}
            title="Approval Updates"
            description="See when HoD or Dean sends a request back for changes."
            checked={notifApprovals}
            onCheckedChange={setNotifApprovals}
          />
        </CardContent>
      </Card>
    </div>
  );
}

