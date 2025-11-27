import Link from "next/link"
import {
  Video,
  Database,
  Search,
  Users,
  Zap,
  Shield,
  TrendingUp,
  Brain,
  FileText,
  Play,
  Newspaper,
  Radio,
  Phone,
  Mail,
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
      title: "Dual Archive System",
      description:
        "Separate archives for tournaments (WSOP, EPT, Triton) and cash games (Hustler, Live at the Bike). Organized and searchable.",
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
      icon: Newspaper,
      title: "Poker News",
      description:
        "Stay updated with the latest poker tournament announcements, industry news, and community highlights.",
    },
    {
      icon: Radio,
      title: "Live Reporting",
      description:
        "Real-time tournament updates, live chip counts, and results from ongoing events around the world.",
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
    { name: "Firebase", logo: "🔥" },
    { name: "Claude AI", logo: "🤖" },
    { name: "Tailwind CSS", logo: "🎨" },
    { name: "TypeScript", logo: "📘" },
  ]

  const stats = [
    { value: "10,000+", label: "HANDS ARCHIVED" },
    { value: "500+", label: "PLAYERS TRACKED" },
    { value: "50+", label: "TOURNAMENTS" },
    { value: "95%", label: "AI ACCURACY" },
  ]

  return (
    <div className="min-h-screen bg-black-0">
      <main className="container max-w-6xl mx-auto py-16 px-4 md:px-6">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <span className="text-caption border-2 border-gold-600 px-3 py-1 mb-4 inline-block">
            EST. 2024
          </span>
          <h1 className="text-display-lg mb-6 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 bg-clip-text text-transparent">
            TEMPLAR ARCHIVES INDEX
          </h1>
          <p className="text-body-lg text-text-secondary max-w-4xl mx-auto mb-8 leading-relaxed">
            The ultimate poker hand history archive.{" "}
            <span className="whitespace-nowrap">Powered by AI,</span>{" "}
            <span className="whitespace-nowrap">built for players.</span>
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/search" className="btn-primary">
              <Search className="h-5 w-5 mr-2" />
              SEARCH HANDS
            </Link>
            <Link href="/archive" className="btn-secondary">
              <FileText className="h-5 w-5 mr-2" />
              BROWSE ARCHIVE
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="card-postmodern p-6 text-center">
              <div className="text-heading mb-2 bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent font-mono">
                {stat.value}
              </div>
              <div className="text-caption text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="mb-16 text-center">
          <h2 className="text-heading-lg mb-4">OUR MISSION</h2>
          <p className="text-body text-text-secondary max-w-3xl mx-auto">
            To make poker hand history universally accessible by converting every poker video
            into searchable, analyzable data. We believe that learning from real-world hands
            is the fastest path to improving your game.
          </p>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-heading-lg text-center mb-12">FEATURES</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="card-postmodern p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 border-2 border-gold-600 flex items-center justify-center bg-black-100">
                      <Icon className="h-6 w-6 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="text-caption-lg mb-2">{feature.title.toUpperCase()}</h3>
                      <p className="text-body text-text-muted">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-heading-lg text-center mb-12">HOW IT WORKS</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-gold-600 flex items-center justify-center mx-auto mb-4 bg-black-100">
                <Video className="h-8 w-8 text-gold-400" />
              </div>
              <h3 className="text-caption-lg mb-2">1. UPLOAD OR LINK VIDEO</h3>
              <p className="text-body text-text-muted">
                Provide a YouTube URL or upload a video file from your device.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-gold-600 flex items-center justify-center mx-auto mb-4 bg-black-100">
                <Zap className="h-8 w-8 text-gold-400" />
              </div>
              <h3 className="text-caption-lg mb-2">2. AI ANALYSIS</h3>
              <p className="text-body text-text-muted">
                Claude Vision analyzes frames to extract hand details: cards, actions, pot sizes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-gold-600 flex items-center justify-center mx-auto mb-4 bg-black-100">
                <TrendingUp className="h-8 w-8 text-gold-400" />
              </div>
              <h3 className="text-caption-lg mb-2">3. SEARCH & LEARN</h3>
              <p className="text-body text-text-muted">
                Access hand history, watch video clips, analyze patterns, and improve your game.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-16">
          <h2 className="text-heading-lg text-center mb-8">BUILT WITH</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="card-postmodern px-6 py-3 flex items-center gap-3"
              >
                <span className="text-2xl">{tech.logo}</span>
                <span className="text-caption-lg">{tech.name.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-caption text-text-muted mt-8">
            All open-source technologies. See our{" "}
            <Link href="/legal/terms" className="text-gold-400 hover:text-gold-300">
              Terms of Service
            </Link>{" "}
            for license information.
          </p>
        </div>

        {/* CTA Section */}
        <div className="card-postmodern p-12 text-center border-gold-600">
          <h2 className="text-heading-lg mb-4">START ANALYZING HANDS TODAY</h2>
          <p className="text-body text-text-secondary mb-8 max-w-2xl mx-auto">
            Join thousands of players using Templar Archives Index to study poker hands from the world's best tournaments and cash games.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login" className="btn-primary">
              <Play className="h-5 w-5 mr-2" />
              SIGN UP FREE
            </Link>
            <Link href="/search" className="btn-secondary">
              <Search className="h-5 w-5 mr-2" />
              EXPLORE HANDS
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-16">
          <h2 className="text-heading-lg text-center mb-8">CONTACT US</h2>
          <div className="max-w-2xl mx-auto">
            <div className="card-postmodern p-8">
              <div className="space-y-6">
                {/* Phone */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 border-2 border-gold-600 flex items-center justify-center bg-black-100">
                    <Phone className="h-6 w-6 text-gold-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-caption text-text-muted mb-1">PHONE</div>
                    <a
                      href="tel:+821023007653"
                      className="text-body-lg text-gold-400 hover:text-gold-300 font-mono"
                    >
                      +82 010 2300 7653
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 border-2 border-gold-600 flex items-center justify-center bg-black-100">
                    <Mail className="h-6 w-6 text-gold-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-caption text-text-muted mb-1">EMAIL</div>
                    <a
                      href="mailto:jhng.mov@gmail.com"
                      className="text-body-lg text-gold-400 hover:text-gold-300"
                    >
                      jhng.mov@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-6 border-t-2 border-gold-600">
                <a href="mailto:jhng.mov@gmail.com" className="w-full block">
                  <button className="btn-primary w-full">
                    <Mail className="h-5 w-5 mr-2" />
                    SEND US A MESSAGE
                  </button>
                </a>
              </div>
            </div>

            <p className="text-center text-caption text-text-muted mt-6">
              We typically respond within 24 hours
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
