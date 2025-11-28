"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ThemeValue = "light" | "dark" | "system"

interface ThemeOption {
  value: ThemeValue
  label: string
  icon: React.ReactNode
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  // SSR hydration 이슈 방지
  useEffect(() => {
    setMounted(true)
  }, [])

  // mounted 전에는 placeholder 렌더링 (hydration mismatch 방지)
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground"
        aria-label="테마 변경"
      >
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  const themeOptions: ThemeOption[] = [
    { value: "light", label: "라이트", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "다크", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "시스템", icon: <Monitor className="h-4 w-4" /> },
  ]

  // 현재 표시할 아이콘 결정
  const getCurrentIcon = () => {
    if (theme === "system") {
      return resolvedTheme === "dark"
        ? <Moon className="h-5 w-5" />
        : <Sun className="h-5 w-5" />
    }
    return theme === "dark"
      ? <Moon className="h-5 w-5" />
      : <Sun className="h-5 w-5" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="테마 변경"
        >
          {getCurrentIcon()}
          <span className="sr-only">테마 변경</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              theme === option.value && "bg-accent text-accent-foreground"
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
