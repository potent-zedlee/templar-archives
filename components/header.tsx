"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Moon, Sun, Menu, X, User, LogOut, Shield, Users, LayoutDashboard, FileText, Edit, Bookmark, ChevronDown, Newspaper, Radio, Folder } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/components/auth-provider"
import { signOut } from "@/lib/auth"
import { isAdmin, isReporterOrAdmin } from "@/lib/admin"
import { NotificationBell } from "@/components/notification-bell"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, profile, loading: authLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [isUserReporter, setIsUserReporter] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const adminStatus = await isAdmin(user.id)
        setIsUserAdmin(adminStatus)
      } else {
        setIsUserAdmin(false)
      }
    }
    checkAdmin()
  }, [user])

  useEffect(() => {
    async function checkReporter() {
      if (user) {
        const reporterStatus = await isReporterOrAdmin(user.id)
        setIsUserReporter(reporterStatus)
      } else {
        setIsUserReporter(false)
      }
    }
    checkReporter()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const getUserInitials = () => {
    if (profile?.nickname) {
      return profile.nickname.charAt(0).toUpperCase()
    }
    if (!user?.user_metadata?.full_name && !user?.email) return "U"
    const name = user.user_metadata?.full_name || user.email
    return name.charAt(0).toUpperCase()
  }

  const getDisplayName = () => {
    if (profile?.nickname) return profile.nickname
    return user?.user_metadata?.full_name || "User"
  }

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url
    return user?.user_metadata?.avatar_url
  }

  const navLinks = [
    { href: "/about", label: "ABOUT" },
    { href: "/news", label: "NEWS" },
    { href: "/live-reporting", label: "LIVE" },
    {
      label: "ARCHIVE",
      subItems: [
        { href: "/search", label: "Search" },
        { href: "/archive/tournament", label: "Tournament" },
        { href: "/archive/cash-game", label: "Cash Game" },
      ]
    },
    { href: "/players", label: "PLAYERS" },
    { href: "/community", label: "FORUM" },
  ]

  return (
    <>
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="banner">
      <div className="container max-w-7xl mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
              <span className="font-mono text-lg font-bold text-primary-foreground">TA</span>
            </div>
            <span className="text-xl font-bold text-foreground">Templar Archives</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="Main navigation">
            {navLinks.map((link, index) => {
              // Check if this link has subItems (dropdown)
              if ('subItems' in link && link.subItems) {
                const isActive = pathname.startsWith("/archive")

                return (
                  <DropdownMenu key={index}>
                    <DropdownMenuTrigger className={cn(
                      "text-sm font-medium transition-colors hover:text-foreground relative inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {link.label}
                      <ChevronDown className="h-3 w-3" />
                      {isActive && (
                        <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {link.subItems.map((subItem) => (
                        <DropdownMenuItem key={subItem.href} asChild>
                          <Link href={subItem.href}>
                            {subItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              }

              // Regular link
              const isActive = pathname === link.href || (pathname !== "/" && pathname.startsWith(link.href!))

              return (
                <Link
                  key={link.href}
                  href={link.href!}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground relative",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}

          {/* Notification Bell */}
          <NotificationBell />

          {/* Login/Profile UI */}
          {!authLoading && (
            <>
              {user ? (
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
                        <DropdownMenuItem onClick={() => router.push("/admin/categories")}>
                          <Folder className="mr-2 h-4 w-4" />
                          Categories
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex"
                  onClick={() => router.push("/auth/login")}
                >
                  LOGIN
                </Button>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background">
          <nav className="container max-w-7xl mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link, index) => {
              // Check if this link has subItems (dropdown)
              if ('subItems' in link && link.subItems) {
                return (
                  <div key={index} className="space-y-1">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                      {link.label}
                    </div>
                    {link.subItems.map((subItem) => {
                      const isActive = pathname === subItem.href || pathname.startsWith(subItem.href)
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "block px-8 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          {subItem.label}
                        </Link>
                      )
                    })}
                  </div>
                )
              }

              // Regular link
              const isActive = pathname === link.href || (pathname !== "/" && pathname.startsWith(link.href!))

              return (
                <Link
                  key={link.href}
                  href={link.href!}
                  onClick={() => setMobileMenuOpen(false)}
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
                        setMobileMenuOpen(false)
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
                        setMobileMenuOpen(false)
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
                            setMobileMenuOpen(false)
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
                            setMobileMenuOpen(false)
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
                            setMobileMenuOpen(false)
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
                            setMobileMenuOpen(false)
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
                            setMobileMenuOpen(false)
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
                            setMobileMenuOpen(false)
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
                            setMobileMenuOpen(false)
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
                            router.push("/admin/categories")
                            setMobileMenuOpen(false)
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
                      onClick={() => {
                        handleSignOut()
                        setMobileMenuOpen(false)
                      }}
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
                      setMobileMenuOpen(false)
                    }}
                  >
                    LOGIN
                  </Button>
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
    </>
  )
}
