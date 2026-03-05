import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/clerk/Sidebar";
import Header from "../components/clerk/Header";
import { Sheet, SheetContent } from "../components/ui/sheet";

export default function ClerkLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const clerkName = user?.fullName || "Clerk";

  const pageTitle = useMemo(() => {
    const path = location.pathname;
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

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onLogout={handleLogout} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[320px]">
          <Sidebar collapsed={false} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          pageTitle={pageTitle}
          clerkName={clerkName}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onLogout={handleLogout}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <div className="p-4 sm:p-6 lg:p-8 animate-fadeIn">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>
    </div>
  );
}
