'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { motion } from 'framer-motion';
import { Check, X, ArrowLeft } from 'lucide-react';

import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardSkeleton,
} from '@/shared/ui';

import { PublicFooter } from '../_components/PublicFooter';
import { PublicNav } from '../_components/PublicNav';

// =============================================================================
// PricingPage — Redesigned dark-first pricing page
// Layer: app (routing layer)
// FSD: Imports from shared/ui and app/_components ONLY
// Business logic (Paystack integration) is preserved verbatim
// =============================================================================

/* ─── Types ─────────────────────────────────────────────────────────── */
interface SubscriptionStatus {
  subscription: {
    plan: 'free' | 'premium_monthly' | 'premium_annual';
    status: 'active' | 'inactive' | 'past_due';
    currentPeriodEnd?: string;
  };
}

/* ─── Feature data ──────────────────────────────────────────────────── */
const FREE_FEATURES = [
  { name: 'Workspaces', value: '1' },
  { name: 'File Uploads', value: '3 per month' },
  { name: 'AI Queries', value: '5 per day' },
  { name: 'Flashcards', value: '10' },
  { name: 'Tutor Personalities', value: 'Basic only' },
  { name: 'Spaced Repetition', value: false },
  { name: 'Analytics', value: 'Basic' },
  { name: 'Collaboration', value: false },
  { name: 'Export PDF', value: false },
  { name: 'Export Anki', value: false },
  { name: 'Offline Mode', value: false },
];

const PREMIUM_FEATURES = [
  { name: 'Workspaces', value: 'Unlimited' },
  { name: 'File Uploads', value: 'Unlimited' },
  { name: 'AI Queries', value: 'Unlimited' },
  { name: 'Flashcards', value: 'Unlimited' },
  { name: 'Tutor Personalities', value: 'All' },
  { name: 'Spaced Repetition', value: true },
  { name: 'Analytics', value: 'Advanced' },
  { name: 'Collaboration', value: true },
  { name: 'Export PDF', value: true },
  { name: 'Export Anki', value: true },
  { name: 'Offline Mode', value: true },
];

const ANNUAL_ADDITIONAL = [
  { name: 'Priority Support', value: true },
  { name: 'Early Access', value: true },
];

/* ─── Sub-components ────────────────────────────────────────────────── */
function FeatureRow({ name, value }: { name: string; value: string | boolean }) {
  const included = value === true || (typeof value === 'string' && value !== 'false');

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) 0',
      }}
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          color: included ? 'var(--color-accent-emerald)' : 'var(--color-text-muted)',
        }}
      >
        {included ? <Check size={14} /> : <X size={14} />}
      </span>

      {/* Text */}
      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          color: included ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          fontWeight: 'var(--font-weight-medium)',
          display: 'flex',
          gap: 'var(--space-2)',
          flexWrap: 'wrap',
        }}
      >
        {name}
        {typeof value === 'string' && (
          <span
            style={{
              color: 'var(--color-text-secondary)',
              fontWeight: 'var(--font-weight-normal)',
            }}
          >
            — {value}
          </span>
        )}
      </span>
    </li>
  );
}

interface PricingCardProps {
  name: string;
  price: string;
  billingPeriod?: string;
  features: Array<{ name: string; value: string | boolean }>;
  additionalFeatures?: Array<{ name: string; value: string | boolean }>;
  buttonText: string;
  isCurrentPlan: boolean;
  onSubscribe: () => void;
  isLoading: boolean;
  badge?: string;
  popular?: boolean;
}

function PricingCard({
  name,
  price,
  billingPeriod,
  features,
  additionalFeatures,
  buttonText,
  isCurrentPlan,
  onSubscribe,
  isLoading,
  badge,
  popular,
}: PricingCardProps) {
  return (
    <Card
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: popular ? 'var(--color-bg-surface)' : 'var(--color-bg-elevated)',
        border: `1px solid ${popular ? 'var(--color-border-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-xl)',
        boxShadow: popular ? 'var(--shadow-glow-primary)' : 'none',
        overflow: 'visible',
      }}
    >
      {/* Badge above card */}
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: '-14px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1,
          }}
        >
          <Badge variant="warning" style={{ whiteSpace: 'nowrap' }}>
            {badge}
          </Badge>
        </div>
      )}

      <CardHeader style={{ padding: 'var(--space-6) var(--space-6) 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-1)',
          }}
        >
          <CardTitle
            style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}
          >
            {name}
          </CardTitle>
          {popular && <Badge variant="primary">Most Popular</Badge>}
        </div>

        {/* Price */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-1)',
            marginTop: 'var(--space-4)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)',
              letterSpacing: 'var(--letter-spacing-tight)',
            }}
          >
            {price}
          </span>
          {billingPeriod && (
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              /{billingPeriod}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent style={{ padding: 'var(--space-6)', flexGrow: 1 }}>
        <div
          style={{
            height: '1px',
            backgroundColor: 'var(--color-border)',
            marginBottom: 'var(--space-6)',
          }}
        />
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {features.map((f) => (
            <FeatureRow key={f.name} name={f.name} value={f.value} />
          ))}
          {additionalFeatures?.map((f) => (
            <FeatureRow key={f.name} name={f.name} value={f.value} />
          ))}
        </ul>
      </CardContent>

      <CardFooter style={{ padding: '0 var(--space-6) var(--space-6)' }}>
        <Button
          onClick={onSubscribe}
          disabled={isCurrentPlan || isLoading}
          loading={isLoading}
          variant={isCurrentPlan ? 'secondary' : popular ? 'primary' : 'outline'}
          size="lg"
          style={{ width: '100%' }}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'premium_monthly' | 'premium_annual'>(
    'free',
  );
  const [currentStatus, setCurrentStatus] = useState<'active' | 'inactive' | 'past_due'>(
    'inactive',
  );
  const [paymentLoading, setPaymentLoading] = useState(false);

  /* ── Preserved business logic ──────────────────── */
  useEffect(() => {
    async function fetchSubscriptionStatus() {
      try {
        const response = await fetch('/api/payments/status');
        if (!response.ok) throw new Error('Failed to fetch subscription status');
        const data: SubscriptionStatus = await response.json();
        setCurrentPlan(data.subscription.plan);
        setCurrentStatus(data.subscription.status);
      } catch {
        setCurrentPlan('free');
        setCurrentStatus('inactive');
      } finally {
        setLoading(false);
      }
    }
    fetchSubscriptionStatus();
  }, []);

  const handleSubscribe = async (
    plan: 'premium_monthly' | 'premium_annual',
    trial: boolean = false,
  ) => {
    setPaymentLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, trial }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || 'Failed to initialize payment');
      if (data.authorizationUrl) window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      setPaymentLoading(false);
    }
  };

  const getButtonText = (plan: 'free' | 'premium_monthly' | 'premium_annual') => {
    if (plan === currentPlan && currentStatus === 'active') return 'Current Plan';
    if (plan === 'free') return 'Current Plan';
    if (currentPlan === 'free') {
      return plan === 'premium_monthly' ? 'Start 2-Day Free Trial' : 'Start 1-Week Free Trial';
    }
    return 'Upgrade now';
  };

  const isCurrentPlan = (plan: 'free' | 'premium_monthly' | 'premium_annual') =>
    plan === currentPlan && currentStatus === 'active';

  /* ── Loading state ─────────────────────────────── */
  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg-base)' }}>
        <PublicNav />
        <div
          style={{
            maxWidth: 'var(--content-max-width)',
            margin: '0 auto',
            padding: 'calc(var(--topbar-height) + var(--space-24)) var(--space-6) var(--space-24)',
          }}
        >
          {/* Page header skeleton */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
            <div
              style={{
                width: '120px',
                height: '24px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-bg-elevated)',
                margin: '0 auto var(--space-6)',
              }}
              className="shimmer"
            />
            <div
              style={{
                width: '360px',
                height: '40px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-elevated)',
                margin: '0 auto var(--space-4)',
              }}
              className="shimmer"
            />
          </div>
          {/* Card skeletons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-6)',
            }}
            className="pricing-loading-grid"
          >
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (max-width: 767px) { .pricing-loading-grid { grid-template-columns: 1fr !important; } }
        `,
          }}
        />
      </div>
    );
  }

  /* ── Main render ───────────────────────────────── */
  return (
    <div
      style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg-base)', overflowX: 'hidden' }}
    >
      <PublicNav />

      {/* Glow orb */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse at top, rgba(61,123,245,0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 'var(--content-max-width)',
          margin: '0 auto',
          padding: 'calc(var(--topbar-height) + var(--space-8)) var(--space-4) var(--space-16)',
        }}
        className="pricing-main"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (min-width: 768px) {
            .pricing-main {
              padding: calc(var(--topbar-height) + var(--space-16)) var(--space-6) var(--space-24) !important;
            }
          }
        `,
          }}
        />
        {/* Back link */}
        <Button
          as={Link}
          href="/"
          variant="ghost"
          size="sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            marginBottom: 'var(--space-8)',
            transition: 'color var(--duration-fast) var(--ease-standard)',
          }}
          leftIcon={<ArrowLeft size={14} />}
        >
          Back to home
        </Button>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}
        >
          <Badge variant="primary" dot style={{ marginBottom: 'var(--space-5)' }}>
            Simple pricing
          </Badge>
          <h1
            className="text-display"
            style={{
              fontSize: 'clamp(1.875rem, 5vw, 3rem)',
              letterSpacing: 'var(--letter-spacing-tight)',
              marginBottom: 'var(--space-4)',
              color: 'var(--color-text-primary)',
              lineHeight: '1.2',
            }}
          >
            Unlock your full potential
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              maxWidth: '440px',
              margin: '0 auto',
              fontSize: 'var(--font-size-lg)',
            }}
          >
            All plans secured by Paystack. Cancel anytime, no questions asked.
          </p>
        </motion.div>

        {/* Error banner */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              maxWidth: '480px',
              margin: '0 auto var(--space-10)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-accent-rose-muted)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
            }}
          >
            <Badge variant="error" dot>
              Error
            </Badge>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-rose)' }}>
              {error}
            </span>
          </div>
        )}

        {/* Pricing cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-6)',
            alignItems: 'start',
          }}
          className="pricing-cards-grid"
        >
          <PricingCard
            name="Free"
            price="₦0"
            features={FREE_FEATURES}
            buttonText={getButtonText('free')}
            isCurrentPlan={true}
            onSubscribe={() => {}}
            isLoading={false}
          />
          <PricingCard
            name="Premium"
            price="₦2,000"
            billingPeriod="month"
            features={PREMIUM_FEATURES}
            buttonText={getButtonText('premium_monthly')}
            isCurrentPlan={isCurrentPlan('premium_monthly')}
            onSubscribe={() => handleSubscribe('premium_monthly', currentPlan === 'free')}
            isLoading={paymentLoading}
            popular
          />
          <PricingCard
            name="Annual"
            price="₦20,000"
            billingPeriod="year"
            features={PREMIUM_FEATURES}
            additionalFeatures={ANNUAL_ADDITIONAL}
            buttonText={getButtonText('premium_annual')}
            isCurrentPlan={isCurrentPlan('premium_annual')}
            onSubscribe={() => handleSubscribe('premium_annual', currentPlan === 'free')}
            isLoading={paymentLoading}
            badge="Best Value — Save 17%"
          />
        </motion.div>

        {/* Footer note */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 'var(--space-12)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            maxWidth: 'none',
          }}
        >
          Payments are processed securely by{' '}
          <span style={{ color: 'var(--color-text-secondary)' }}>Paystack</span>. All prices are in
          Nigerian Naira (₦).
        </p>
      </main>

      <PublicFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 1023px) { .pricing-cards-grid { grid-template-columns: 1fr !important; max-width: 480px; margin: 0 auto; } }
      `,
        }}
      />
    </div>
  );
}
