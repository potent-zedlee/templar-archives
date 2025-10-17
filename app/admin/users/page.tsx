"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Ban,
  Shield,
  MoreVertical,
  UserX,
  UserCheck
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import {
  isAdmin,
  getUsers,
  banUser,
  unbanUser,
  changeUserRole,
  type AdminRole
} from "@/lib/admin"
import { toast } from "sonner"
import Link from "next/link"

type User = {
  id: string
  nickname: string
  email: string
  avatar_url?: string
  role: AdminRole
  is_banned: boolean
  ban_reason?: string
  created_at: string
  posts_count: number
  comments_count: number
}

export default function usersClient() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<AdminRole | "all">("all")
  const [bannedFilter, setBannedFilter] = useState<"all" | "banned" | "active">("all")

  // Ban dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [banReason, setBanReason] = useState("")
  const [banning, setBanning] = useState(false)

  // Role dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState<AdminRole>("user")
  const [changingRole, setChangingRole] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [user])

  useEffect(() => {
    if (hasAccess) {
      loadUsers()
    }
  }, [hasAccess, currentPage, searchQuery, roleFilter, bannedFilter])

  async function checkAccess() {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        toast.error("Admin privileges required")
        router.push("/")
        return
      }

      setHasAccess(true)
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("Error checking permissions")
      router.push("/")
    }
  }

  async function loadUsers() {
    try {
      setLoading(true)
      const result = await getUsers({
        page: currentPage,
        limit: 20,
        role: roleFilter === "all" ? undefined : roleFilter,
        banned: bannedFilter === "all" ? undefined : bannedFilter === "banned",
        search: searchQuery || undefined
      })

      setUsers(result.users as User[])
      setTotalPages(result.totalPages)
    } catch (error) {
      console.error("Error loading users:", error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  async function handleBanUser() {
    if (!selectedUser || !user) return

    if (!banReason.trim()) {
      toast.error("Please enter ban reason")
      return
    }

    setBanning(true)
    try {
      await banUser(selectedUser.id, banReason, user.id)
      toast.success(`${selectedUser.nickname} has been banned`)
      setBanDialogOpen(false)
      setBanReason("")
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      console.error("Error banning user:", error)
      toast.error("Failed to ban user")
    } finally {
      setBanning(false)
    }
  }

  async function handleUnbanUser(targetUser: User) {
    if (!user) return

    try {
      await unbanUser(targetUser.id, user.id)
      toast.success(`${targetUser.nickname} has been unbanned`)
      loadUsers()
    } catch (error) {
      console.error("Error unbanning user:", error)
      toast.error("Failed to unban user")
    }
  }

  async function handleChangeRole() {
    if (!selectedUser || !user) return

    setChangingRole(true)
    try {
      console.log('Changing role:', {
        userId: selectedUser.id,
        newRole,
        adminId: user.id
      })
      await changeUserRole(selectedUser.id, newRole, user.id)
      toast.success(`User role changed to ${newRole}`)
      setRoleDialogOpen(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (error: any) {
      console.error("Error changing user role:", error)
      console.error("Error details:", error.message, error.code)
      toast.error(`Failed to change role: ${error.message || 'Unknown error'}`)
    } finally {
      setChangingRole(false)
    }
  }

  function openBanDialog(targetUser: User) {
    setSelectedUser(targetUser)
    setBanReason("")
    setBanDialogOpen(true)
  }

  function openRoleDialog(targetUser: User) {
    setSelectedUser(targetUser)
    setNewRole(targetUser.role)
    setRoleDialogOpen(true)
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-8 px-4">
          <CardSkeleton count={4} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-title-lg mb-2">User Management</h1>
            <p className="text-body text-muted-foreground">
              View and manage all users
            </p>
          </div>
          <Link href="/admin/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by nickname or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as AdminRole | "all")
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Role Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="high_templar">High Templar</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={bannedFilter}
              onValueChange={(value) => {
                setBannedFilter(value as "all" | "banned" | "active")
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Users List */}
        {loading ? (
          <CardSkeleton count={5} />
        ) : users.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-body text-muted-foreground">
              No users match the criteria
            </p>
          </Card>
        ) : (
          <div className="space-y-4 mb-6">
            {users.map((targetUser) => (
              <Card key={targetUser.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={targetUser.avatar_url} />
                      <AvatarFallback>
                        {targetUser.nickname.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-body font-semibold">
                          {targetUser.nickname}
                        </h3>
                        <Badge variant={
                          targetUser.role === "admin" ? "default" :
                          targetUser.role === "high_templar" ? "secondary" :
                          "outline"
                        }>
                          {targetUser.role === "admin" ? "Admin" :
                           targetUser.role === "high_templar" ? "High Templar" :
                           "User"}
                        </Badge>
                        {targetUser.is_banned && (
                          <Badge variant="destructive">Banned</Badge>
                        )}
                      </div>
                      <p className="text-caption text-muted-foreground mb-1">
                        {targetUser.email}
                      </p>
                      <div className="flex gap-4 text-caption text-muted-foreground">
                        <span>Posts {targetUser.posts_count}</span>
                        <span>Comments {targetUser.comments_count}</span>
                        <span>Joined: {new Date(targetUser.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>
                      {targetUser.is_banned && targetUser.ban_reason && (
                        <p className="text-caption text-destructive mt-1">
                          Ban reason: {targetUser.ban_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/profile/${targetUser.id}`}>
                          View Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openRoleDialog(targetUser)}>
                        <Shield className="h-4 w-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      {targetUser.is_banned ? (
                        <DropdownMenuItem onClick={() => handleUnbanUser(targetUser)}>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Unban
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => openBanDialog(targetUser)}
                          className="text-destructive"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Ban User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-body">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {selectedUser?.nickname}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Ban Reason *</Label>
              <Textarea
                id="ban-reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter the reason for banning..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanUser}
              disabled={banning || !banReason.trim()}
            >
              {banning ? "Processing..." : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change role for {selectedUser?.nickname}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-role">New Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as AdminRole)}>
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="high_templar">High Templar</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={changingRole}>
              {changingRole ? "Processing..." : "Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
