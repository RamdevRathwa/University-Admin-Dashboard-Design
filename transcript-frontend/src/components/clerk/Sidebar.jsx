import { NavLink } from "react-router-dom";
import universityLogo from "../../assets/university-logo.png";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { LayoutDashboard, FileCheck2, ClipboardList, FileText, CornerDownLeft, Settings, LogOut } from "lucide-react";

const baseItems = [
  { name: "Dashboard Home", path: "/clerk/dashboard", icon: LayoutDashboard },
  { name: "Transcript Requests", path: "/clerk/requests", icon: FileText },
  { name: "Student Academic Verification", path: "/clerk/verification", icon: FileCheck2 },
  { name: "Enter Grades", path: "/clerk/grades", icon: ClipboardList },
  { name: "Rejected / Returned", path: "/clerk/rejected", icon: CornerDownLeft },
  { name: "Settings", path: "/clerk/settings", icon: Settings },
];

export default function Sidebar({ collapsed, onLogout, onNavigate, navItems }) {
  const items = Array.isArray(navItems) && navItems.length ? navItems : baseItems;
  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 flex flex-col sticky top-0 h-screen ${
        collapsed ? "w-20" : "w-72"
      }`}
      aria-label="Clerk sidebar"
    >
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-10 w-10 object-contain" />
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">Clerk Panel</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">Transcript System</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        <nav className="space-y-1">
          {items.map((it) => (
            <NavItem key={it.path} item={it} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-slate-800">
        <Button variant="destructive" className={`w-full ${collapsed ? "px-0" : ""}`} onClick={onLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          {collapsed ? null : "Logout"}
        </Button>
        {collapsed ? null : <Separator className="mt-3" />}
      </div>
    </aside>
  );
}

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]",
          isActive
            ? "bg-blue-50 text-[#1e40af] dark:bg-slate-800 dark:text-sky-300"
            : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100",
          collapsed ? "justify-center" : "",
        ].join(" ")
      }
      aria-label={collapsed ? item.name : undefined}
      title={collapsed ? item.name : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {collapsed ? null : <span className="truncate">{item.name}</span>}
    </NavLink>
  );
}
