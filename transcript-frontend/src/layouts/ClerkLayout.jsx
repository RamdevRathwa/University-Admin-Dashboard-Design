import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/clerk/Sidebar";
import Header from "../components/clerk/Header";
import { Sheet, SheetContent } from "../components/ui/sheet";
import { clerkDashboardService } from "../services/clerkDashboardService";
import {
  LayoutDashboard,
  FileCheck2,
  ClipboardList,
  FileText,
  CornerDownLeft,
  Settings,
  Users,
  Shield,
  Building2,
  BookOpen,
  GraduationCap,
  CreditCard,
  ScrollText,
  Sliders,
} from "lucide-react";

const baseItems = [
  { name: "Dashboard Home", path: "/clerk/dashboard", icon: LayoutDashboard },
  { name: "Transcript Requests", path: "/clerk/requests", icon: FileText },
  { name: "Student Academic Verification", path: "/clerk/verification", icon: FileCheck2 },
  { name: "Enter Grades", path: "/clerk/grades", icon: ClipboardList },
  { name: "Rejected / Returned", path: "/clerk/rejected", icon: CornerDownLeft },
  { name: "Settings", path: "/clerk/settings", icon: Settings },
];

const moduleItems = [
  { name: "User Management", path: "/clerk/modules/users", icon: Users, permission: "users.manage" },
  { name: "Role Management", path: "/clerk/modules/roles", icon: Shield, permission: "roles.manage" },
  { name: "Faculty & Departments", path: "/clerk/modules/faculty", icon: Building2, permission: "institution.manage" },
  { name: "Program & Curriculum", path: "/clerk/modules/curriculum", icon: BookOpen, permission: "curriculum.manage" },
  { name: "Grading Scheme", path: "/clerk/modules/grading", icon: GraduationCap, permission: "grading.manage" },
  { name: "Transcript Records", path: "/clerk/modules/transcripts", icon: FileText, permission: "transcripts.view" },
  { name: "Payments", path: "/clerk/modules/payments", icon: CreditCard, permission: "payments.view" },
  { name: "Audit Logs", path: "/clerk/modules/audit", icon: ScrollText, permission: "audit.view" },
  { name: "System Settings", path: "/clerk/modules/settings", icon: Sliders, permission: "settings.manage" },
];

export default function ClerkLayout() {
  const { user, logout, permissions, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const clerkName = user?.fullName || "Clerk";

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/clerk/modules/users")) return "User Management";
    if (path.includes("/clerk/modules/roles")) return "Role Management";
    if (path.includes("/clerk/modules/faculty")) return "Faculty & Department Management";
    if (path.includes("/clerk/modules/curriculum")) return "Program & Curriculum";
    if (path.includes("/clerk/modules/grading")) return "Grading Scheme";
    if (path.includes("/clerk/modules/transcripts")) return "Transcript Records";
    if (path.includes("/clerk/modules/payments")) return "Payments";
    if (path.includes("/clerk/modules/audit")) return "Audit Logs";
    if (path.includes("/clerk/modules/settings")) return "System Settings";
    if (path.includes("/clerk/verification")) return "Student Academic Verification";
    if (path.includes("/clerk/grades")) return "Enter Grades";
    if (path.includes("/clerk/requests")) return "Transcript Requests";
    if (path.includes("/clerk/rejected")) return "Rejected / Returned Requests";
    if (path.includes("/clerk/settings")) return "Settings";
    return "Dashboard Home";
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const permissionModuleItems = useMemo(() => {
    if (!Array.isArray(permissions) || permissions.length === 0) return [];
    return moduleItems.filter((item) => hasPermission(item.permission));
  }, [hasPermission, permissions]);

  const sidebarItems = useMemo(() => [...baseItems, ...permissionModuleItems], [permissionModuleItems]);

  useEffect(() => {
    let alive = true;

    const buildNotifications = (data) => {
      const stats = data?.stats || {};
      const items = [];

      if ((stats.pendingVerifications || 0) > 0) {
        items.push({
          id: "pending-verifications",
          title: `${stats.pendingVerifications} pending verification request(s)`,
          when: "Needs clerk review",
          path: "/clerk/verification",
        });
      }

      if ((stats.pendingGradeEntry || 0) > 0) {
        items.push({
          id: "pending-grade-entry",
          title: `${stats.pendingGradeEntry} request(s) waiting for grade entry`,
          when: "Ready for marks entry",
          path: "/clerk/grades",
        });
      }

      if ((stats.rejectedRequests || 0) > 0) {
        items.push({
          id: "rejected-requests",
          title: `${stats.rejectedRequests} rejected/returned request(s)`,
          when: "Requires follow-up",
          path: "/clerk/rejected",
        });
      }

      (data?.activities || []).slice(0, 4).forEach((a) => {
        items.push({
          id: `activity-${a.id}`,
          title: a.text || "Recent activity",
          when: a.at ? new Date(a.at).toLocaleString("en-IN") : "",
          path: "/clerk/dashboard",
        });
      });

      const unread = Math.max(0, (stats.pendingVerifications || 0) + (stats.pendingGradeEntry || 0) + (stats.rejectedRequests || 0));

      return {
        count: unread,
        items,
      };
    };

    const load = async () => {
      try {
        const data = await clerkDashboardService.get();
        if (!alive) return;
        const built = buildNotifications(data);
        setNotificationsCount(built.count);
        setNotifications(built.items);
      } catch {
        if (!alive) return;
        setNotificationsCount(0);
        setNotifications([]);
      }
    };

    load();
    const id = window.setInterval(load, 30000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onLogout={handleLogout} navItems={sidebarItems} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[320px]">
          <Sidebar collapsed={false} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} navItems={sidebarItems} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          pageTitle={pageTitle}
          clerkName={clerkName}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onLogout={handleLogout}
          onOpenMobileMenu={() => setMobileOpen(true)}
          notificationsCount={notificationsCount}
          notifications={notifications}
          onNotificationSelect={(path) => {
            if (!path) return;
            navigate(path);
          }}
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
