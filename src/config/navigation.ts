export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles?: string[];
}

export const navigation: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    ],
  },
  {
    title: "Case Management",
    items: [
      { title: "All Cases", href: "/dashboard/cases", icon: "FolderOpen" },
      { title: "New Case", href: "/dashboard/cases/new", icon: "PlusCircle" },
      { title: "Hearings", href: "/dashboard/hearings", icon: "Calendar" },
    ],
  },
  {
    title: "Justice Process",
    items: [
      { title: "Investigations", href: "/dashboard/investigations", icon: "Search", roles: ["system_administrator", "police_officer", "oc_station", "dpc", "dpp_prosecutor"] },
      { title: "Evidence", href: "/dashboard/evidence", icon: "FileSearch" },
      { title: "Bail Applications", href: "/dashboard/bail", icon: "Handshake" },
      { title: "Appeals", href: "/dashboard/appeals", icon: "Scale" },
      { title: "Detention", href: "/dashboard/detention", icon: "Building2", roles: ["system_administrator", "prison_officer", "high_court_judge", "chief_magistrate", "magistrate_grade_i", "magistrate_grade_ii"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Courts", href: "/dashboard/courts", icon: "Landmark", roles: ["system_administrator", "registrar"] },
      { title: "Users", href: "/dashboard/users", icon: "Users", roles: ["system_administrator", "registrar"] },
      { title: "Roles", href: "/dashboard/roles", icon: "Shield", roles: ["system_administrator"] },
      { title: "Documents", href: "/dashboard/documents", icon: "FileText" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { title: "Reports", href: "/dashboard/reports", icon: "BarChart3" },
      { title: "Audit Logs", href: "/dashboard/audit-logs", icon: "History", roles: ["system_administrator"] },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Settings", href: "/dashboard/settings", icon: "Settings", roles: ["system_administrator"] },
      { title: "Notifications", href: "/dashboard/notifications", icon: "Bell" },
    ],
  },
];
