"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Link from "next/link"

const CONSENT_KEY = "cookie-consent"
const CONSENT_EXPIRY = 365 * 24 * 60 * 60 * 1000 // 1 year

export interface CookieConsent {
  essential: boolean // Always true
  analytics: boolean
  timestamp: number
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [isEU, setIsEU] = useState(false)

  useEffect(() => {
    // Check if consent already given
    const savedConsent = localStorage.getItem(CONSENT_KEY)
    if (savedConsent) {
      try {
        const consent: CookieConsent = JSON.parse(savedConsent)
        // Check if consent expired (1 year)
        if (Date.now() - consent.timestamp < CONSENT_EXPIRY) {
          return // Don't show banner
        }
      } catch (e) {
        // Invalid consent, show banner
      }
    }

    // Detect EU user (simplified - in production use geo-location API)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const euTimezones = [
      "Europe/",
      "Africa/Ceuta",
      "Atlantic/Azores",
      "Atlantic/Canary",
      "Atlantic/Madeira",
    ]
    const isEUUser = euTimezones.some((tz) => timezone.startsWith(tz))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsEU(isEUUser)

    // Show banner after short delay
    const timer = setTimeout(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBanner(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const saveConsent = (consent: CookieConsent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
    setShowBanner(false)

    // Reload to apply analytics (if accepted)
    if (consent.analytics) {
      window.location.reload()
    }
  }

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      timestamp: Date.now(),
    })
  }

  const handleRejectAll = () => {
    saveConsent({
      essential: true,
      analytics: false,
      timestamp: Date.now(),
    })
  }

  const handleEssentialOnly = () => {
    saveConsent({
      essential: true,
      analytics: false,
      timestamp: Date.now(),
    })
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
      <div className="container max-w-4xl mx-auto pointer-events-auto">
        <Card className="p-6 shadow-2xl border-2 bg-background/95 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Cookie Consent</h3>
                {isEU && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                    EU User
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                We use cookies to enhance your experience. Essential cookies are required for the site to function.
                Analytics cookies help us improve our service. You can customize your preferences at any time.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleAcceptAll} size="sm" className="flex-1 sm:flex-none">
                  Accept All
                </Button>
                {isEU && (
                  <Button
                    onClick={handleRejectAll}
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    Reject All
                  </Button>
                )}
                <Button
                  onClick={handleEssentialOnly}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Essential Only
                </Button>
                <Link href="/legal/cookies" className="flex-1 sm:flex-none">
                  <Button variant="ghost" size="sm" className="w-full">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={handleEssentialOnly}
              aria-label="Close banner (Essential cookies only)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Hook to check if user has consented
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_KEY)
    if (savedConsent) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConsent(JSON.parse(savedConsent))
      } catch (e) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConsent(null)
      }
    }
  }, [])

  return consent
}
