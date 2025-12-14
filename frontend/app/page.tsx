"use client";

import Link from "next/link";
import { Circle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";

export default function Home() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 bg-grid-pattern opacity-30" />

      {/* Gradient Mesh Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Primary gradient orb - top center */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/8 dark:bg-primary/5 rounded-full blur-[120px]" />
        {/* Secondary gradient orb - bottom left */}
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/6 dark:bg-blue-400/4 rounded-full blur-[100px]" />
        {/* Accent gradient orb - right side */}
        <div className="absolute top-1/3 right-[-5%] w-[400px] h-[400px] bg-violet-500/5 dark:bg-violet-400/3 rounded-full blur-[80px]" />
      </div>

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border/30">
        <nav className="landing-container flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-lg font-bold tracking-tight text-foreground">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-primary/5 rounded-lg border border-primary/10">
              <Circle className="w-4 h-4 text-primary fill-primary/20" />
            </div>
            BITS-GPT
          </Link>
          <div className="flex items-center gap-3">
            {mounted && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
            <Link href="/login">
              <Button variant="outline" size="sm" className="font-medium text-foreground border-foreground/20 hover:bg-foreground hover:text-background transition-all">
                Sign in
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="landing-hero landing-section relative">
        <div className="landing-container text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-10 text-sm font-medium text-foreground border border-border rounded-full bg-secondary/30 animate-fade-in">
            <span className="w-2 h-2 bg-primary rounded-full" />
            Built for BITS Pilani Dubai
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8 text-foreground animate-fade-in-up">
            Find answers in your
            <br />
            <span className="text-muted-foreground">university documents</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-200">
            Search across policies, syllabi, and academic regulations. Get instant, cited answers.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium rounded-full gap-2 border-foreground/20 text-foreground hover:bg-foreground hover:text-background transition-all">
                Get started
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="ghost" size="lg" className="h-12 px-8 text-base font-medium rounded-full text-foreground hover:text-primary">
                Learn more
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-section border-t border-border/50">
        <div className="landing-container">
          <div className="text-center mb-20">
            <p className="text-base font-semibold text-primary mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Simple, fast, reliable
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card text-center">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Ask anything</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Type your question naturally. No keywords needed.</p>
            </div>
            <div className="feature-card text-center">
              <h3 className="text-xl font-semibold mb-3 text-foreground">AI searches</h3>
              <p className="text-base text-muted-foreground leading-relaxed">We scan every PDF and policy document instantly.</p>
            </div>
            <div className="feature-card text-center">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Get answers</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Receive cited answers with direct source links.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="landing-section bg-secondary/30">
        <div className="landing-container">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">
                Stop searching manually
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Academic documents are scattered and hard to navigate. BITS-GPT indexes everything so you can focus on what matters—learning and completing your work.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-base text-foreground">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  Grading policies & exam regulations
                </li>
                <li className="flex items-center gap-4 text-base text-foreground">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  Course syllabi & prerequisites
                </li>
                <li className="flex items-center gap-4 text-base text-foreground">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  Administrative procedures
                </li>
              </ul>
            </div>
            <div className="relative aspect-square max-w-sm mx-auto">
              <div className="feature-card h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-2xl font-bold text-primary mb-3">Comprehensive</div>
                  <p className="text-base text-muted-foreground">Documents indexed & searchable</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-section text-center">
        <div className="landing-container max-w-xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">
            Ready to save time?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join students who find answers in seconds, not hours.
          </p>
          <Link href="/login">
            <Button variant="outline" size="lg" className="h-12 px-10 text-base font-medium rounded-full border-foreground/20 text-foreground hover:bg-foreground hover:text-background transition-all">
              Start now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="landing-container flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-base text-muted-foreground">
            © 2024 BITS Pilani Dubai Campus
          </p>
          <div className="flex gap-8 text-base text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
