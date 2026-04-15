import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import universityLogo from "../assets/university-logo.png";
import { Sheet, SheetContent } from "../components/ui/sheet";
import AppSidebar from "../components/shell/AppSidebar";
import AppHeader from "../components/shell/AppHeader";
import { LayoutDashboard, Clock, CheckCircle2, XCircle, Settings, Users, Shield, Building2, BookOpen, GraduationCap, FileText, CreditCard, ScrollText, Sliders } from "lucide-react";

const baseNavItems = [
  { name: "Dashboard", path: "/dean", icon: LayoutDashboard },
  { name: "Pending Final Approvals", path: "/dean/pending", icon: Clock },
  { name: "Approved Transcripts", path: "/dean/approved", icon: CheckCircle2 },
  { name: "Rejected Transcripts", path: "/dean/rejected", icon: XCircle },
  { name: "Settings", path: "/dean/settings", icon: Settings },
];

const moduleNavItems = [
  { name: "User Management", path: "/dean/modules/users", icon: Users, permission: "users.manage" },
  { name: "Role Management", path: "/dean/modules/roles", icon: Shield, permission: "roles.manage" },
  { name: "Faculty & Departments", path: "/dean/modules/faculty", icon: Building2, permission: "institution.manage" },
  { name: "Program & Curriculum", path: "/dean/modules/curriculum", icon: BookOpen, permission: "curriculum.manage" },
  { name: "Grading Scheme", path: "/dean/modules/grading", icon: GraduationCap, permission: "grading.manage" },
  { name: "Transcript Records", path: "/dean/modules/transcripts", icon: FileText, permission: "transcripts.view" },
  { name: "Payments", path: "/dean/modules/payments", icon: CreditCard, permission: "payments.view" },
  { name: "Audit Logs", path: "/dean/modules/audit", icon: ScrollText, permission: "audit.view" },
  { name: "System Settings", path: "/dean/modules/settings", icon: Sliders, permission: "settings.manage" },
];

export default function DeanLayout() {
  const { user, permissions, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const name = user?.fullName || "Dean";

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p.includes("/dean/modules/users")) return "User Management";
    if (p.includes("/dean/modules/roles")) return "Role Management";
    if (p.includes("/dean/modules/faculty")) return "Faculty & Department Management";
    if (p.includes("/dean/modules/curriculum")) return "Program & Curriculum";
    if (p.includes("/dean/modules/grading")) return "Grading Scheme";
    if (p.includes("/dean/modules/transcripts")) return "Transcript Records";
    if (p.includes("/dean/modules/payments")) return "Payments";
    if (p.includes("/dean/modules/audit")) return "Audit Logs";
    if (p.includes("/dean/modules/settings")) return "System Settings";
    if (p.includes("/dean/pending")) return "Pending Final Approvals";
    if (p.includes("/dean/approved")) return "Approved Transcripts";
    if (p.includes("/dean/rejected")) return "Rejected Transcripts";
    if (p.includes("/dean/settings")) return "Settings";
    if (p.includes("/dean/review")) return "Review Transcript";
    return "Dashboard";
  }, [location.pathname]);

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  const grantedModuleNavItems = useMemo(() => {
    if (!Array.isArray(permissions) || permissions.length === 0) return [];
    return moduleNavItems.filter((item) => hasPermission(item.permission));
  }, [hasPermission, permissions]);

  const navItems = useMemo(() => [...baseNavItems, ...grantedModuleNavItems], [grantedModuleNavItems]);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={collapsed}
          logoSrc={universityLogo}
          logoAlt="Maharaja Sayajirao University of Baroda"
          panelTitle="Dean Panel"
          panelSubtitle="Transcript System"
          navItems={navItems}
          onLogout={doLogout}
          ariaLabel="Dean sidebar"
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[320px]">
          <AppSidebar
            collapsed={false}
            logoSrc={universityLogo}
            logoAlt="Maharaja Sayajirao University of Baroda"
            panelTitle="Dean Panel"
            panelSubtitle="Transcript System"
            navItems={navItems}
            onLogout={doLogout}
            onNavigate={() => setMobileOpen(false)}
            ariaLabel="Dean sidebar"
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <AppHeader
          pageTitle={pageTitle}
          logoSrc={universityLogo}
          logoAlt="Maharaja Sayajirao University of Baroda"
          userName={name}
          userRoleLabel="Dean"
          notificationsCount={0}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onLogout={doLogout}
        />

        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-950">
          <div className="p-4 sm:p-6 lg:p-8 animate-fadeIn">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>
    </div>
  );
}
