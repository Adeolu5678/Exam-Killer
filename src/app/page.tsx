'use client';

import Link from 'next/link';

import { motion, type Variants } from 'framer-motion';
import {
  Brain,
  Layers,
  FileText,
  BarChart3,
  FlipHorizontal2,
  Upload,
  Sparkles,
  Check,
  ArrowRight,
  Star,
} from 'lucide-react';

import { Button, Badge, Card, CardContent } from '@/shared/ui';

import { PublicFooter } from './_components/PublicFooter';
import { PublicNav } from './_components/PublicNav';

// =============================================================================
// Homepage — Public landing page
// Layer: app (routing layer)
// FSD: Imports from shared/ui and app/_components ONLY
// =============================================================================

/* ─── Animation variants ─────────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0,
      when: 'beforeChildren',
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
};

/* ─── Static data ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Brain,
    title: 'AI Tutor',
    description:
      'Chat with an intelligent tutor that has read every page of your uploaded material.',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-muted)',
  },
  {
    icon: FlipHorizontal2,
    title: 'Smart Flashcards',
    description:
      'Auto-generated flashcards with spaced repetition — scientifically proven to boost recall.',
    color: 'var(--color-accent-violet)',
    bg: 'var(--color-accent-violet-muted)',
  },
  {
    icon: FileText,
    title: 'Quiz Generator',
    description: 'Instant MCQs, short answers, and essay questions tailored to your content.',
    color: 'var(--color-accent-emerald)',
    bg: 'var(--color-accent-emerald-muted)',
  },
  {
    icon: BarChart3,
    title: 'Study Analytics',
    description: 'Track your streaks, mastery scores, and time-to-exam readiness in real time.',
    color: 'var(--color-accent-amber)',
    bg: 'var(--color-accent-amber-muted)',
  },
  {
    icon: Upload,
    title: 'Source Uploads',
    description:
      'PDFs, lecture slides, past question papers — upload anything and the AI absorbs it.',
    color: 'var(--color-accent-rose)',
    bg: 'var(--color-accent-rose-muted)',
  },
  {
    icon: Layers,
    title: 'Workspaces',
    description: 'One workspace per course. Organised, searchable, always in sync.',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-muted)',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Upload your materials',
    description: 'Drop in PDFs, notes, or past exam papers. Any file, any subject.',
    icon: Upload,
  },
  {
    num: '02',
    title: 'AI processes your content',
    description: 'Our models read, index, and understand your materials in seconds.',
    icon: Sparkles,
  },
  {
    num: '03',
    title: 'Start learning',
    description: 'Use the tutor, flashcards, and quizzes to master your content fast.',
    icon: Brain,
  },
];

const TESTIMONIALS = [
  {
    quote:
      '"ExamKiller turned my 200-page Engineering textbook into a complete study system overnight. I went from a 3.0 to a First Class."',
    name: 'Adewale O.',
    role: 'Civil Engineering',
    school: 'University of Lagos',
    stars: 5,
  },
  {
    quote:
      '"The AI tutor explains concepts better than some of my lecturers, and I can ask it the same question ten times without judgement."',
    name: 'Chiamaka A.',
    role: 'Pharmacy',
    school: 'University of Nigeria, Nsukka',
    stars: 5,
  },
  {
    quote:
      '"I crashed out in my second year finals. Discovered ExamKiller, used it for 6 weeks, and passed my resit with a B+."',
    name: 'Babatunde M.',
    role: 'Computer Science',
    school: 'Obafemi Awolowo University',
    stars: 5,
  },
];

const PRICING_TEASER = [
  { name: 'Free', price: '₦0', period: '', highlight: false },
  { name: 'Premium', price: '₦2,000', period: '/month', highlight: true },
  { name: 'Annual', price: '₦20,000', period: '/year', highlight: false, badge: 'Save 17%' },
];

const FREE_HIGHLIGHTS = ['1 workspace', '5 AI queries/day', '10 flashcards'];
const PRO_HIGHLIGHTS = [
  'Unlimited workspaces',
  'Unlimited AI queries',
  'All tutor personalities',
  'Advanced analytics',
];

/* ─── Page component ──────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div
      style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg-base)', overflowX: 'hidden' }}
    >
      <PublicNav />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          position: 'relative',
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'calc(var(--topbar-height) + var(--space-16)) var(--space-6) var(--space-24)',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow orb */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '900px',
            height: '600px',
            background:
              'radial-gradient(ellipse at center, rgba(61,123,245,0.18) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(1px)',
          }}
        />

        {/* Secondary violet glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '-10%',
            width: '500px',
            height: '500px',
            background:
              'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Grid texture */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
            linear-gradient(var(--color-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
          `,
            backgroundSize: '64px 64px',
            opacity: 0.25,
            maskImage: 'radial-gradient(ellipse 80% 60% at center, black 0%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 60% at center, black 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ position: 'relative', maxWidth: '860px', margin: '0 auto' }}
        >
          <motion.div variants={fadeUp}>
            <Badge
              variant="primary"
              dot
              style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-xs)' }}
            >
              AI-Powered Study Companion for Nigerian Students
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-display"
            style={{
              fontSize: 'var(--font-size-hero)',
              marginBottom: 'var(--space-6)',
              lineHeight: 'var(--line-height-tight)',
              letterSpacing: 'var(--letter-spacing-tight)',
              color: 'var(--color-text-primary)',
            }}
          >
            Turn your notes into{' '}
            <span
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-accent-violet))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              exam mastery.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--line-height-relaxed)',
              maxWidth: '600px',
              margin: '0 auto var(--space-10)',
            }}
          >
            Upload any study material and instantly get a personal AI tutor, smart flashcards, and
            quiz generators — engineered for the Nigerian university experience.
          </motion.p>

          <motion.div
            variants={fadeUp}
            style={{
              display: 'flex',
              gap: 'var(--space-4)',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button
              as={Link}
              href="/auth/signup"
              size="lg"
              variant="primary"
              rightIcon={<ArrowRight size={16} />}
              style={{
                boxShadow: 'var(--shadow-glow-primary)',
                fontSize: 'var(--font-size-base)',
              }}
            >
              Get Started Free
            </Button>
            <Button
              as={Link}
              href="/pricing"
              size="lg"
              variant="outline"
              style={{ fontSize: 'var(--font-size-base)' }}
            >
              View Pricing
            </Button>
          </motion.div>

          {/* Social proof micro strip */}
          <motion.div
            variants={fadeUp}
            style={{
              marginTop: 'var(--space-10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex' }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    background: `hsl(${220 + i * 30}, 60%, 45%)`,
                    border: '2px solid var(--color-bg-base)',
                    marginLeft: i === 0 ? 0 : '-8px',
                  }}
                />
              ))}
            </div>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              <strong style={{ color: 'var(--color-text-primary)' }}>2,400+</strong> students
              studying smarter
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: 'var(--space-24) var(--space-6)' }}>
        <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="default" style={{ marginBottom: 'var(--space-4)' }}>
                Everything you need
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-display"
              style={{
                fontSize: 'var(--font-size-3xl)',
                marginBottom: 'var(--space-4)',
                letterSpacing: 'var(--letter-spacing-tight)',
              }}
            >
              Built to help you ace any exam
            </motion.h2>
            <motion.p
              variants={fadeUp}
              style={{ maxWidth: '480px', margin: '0 auto', color: 'var(--color-text-secondary)' }}
            >
              Six integrated tools that work together seamlessly to close every gap in your
              knowledge.
            </motion.p>
          </motion.div>

          {/* Bento grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-4)',
            }}
            className="features-grid"
          >
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ cursor: 'default' }}
                >
                  <Card
                    style={{
                      height: '100%',
                      backgroundColor: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      padding: 'var(--space-6)',
                      transition:
                        'border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'var(--color-border-accent)';
                      el.style.boxShadow = `0 0 24px ${feat.color}22`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'var(--color-border)';
                      el.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: feat.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 'var(--space-4)',
                        color: feat.color,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <h3
                      style={{
                        fontSize: 'var(--font-size-md)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      {feat.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 'var(--line-height-relaxed)',
                        margin: 0,
                        maxWidth: 'none',
                      }}
                    >
                      {feat.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (max-width: 1023px) { .features-grid { grid-template-columns: repeat(2, 1fr) !important; } }
          @media (max-width: 639px)  { .features-grid { grid-template-columns: 1fr !important; } }
        `,
          }}
        />
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          padding: 'var(--space-24) var(--space-6)',
          backgroundColor: 'var(--color-bg-elevated)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="default" style={{ marginBottom: 'var(--space-4)' }}>
                Simple process
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-display"
              style={{
                fontSize: 'var(--font-size-3xl)',
                letterSpacing: 'var(--letter-spacing-tight)',
              }}
            >
              Up and running in minutes
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-8)',
              position: 'relative',
            }}
            className="steps-grid"
          >
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  variants={fadeUp}
                  style={{ textAlign: 'center', position: 'relative' }}
                >
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div
                      className="step-connector"
                      style={{
                        position: 'absolute',
                        top: '24px',
                        left: 'calc(50% + 32px)',
                        right: 'calc(-50% + 32px)',
                        height: '1px',
                        background:
                          'linear-gradient(90deg, var(--color-border-accent), var(--color-border))',
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Step icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto var(--space-6)',
                      color: '#fff',
                      position: 'relative',
                      zIndex: 1,
                      boxShadow: 'var(--shadow-glow-primary)',
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <Badge
                    variant="default"
                    style={{
                      marginBottom: 'var(--space-3)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    {step.num}
                  </Badge>

                  <h3
                    style={{
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-3)',
                      marginTop: 'var(--space-2)',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 'var(--font-size-base)',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 'var(--line-height-relaxed)',
                      margin: 0,
                      maxWidth: 'none',
                    }}
                  >
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (max-width: 767px) {
            .steps-grid { grid-template-columns: 1fr !important; }
            .step-connector { display: none !important; }
          }
        `,
          }}
        />
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section style={{ padding: 'var(--space-24) var(--space-6)' }}>
        <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="success" dot style={{ marginBottom: 'var(--space-4)' }}>
                Real results
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-display"
              style={{
                fontSize: 'var(--font-size-3xl)',
                letterSpacing: 'var(--letter-spacing-tight)',
              }}
            >
              Students don&rsquo;t lie
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-6)',
            }}
            className="testimonials-grid"
          >
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                  }}
                >
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    {Array.from({ length: t.stars }).map((_, s) => (
                      <Star
                        key={s}
                        size={14}
                        style={{
                          color: 'var(--color-accent-amber)',
                          fill: 'var(--color-accent-amber)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote
                    className="text-editorial"
                    style={{
                      fontSize: 'var(--font-size-base)',
                      color: 'var(--color-text-primary)',
                      lineHeight: 'var(--line-height-relaxed)',
                      margin: 0,
                      flexGrow: 1,
                      maxWidth: 'none',
                    }}
                  >
                    {t.quote}
                  </blockquote>

                  {/* Attribution */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-full)',
                        background: `hsl(${i * 80 + 200}, 60%, 50%)`,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <p
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-primary)',
                          margin: 0,
                          maxWidth: 'none',
                        }}
                      >
                        {t.name}
                      </p>
                      <p
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-secondary)',
                          margin: 0,
                          maxWidth: 'none',
                        }}
                      >
                        {t.role} · {t.school}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (max-width: 1023px) { .testimonials-grid { grid-template-columns: repeat(2, 1fr) !important; } }
          @media (max-width: 639px)  { .testimonials-grid { grid-template-columns: 1fr !important; } }
        `,
          }}
        />
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          padding: 'var(--space-24) var(--space-6)',
          backgroundColor: 'var(--color-bg-elevated)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="default" style={{ marginBottom: 'var(--space-4)' }}>
                Pricing
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-display"
              style={{
                fontSize: 'var(--font-size-3xl)',
                letterSpacing: 'var(--letter-spacing-tight)',
                marginBottom: 'var(--space-4)',
              }}
            >
              Start free. Upgrade when ready.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              style={{ color: 'var(--color-text-secondary)', maxWidth: '420px', margin: '0 auto' }}
            >
              All plans include Paystack-secured payments and zero lock-in.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-6)',
              maxWidth: '900px',
              margin: '0 auto var(--space-12)',
            }}
            className="pricing-teaser-grid"
          >
            {PRICING_TEASER.map((plan, i) => (
              <motion.div key={plan.name} variants={fadeUp}>
                <Card
                  style={{
                    backgroundColor: plan.highlight
                      ? 'var(--color-bg-surface)'
                      : 'var(--color-bg-base)',
                    border: `1px solid ${plan.highlight ? 'var(--color-border-accent)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-6)',
                    boxShadow: plan.highlight ? 'var(--shadow-glow-primary)' : 'none',
                    position: 'relative',
                  }}
                >
                  {plan.badge && (
                    <Badge
                      variant="warning"
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {plan.badge}
                    </Badge>
                  )}
                  {plan.highlight && (
                    <Badge variant="primary" style={{ marginBottom: 'var(--space-3)' }}>
                      Most Popular
                    </Badge>
                  )}
                  <h3
                    style={{
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    {plan.name}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 'var(--space-1)',
                      marginBottom: 'var(--space-6)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--font-size-3xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                    }}
                  >
                    {(i === 0 ? FREE_HIGHLIGHTS : PRO_HIGHLIGHTS).map((f) => (
                      <li
                        key={f}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                      >
                        <Check
                          size={14}
                          style={{ color: 'var(--color-accent-emerald)', flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ textAlign: 'center' }}
          >
            <motion.div variants={fadeUp}>
              <Button
                as={Link}
                href="/pricing"
                size="lg"
                variant="outline"
                rightIcon={<ArrowRight size={16} />}
              >
                View Full Pricing Details
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (max-width: 767px) { .pricing-teaser-grid { grid-template-columns: 1fr !important; } }
        `,
          }}
        />
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: 'var(--space-24) var(--space-6)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            height: '400px',
            background:
              'radial-gradient(ellipse at center, rgba(61,123,245,0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            <motion.h2
              variants={fadeUp}
              className="text-display"
              style={{
                fontSize: 'var(--font-size-3xl)',
                letterSpacing: 'var(--letter-spacing-tight)',
                marginBottom: 'var(--space-6)',
              }}
            >
              Ready to transform your studies?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              style={{
                fontSize: 'var(--font-size-lg)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-10)',
              }}
            >
              Join thousands of Nigerian students who refused to fail.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button
                as={Link}
                href="/auth/signup"
                size="lg"
                variant="primary"
                rightIcon={<ArrowRight size={16} />}
                style={{
                  boxShadow: 'var(--shadow-glow-primary)',
                  fontSize: 'var(--font-size-base)',
                }}
              >
                Get Started Free
              </Button>
              <p
                style={{
                  marginTop: 'var(--space-4)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-muted)',
                  maxWidth: 'none',
                }}
              >
                No credit card required · Free plan available forever
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
