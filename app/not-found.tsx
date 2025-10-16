"use client"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        <h1 className="text-title-lg mb-4">
          Page Not Found
        </h1>

        <p className="text-body text-muted-foreground mb-8">
          The page you requested does not exist or has been moved.
        </p>

        <div className="flex gap-3">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>

          <Link href="/" className="flex-1">
            <Button variant="default" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>

        <p className="text-caption text-muted-foreground mt-6">
          404 - Not Found
        </p>
      </Card>
    </div>
  )
}
