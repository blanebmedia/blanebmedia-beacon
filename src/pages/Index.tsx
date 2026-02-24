import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, BarChart3, Users, Layers } from 'lucide-react';

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const systems = [
  'Administration', 'Training', 'Products', 'Current Campaign',
  'Growth', 'Logistics', 'Marketing', 'Finance',
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="font-display text-xl font-bold text-foreground">Beacon</span>
          <Link to="/auth">
            <Button size="sm" variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6 pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <motion.div
          className="relative z-10 mx-auto max-w-3xl text-center"
          initial="hidden"
          animate="visible"
          variants={fade}
          custom={0}
        >
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Build the Systems That Make Businesses{' '}
            <span className="text-accent">Strong.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
            Join the Beacon Founder Cohort and activate the 8&nbsp;systems that drive operational readiness and long-term value.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-base">
                Start Your 14-Day Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">No credit card required to explore.</span>
          </div>
        </motion.div>
      </section>

      {/* Problem */}
      <section className="border-t border-border bg-card px-6 py-24">
        <motion.div
          className="mx-auto max-w-3xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fade}
          custom={0}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">The Problem</p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Small businesses often grow around the founder.
          </h2>
          <div className="mt-8 space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>Revenue increases. Complexity increases. Dependency increases.</p>
            <p className="font-semibold text-foreground">Systems do not.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: BarChart3, text: 'Growth becomes fragile.' },
              { icon: Users, text: 'Scale requires constant founder involvement.' },
              { icon: Shield, text: 'Exit becomes unrealistic.' },
            ].map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                className="rounded-lg border border-border bg-background p-6"
                variants={fade}
                custom={i + 1}
              >
                <Icon className="mb-3 h-6 w-6 text-accent" />
                <p className="text-sm font-medium text-foreground">{text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Solution */}
      <section className="px-6 py-24">
        <motion.div
          className="mx-auto max-w-3xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fade}
          custom={0}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">The Solution</p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Measure your operational readiness across 8&nbsp;core systems.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            You activate systems. You earn maturity. You increase Brand Readiness.
            <br />
            Step by step. System by system.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {systems.map((name, i) => (
              <motion.div
                key={name}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
                variants={fade}
                custom={i * 0.5}
              >
                <Layers className="h-4 w-4 shrink-0 text-accent" />
                {name}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Founder Cohort */}
      <section className="border-t border-border bg-card px-6 py-24">
        <motion.div
          className="mx-auto max-w-3xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fade}
          custom={0}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">What It Means to Be a Founder</p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Beacon Founder Cohort
          </h2>
          <ul className="mt-8 space-y-4 text-lg text-muted-foreground">
            {[
              'Activate their first systems early',
              'Shape the platform through feedback',
              'Lock in founder pricing',
              'Prepare their businesses for real scalability',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 block h-2 w-2 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-lg font-medium text-foreground">
            This isn't about trying a tool.<br />
            It's about building correctly.
          </p>

          <div className="mt-10 space-y-3 text-muted-foreground">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Cohort Members Will</p>
            {[
              'Receive product update briefings',
              'Influence roadmap direction',
              'Help define validation benchmarks',
            ].map((item) => (
              <p key={item} className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-3 w-3 text-accent" /> {item}
              </p>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Manifesto */}
      <section className="bg-primary px-6 py-24 text-primary-foreground">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fade}
          custom={0}
        >
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Founder Cohort Manifesto</h2>
          <div className="mx-auto mt-10 max-w-lg space-y-4 text-lg leading-relaxed opacity-90">
            <p>We believe structure creates value.</p>
            <p>We believe systems reduce chaos.</p>
            <p>We believe readiness is earned.</p>
            <p>We believe transferable businesses are built, not improvised.</p>
          </div>
          <p className="mt-10 text-xl font-semibold">
            If you believe the same, join the Founder Cohort.
          </p>
        </motion.div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24">
        <motion.div
          className="mx-auto max-w-md text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fade}
          custom={0}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Founder Cohort Pricing</p>
          <div className="mt-6 flex items-baseline justify-center gap-1">
            <span className="font-display text-5xl font-bold">$19</span>
            <span className="text-lg text-muted-foreground">/month</span>
          </div>
          <p className="mt-2 text-sm font-medium text-accent">Locked for life.</p>
          <p className="mt-4 text-muted-foreground">
            Start with a 14-day free trial. Full access to the platform. Cancel anytime.
          </p>
          <Link to="/auth" className="mt-8 inline-block">
            <Button size="lg" className="gap-2 text-base">
              Join the Founder Cohort <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-lg font-bold">Beacon</span>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Beacon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
