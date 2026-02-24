import { NavLink } from "react-router-dom";
import universityLogo from "../../assets/university-logo.png";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

const items = [
  { name: "Dashboard Home", path: "/clerk/dashboard" },
  { name: "Student Academic Verification", path: "/clerk/verification" },
  { name: "Enter Grades", path: "/clerk/grades" },
  { name: "Transcript Requests", path: "/clerk/requests" },
  { name: "Rejected / Returned", path: "/clerk/rejected" },
  { name: "Settings", path: "/clerk/settings" },
];

export default function Sidebar({ collapsed, onLogout, onNavigate }) {
  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col sticky top-0 h-screen ${
        collapsed ? "w-20" : "w-72"
      }`}
      aria-label="Clerk sidebar"
    >
      <div className="p-4 border-b border-gray-200">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-10 w-10 object-contain" />
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Clerk Panel</p>
              <p className="text-xs text-gray-500 truncate">Transcript System</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        <nav className="space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.path}
              to={it.path}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]",
                  isActive ? "bg-blue-50 text-[#1e40af]" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  collapsed ? "justify-center" : "",
                ].join(" ")
              }
            >
              <span className="h-2.5 w-2.5 rounded-full bg-current opacity-60" aria-hidden="true" />
              {collapsed ? null : <span className="truncate">{it.name}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-gray-200">
        <Button variant="destructive" className={`w-full ${collapsed ? "px-0" : ""}`} onClick={onLogout}>
          {collapsed ? "Out" : "Logout"}
        </Button>
        {collapsed ? null : <Separator className="mt-3" />}
      </div>
    </aside>
  );
}
