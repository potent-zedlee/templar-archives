"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Settings, Cookie, Shield, BarChart3 } from "lucide-react"
import type { CookieConsent } from "./CookieConsentBanner"

const CONSENT_KEY = "cookie-consent"

interface CookieSettingsDialogProps {
  children?: React.ReactNode
}

export function CookieSettingsDialog({ children }: CookieSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [essential, setEssential] = useState(true) // Always true
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    if (open) {
      // Load current settings
      const savedConsent = localStorage.getItem(CONSENT_KEY)
      if (savedConsent) {
        try {
          const consent: CookieConsent = JSON.parse(savedConsent)
          setAnalytics(consent.analytics)
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [open])

  const handleSave = () => {
    const consent: CookieConsent = {
      essential: true,
      analytics,
      timestamp: Date.now(),
    }
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
    setOpen(false)

    // Reload to apply changes
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Cookie Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            Cookie Preferences
          </DialogTitle>
          <DialogDescription>
            Manage your cookie preferences. Changes will take effect after saving and reloading the page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Essential Cookies */}
          <Card className="p-4 border-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Essential Cookies</h3>
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                    Required
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  These cookies are necessary for the website to function and cannot be disabled.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Authentication (login/logout)</li>
                  <li>• Security (CSRF protection)</li>
                  <li>• Preferences (theme, language)</li>
                  <li>• Session management</li>
                </ul>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Switch checked={essential} disabled aria-label="Essential cookies (always enabled)" />
                <Label className="text-xs text-center">Always On</Label>
              </div>
            </div>
          </Card>

          {/* Analytics Cookies */}
          <Card className="p-4 border-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Analytics Cookies</h3>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Help us understand how visitors use our website to improve user experience.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Page views and navigation patterns</li>
                  <li>• Performance metrics (load times)</li>
                  <li>• Device and browser information</li>
                  <li>• Feature usage statistics</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Providers:</strong> Vercel Analytics
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Switch
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                  aria-label="Analytics cookies"
                />
                <Label className="text-xs text-center">
                  {analytics ? "Enabled" : "Disabled"}
                </Label>
              </div>
            </div>
          </Card>

          {/* Third-Party Cookies Info */}
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold text-sm mb-2">Third-Party Cookies</h3>
            <p className="text-xs text-muted-foreground mb-2">
              When you interact with embedded content, third parties may set cookies:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                • <strong>YouTube:</strong> Video playback (controlled by YouTube)
              </li>
              <li>
                • <strong>Google OAuth:</strong> Authentication (controlled by Google)
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              These cookies are set by external services and cannot be controlled through this dialog.
              Visit their privacy policies to manage these cookies.
            </p>
          </Card>
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAnalytics(false)
                handleSave()
              }}
            >
              Reject All Optional
            </Button>
            <Button onClick={handleSave}>Save Preferences</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
