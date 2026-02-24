import { useMemo, useState } from "react";

function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-7 rounded-full transition ${
          enabled ? "bg-blue-800" : "bg-gray-200"
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

export default function ClerkSettings() {
  const [profile, setProfile] = useState({ name: "Clerk", email: "clerk@msubaroda.ac.in" });

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifApprovals, setNotifApprovals] = useState(true);

  const [darkMode, setDarkMode] = useState(false);

  const themeLabel = useMemo(() => (darkMode ? "Dark" : "Light"), [darkMode]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Update profile and notification preferences (UI only).</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Update Profile</h3>
            <span className="text-xs text-gray-500">Clerk</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Full Name"
              value={profile.name}
              onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
            />
            <Field
              label="Email"
              value={profile.email}
              onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl bg-blue-800 text-white text-sm font-semibold hover:bg-blue-900 transition"
            >
              Save Changes
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Theme Mode</h3>
          <div className="p-4 rounded-xl border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Theme</p>
              <p className="text-sm text-gray-500 mt-0.5">{themeLabel} mode (mock)</p>
            </div>
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition"
            >
              Toggle
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Toggle
            enabled={notifEmail}
            onChange={setNotifEmail}
            label="Email Notifications"
            description="Updates on verification and requests"
          />
          <Toggle
            enabled={notifPush}
            onChange={setNotifPush}
            label="Push Notifications"
            description="In-app alerts"
          />
          <Toggle
            enabled={notifApprovals}
            onChange={setNotifApprovals}
            label="Approval Updates"
            description="HoD/Dean actions"
          />
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 transition"
      />
    </label>
  );
}
