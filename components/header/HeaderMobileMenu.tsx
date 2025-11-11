"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { User, LogOut, Shield, Users, LayoutDashboard, FileText, Edit, Bookmark, ChevronDown, Newspaper, Radio, Folder, Archive } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types/profile"
import type { NavLink } from "./HeaderDesktopNav"

interface HeaderMobileMenuProps {
  isOpen: boolean
  onClose: () => void
  navLinks: NavLink[]
  user: SupabaseUser | null
  profile: Profile | null
  isUserAdmin: boolean
  isUserReporter: boolean
  authLoading: boolean
  onSignOut: () => void
  getUserInitials: () => string
  getDisplayName: () => string
  getAvatarUrl: () => string | undefined
}

export function HeaderMobileMenu({
  isOpen,
  onClose,
  navLinks,
  user,
  profile,
  isUserAdmin,
  isUserReporter,
  authLoading,
  onSignOut,
  getUserInitials,
  getDisplayName,
  getAvatarUrl,
}: HeaderMobileMenuProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [archiveExpandedMobile, setArchiveExpandedMobile] = useState(false)

  if (!isOpen) return null

  const handleSignOut = () => {
    onSignOut()
    onClose()
  }

  return (
    <div className="md:hidden border-b border-border bg-background">
      <nav className="container max-w-7xl mx-auto px-4 py-4 space-y-2">
        {navLinks.map((link, index) => {
          // Check if this link has subItems (accordion)
          if ('subItems' in link && link.subItems) {
            const isActive = pathname.startsWith("/archive") ||
                           pathname.startsWith("/search")

            return (
              <div key={index} className="space-y-1">
                <button
                  onClick={() => setArchiveExpandedMobile(!archiveExpandedMobile)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>{link.label}</span>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    archiveExpandedMobile && "rotate-180"
                  )} />
                </button>

                <AnimatePresence>
                  {archiveExpandedMobile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 space-y-1 pt-1">
                        {link.subItems.map((subItem) => {
                          const subIsActive = pathname === subItem.href ||
                                            pathname.startsWith(subItem.href)
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={onClose}
                              className={cn(
                                "block px-8 py-2 rounded-md text-sm font-medium transition-colors",
                                subIsActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              )}
                            >
                              {subItem.label}
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          // Regular link
          const isActive = pathname === link.href || (pathname !== "/" && pathname.startsWith(link.href!))

          return (
            <Link
              key={link.href}
              href={link.href!}
              onClick={onClose}
              className={cn(
                "block px-4 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {link.label}
            </Link>
          )
        })}

        {/* Mobile Login/Profile UI */}
        {!authLoading && (
          <>
            {user ? (
              <div className="mt-4 space-y-2">
                <div className="px-4 py-2 border-t border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-4"
                  onClick={() => {
                    router.push("/profile")
                    onClose()
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-4"
                  onClick={() => {
                    router.push("/bookmarks")
                    onClose()
                  }}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Bookmarks
                </Button>
                {isUserReporter && (
                  <>
                    <div className="px-4 py-2 text-xs text-muted-foreground font-semibold">
                      REPORTER MENU
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/reporter/news")
                        onClose()
                      }}
                    >
                      <Newspaper className="mr-2 h-4 w-4" />
                      My News
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/reporter/live")
                        onClose()
                      }}
                    >
                      <Radio className="mr-2 h-4 w-4" />
                      My Live Reports
                    </Button>
                  </>
                )}
                {isUserAdmin && (
                  <>
                    <div className="px-4 py-2 text-xs text-muted-foreground font-semibold">
                      ADMIN MENU
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/admin/dashboard")
                        onClose()
                      }}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/admin/users")
                        onClose()
                      }}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Users
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/admin/claims")
                        onClose()
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Claims
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/admin/content")
                        onClose()
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Content
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/admin/edit-requests")
                        onClose()
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Requests
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/admin/archive")
                        onClose()
                      }}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4"
                      onClick={() => {
                        router.push("/admin/categories")
                        onClose()
                      }}
                    >
                      <Folder className="mr-2 h-4 w-4" />
                      Categories
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-4"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => {
                  router.push("/auth/login")
                  onClose()
                }}
              >
                LOGIN
              </Button>
            )}
          </>
        )}
      </nav>
    </div>
  )
}
