"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Users,
  Archive,
  FileCheck,
  ShieldAlert,
  Settings,
  Video,
  Newspaper,
  Radio,
  Sparkles,
  Activity,
  History,
} from "lucide-react"

const adminMenuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Archive",
    href: "/admin/archive",
    icon: Archive,
  },
  {
    title: "Edit Requests",
    href: "/admin/edit-requests",
    icon: FileCheck,
  },
  {
    title: "Claims",
    href: "/admin/claims",
    icon: ShieldAlert,
  },
  {
    title: "Content",
    href: "/admin/content",
    icon: Settings,
  },
]

const haeMenuItems = [
  {
    title: "새 분석 요청",
    href: "/admin/hae/new",
    icon: Sparkles,
  },
  {
    title: "진행 중 작업",
    href: "/admin/hae/active",
    icon: Activity,
  },
  {
    title: "분석 기록",
    href: "/admin/hae/history",
    icon: History,
  },
]

const reporterMenuItems = [
  {
    title: "News",
    href: "/reporter/news",
    icon: Newspaper,
  },
  {
    title: "Live Reports",
    href: "/reporter/live",
    icon: Radio,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <Sidebar>
      <SidebarContent>
        {/* Admin Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* HAE Analysis Section */}
        <SidebarGroup>
          <SidebarGroupLabel>HAE Analysis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {haeMenuItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reporter Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Reporting</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reporterMenuItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Link
          href="/"
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Public Site
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}
