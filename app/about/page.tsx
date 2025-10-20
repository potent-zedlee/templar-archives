import Link from "next/link"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  Database,
  Search,
  Users,
  Zap,
  Shield,
  Globe,
  TrendingUp,
  Brain,
  FileText,
  Play,
} from "lucide-react"

export default function AboutPage() {
  const features = [
    {
      icon: Video,
      title: "AI Video Analysis",
      description:
        "Powered by Claude Vision API, automatically extracts hand history from poker videos with 95%+ accuracy.",
    },
    {
      icon: Database,
      title: "Comprehensive Archive",
      description:
        "Store and organize hands from major tournaments (WSOP, EPT, Triton) and cash game streams.",
    },
    {
      icon: Search,
      title: "Advanced Search",
      description:
        "30+ search filters including AI natural language queries. Find specific hands in seconds.",
    },
    {
      icon: Users,
      title: "Player Profiles",
      description:
        "Track stats for thousands of players. Claim your own profile and showcase your achievements.",
    },
    {
      icon: Brain,
      title: "Hand Review Forum",
      description:
        "Discuss strategy, analyze hands, and learn from the community in Reddit-style forums.",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description:
        "GDPR, CCPA, and PIPL compliant. Your data is encrypted and secure.",
    },
  ]

  const techStack = [
    { name: "Next.js 15", logo: "⚡" },
    { name: "React 19", logo: "⚛️" },
    { name: "Supabase", logo: "🔥" },
    { name: "Claude AI", logo: "🤖" },
    { name: "Tailwind CSS", logo: "🎨" },
    { name: "TypeScript", logo: "📘" },
  ]

  const stats = [
    { value: "10,000+", label: "Hands Archived" },
    { value: "500+", label: "Players Tracked" },
    { value: "50+", label: "Tournaments" },
    { value: "95%", label: "AI Accuracy" },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="container max-w-6xl mx-auto py-16 px-4 md:px-6">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4" variant="outline">
            Est. 2024
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Templar Archives
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The ultimate poker hand history archive. Powered by AI, built for players.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/search">
              <Button size="lg" className="gap-2">
                <Search className="h-5 w-5" />
                Search Hands
              </Button>
            </Link>
            <Link href="/archive">
              <Button size="lg" variant="outline" className="gap-2">
                <FileText className="h-5 w-5" />
                Browse Archive
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6 text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Mission */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            To make poker hand history universally accessible by converting every poker video
            into searchable, analyzable data. We believe that learning from real-world hands
            is the fastest path to improving your game.
          </p>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className="p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">1. Upload or Link Video</h3>
              <p className="text-sm text-muted-foreground">
                Provide a YouTube URL or upload a video file from your device.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">2. AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Claude Vision analyzes frames to extract hand details: cards, actions, pot sizes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">3. Search & Learn</h3>
              <p className="text-sm text-muted-foreground">
                Access hand history, watch video clips, analyze patterns, and improve your game.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Built With</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech) => (
              <Card
                key={tech.name}
                className="px-6 py-3 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">{tech.logo}</span>
                <span className="font-medium">{tech.name}</span>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            All open-source technologies. See our{" "}
            <Link href="/legal/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            for license information.
          </p>
        </div>

        {/* CTA Section */}
        <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-purple-600/5 border-primary/20">
          <h2 className="text-3xl font-bold mb-4">Start Analyzing Hands Today</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of players using Templar Archives to study poker hands from the world's best tournaments and cash games.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                Sign Up Free
              </Button>
            </Link>
            <Link href="/search">
              <Button size="lg" variant="outline" className="gap-2">
                <Search className="h-5 w-5" />
                Explore Hands
              </Button>
            </Link>
          </div>
        </Card>

        {/* Contact */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold mb-4">Questions or Feedback?</h3>
          <p className="text-muted-foreground mb-6">
            We'd love to hear from you. Get in touch via email or GitHub.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="mailto:hello@templararchives.com">
              <Button variant="outline" size="sm">
                Email Us
              </Button>
            </a>
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                GitHub
              </Button>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
