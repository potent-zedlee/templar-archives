"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Shield, Users, LayoutDashboard, FileText, Edit, Bookmark, Newspaper, Radio, Folder, Archive } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types/profile"

interface HeaderUserMenuProps {
  user: SupabaseUser
  profile: Profile | null
  isUserAdmin: boolean
  isUserReporter: boolean
  onSignOut: () => void
  getUserInitials: () => string
  getDisplayName: () => string
  getAvatarUrl: () => string | undefined
}

export function HeaderUserMenu({
  user,
  profile,
  isUserAdmin,
  isUserReporter,
  onSignOut,
  getUserInitials,
  getDisplayName,
  getAvatarUrl,
}: HeaderUserMenuProps) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hidden md:inline-flex outline-none">
        <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
          <AvatarFallback>{getUserInitials()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/bookmarks")}>
          <Bookmark className="mr-2 h-4 w-4" />
          Bookmarks
        </DropdownMenuItem>
        {isUserReporter && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              REPORTER MENU
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push("/reporter/news")}>
              <Newspaper className="mr-2 h-4 w-4" />
              My News
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/reporter/live")}>
              <Radio className="mr-2 h-4 w-4" />
              My Live Reports
            </DropdownMenuItem>
          </>
        )}
        {isUserAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              ADMIN MENU
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/users")}>
              <Users className="mr-2 h-4 w-4" />
              Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/claims")}>
              <Shield className="mr-2 h-4 w-4" />
              Claims
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/content")}>
              <FileText className="mr-2 h-4 w-4" />
              Content
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/edit-requests")}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Requests
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/archive")}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/categories")}>
              <Folder className="mr-2 h-4 w-4" />
              Categories
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
