import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import universityLogo from "../assets/university-logo.png";
import { Sheet, SheetContent } from "../components/ui/sheet";
import AppSidebar from "../components/shell/AppSidebar";
import AppHeader from "../components/shell/AppHeader";
import {
  LayoutDashboard,
  Users,
  Shield,
  Building2,
  BookOpen,
  GraduationCap,
  FileText,
  CreditCard,
  ScrollText,
  Sliders,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard, end: true },
  { name: "User Management", path: "/admin/users", icon: Users },
  { name: "Role Management", path: "/admin/roles", icon: Shield },
  { name: "Faculty & Departments", path: "/admin/faculty", icon: Building2 },
  { name: "Program & Curriculum", path: "/admin/curriculum", icon: BookOpen },
  { name: "Grading Scheme", path: "/admin/grading", icon: GraduationCap },
  { name: "Transcript Records", path: "/admin/transcripts", icon: FileText },
  { name: "Payments", path: "/admin/payments", icon: CreditCard },
  { name: "Audit Logs", path: "/admin/audit", icon: ScrollText },
  { name: "System Settings", path: "/admin/settings", icon: Sliders },
];

const permissionByPathPrefix = [
  { prefix: "/admin/users", permission: "users.manage" },
  { prefix: "/admin/roles", permission: "roles.manage" },
  { prefix: "/admin/faculty", permission: "institution.manage" },
  { prefix: "/admin/curriculum", permission: "curriculum.manage" },
  { prefix: "/admin/grading", permission: "grading.manage" },
  { prefix: "/admin/transcripts", permission: "transcripts.view" },
  { prefix: "/admin/payments", permission: "payments.view" },
  { prefix: "/admin/audit", permission: "audit.view" },
  { prefix: "/admin/settings", permission: "settings.manage" },
];

export default function AdminLayout() {
  const { user, permissions, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const name = user?.fullName || "Admin";

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p === "/admin" || p.startsWith("/admin/dashboard")) return "Dashboard";
    if (p.startsWith("/admin/users")) return "User Management";
    if (p.startsWith("/admin/roles")) return "Role Management";
    if (p.startsWith("/admin/faculty")) return "Faculty & Department Management";
    if (p.startsWith("/admin/curriculum")) return "Program & Curriculum";
    if (p.startsWith("/admin/grading")) return "Grading Scheme";
    if (p.startsWith("/admin/transcripts")) return "Transcript Records";
    if (p.startsWith("/admin/payments")) return "Payments";
    if (p.startsWith("/admin/audit")) return "Audit Logs";
    if (p.startsWith("/admin/settings")) return "System Settings";
    return "Dashboard";
  }, [location.pathname]);

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  const permissionAwareNavItems = useMemo(() => {
    // Backward compatibility: when no permissions are defined for the role yet, keep legacy full menu.
    if (!Array.isArray(permissions) || permissions.length === 0) return navItems;

    return navItems.filter((item) => {
      const match = permissionByPathPrefix.find((x) => item.path.startsWith(x.prefix));
      if (!match) return true;
      return hasPermission(match.permission);
    });
  }, [hasPermission, permissions]);

  useEffect(() => {
    if (!Array.isArray(permissions) || permissions.length === 0) return;

    const current = location.pathname;
    const match = permissionByPathPrefix.find((x) => current.startsWith(x.prefix));
    if (!match) return;

    if (!hasPermission(match.permission)) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [hasPermission, location.pathname, navigate, permissions]);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={collapsed}
          logoSrc={universityLogo}
          logoAlt="Maharaja Sayajirao University of Baroda"
          panelTitle="Admin Panel"
          panelSubtitle="Transcript System"
          navItems={permissionAwareNavItems}
          onLogout={doLogout}
          ariaLabel="Admin sidebar"
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[320px]">
          <AppSidebar
            collapsed={false}
            logoSrc={universityLogo}
            logoAlt="Maharaja Sayajirao University of Baroda"
            panelTitle="Admin Panel"
            panelSubtitle="Transcript System"
            navItems={permissionAwareNavItems}
            onLogout={doLogout}
            onNavigate={() => setMobileOpen(false)}
            ariaLabel="Admin sidebar"
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          pageTitle={pageTitle}
          logoSrc={universityLogo}
          logoAlt="Maharaja Sayajirao University of Baroda"
          userName={name}
          userRoleLabel="Admin"
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
