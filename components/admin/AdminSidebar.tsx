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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Users,
  Archive,
  FileCheck,
  ShieldAlert,
  Settings,
  Newspaper,
  Radio,
  Activity,
  History,
  Workflow,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface MenuItem {
  title: string
  href: string
  icon: LucideIcon
  subItems?: {
    title: string
    href: string
    icon: LucideIcon
  }[]
}

const adminMenuItems: MenuItem[] = [
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
    subItems: [
      {
        title: "파이프라인",
        href: "/admin/archive/pipeline",
        icon: Workflow,
      },
    ],
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

const kanMenuItems = [
  {
    title: "진행 중 작업",
    href: "/admin/kan/active",
    icon: Activity,
  },
  {
    title: "분석 기록",
    href: "/admin/kan/history",
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
                    {/* Sub Items */}
                    {item.subItems && item.subItems.length > 0 && (
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon
                          return (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                              >
                                <Link href={subItem.href}>
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* KAN Analysis Section */}
        <SidebarGroup>
          <SidebarGroupLabel>KAN Analysis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {kanMenuItems.map((item) => {
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
