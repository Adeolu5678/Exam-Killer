'use client';

// =============================================================================
// app/dashboard/settings/page.tsx
// Layer: app  →  thin page assembler
//
// FSD Rule: pure UI assembly. Only shared/ui primitives are imported.
//   No feature-layer imports needed — settings forms contain no business logic
//   that belongs to a specific feature module. Submission wiring to the backend
//   is deferred to a follow-up task; this page focuses on the UI assembly.
//
// Layout: Three tabbed sections  ─  Profile  |  Preferences  |  Billing
// =============================================================================

import { useState, useContext, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { AuthContext } from '@/context/AuthContext';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Textarea,
  Badge,
} from '@/shared/ui';

import { VerificationBanner } from '@/features/identity/VerificationBanner';

// ── Page metadata (ignored in client components — kept for reference) ──────
// export const metadata: Metadata = {   // cannot export from 'use client' components
//   title:       'Settings · Exam-Killer',
//   description: 'Manage your profile, preferences, and billing.',
// }

// ── Types ─────────────────────────────────────────────────────────────────
type SettingsTab = 'profile' | 'preferences' | 'billing';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'billing', label: 'Billing' },
];

// ── Shared actions ──────────────────────────────────────────────────────────

function SignOutButton() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!authContext?.logout) return;
    setIsLoggingOut(true);
    try {
      await authContext.logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}

// ── Section sub-components ─────────────────────────────────────────────────

function ProfileSection() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/payments/status');
        if (res.ok) {
          const data = await res.json();
          setUserData(data.subscription);
        }
      } catch (err) {
        console.error('Failed to fetch user data');
      }
    };
    fetchUserData();
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Avatar row */}
      <Card>
        <CardContent style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Avatar placeholder */}
            <div
              aria-hidden="true"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), #6366F1)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 700,
                color: '#fff',
                userSelect: 'none',
              }}
            >
              U
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, margin: '0 0 4px' }}>
                Profile photo
              </p>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: '0 0 16px',
                }}
              >
                JPG, PNG or WebP · Max 2 MB
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" size="sm">
                  Upload photo
                </Button>
                <Button variant="ghost" size="sm">
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identity fields */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Personal information
          </CardTitle>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input id="settings-first-name" label="First name" placeholder="Ada" defaultValue="" />
            <Input
              id="settings-last-name"
              label="Last name"
              placeholder="Lovelace"
              defaultValue=""
            />
          </div>

          <Input
            id="settings-email"
            label="Email address"
            type="email"
            placeholder="ada@university.edu"
            defaultValue=""
            hint="Used for login and notifications."
          />

          <Input
            id="settings-institution"
            label="Institution"
            placeholder="University of Lagos"
            defaultValue={userData?.institution || ''}
          />

          <Input
            id="settings-matric"
            label="Matric / Student ID Number"
            placeholder="170805011"
            defaultValue={userData?.matricNumber || ''}
          />

          <Input
            id="settings-program"
            label="Program / Department"
            placeholder="Computer Science, 400L"
            defaultValue=""
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              htmlFor="settings-bio"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              Bio <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <Textarea
              id="settings-bio"
              placeholder="A short bio visible to workspace collaborators…"
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter style={{ padding: '16px 24px', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button variant="primary" size="sm">
            Save changes
          </Button>
        </CardFooter>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Security</CardTitle>
          <CardDescription>Manage your password and login methods.</CardDescription>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <Input
            id="settings-current-password"
            label="Current password"
            type="password"
            placeholder="••••••••"
          />
          <Input
            id="settings-new-password"
            label="New password"
            type="password"
            placeholder="••••••••"
            hint="Min 8 characters, at least one number and one symbol."
          />
          <Input
            id="settings-confirm-password"
            label="Confirm new password"
            type="password"
            placeholder="••••••••"
          />
        </CardContent>
        <CardFooter style={{ padding: '16px 24px', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="primary" size="sm">
            Update password
          </Button>
        </CardFooter>
      </Card>

      {/* Account actions */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Account Actions
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '16px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, margin: '0 0 4px' }}>
                Sign out
              </p>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                }}
              >
                Log out of your account on this device.
              </p>
            </div>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card style={{ borderColor: 'rgba(244,63,94,0.25)' }}>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              color: 'var(--color-accent-rose)',
            }}
          >
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '16px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, margin: '0 0 4px' }}>
                Delete account
              </p>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                }}
              >
                Permanently remove your account and all associated data. This cannot be undone.
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Appearance */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Appearance
          </CardTitle>
          <CardDescription>Customise the look and feel of Exam-Killer.</CardDescription>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Theme selector */}
          <div>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              Theme
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['Dark', 'Light', 'System'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-md)',
                    border:
                      t === 'Dark'
                        ? '1px solid var(--color-border-accent)'
                        : '1px solid var(--color-border)',
                    background: t === 'Dark' ? 'var(--color-bg-surface)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                    flex: '1 1 auto',
                    minWidth: '80px',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Content density */}
          <div>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              Content density
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['Comfortable', 'Compact'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-md)',
                    border:
                      d === 'Comfortable'
                        ? '1px solid var(--color-border-accent)'
                        : '1px solid var(--color-border)',
                    background: d === 'Comfortable' ? 'var(--color-bg-surface)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                    flex: '1 1 auto',
                    minWidth: '120px',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter style={{ padding: '16px 24px', justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm">
            Save preferences
          </Button>
        </CardFooter>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Notifications
          </CardTitle>
          <CardDescription>Choose what you want to be notified about.</CardDescription>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {[
            {
              id: 'notif-due-cards',
              label: 'Daily review reminders',
              description: 'Remind you when cards are due for review.',
            },
            {
              id: 'notif-streak',
              label: 'Streak alerts',
              description: 'Alert before your study streak breaks.',
            },
            {
              id: 'notif-exam-count',
              label: 'Exam countdown alerts',
              description: 'Notify 7 days and 1 day before exam dates.',
            },
            {
              id: 'notif-workspace-inv',
              label: 'Workspace invitations',
              description: 'When a classmate invites you to a workspace.',
            },
          ].map(({ id, label, description }) => (
            <label
              key={id}
              htmlFor={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                cursor: 'pointer',
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--color-text-primary)',
                    fontWeight: 500,
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {label}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                  {description}
                </span>
              </span>
              {/* Toggle — unstyled checkbox; real implementation should use Radix Switch */}
              <input
                id={id}
                type="checkbox"
                defaultChecked
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--color-primary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
            </label>
          ))}
        </CardContent>
        <CardFooter style={{ padding: '16px 24px', justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm">
            Save notification settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function BillingSection({ setActiveTab }: { setActiveTab: (tab: SettingsTab) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlanData, setCurrentPlanData] = useState<any>(null);
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  const handleSubscribe = async (plan: string, trial: boolean = false) => {
    setLoading(true);
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
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const [paymentStatus, setPaymentStatus] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/payments/status');
        if (res.ok) {
          const data = await res.json();
          setPaymentStatus(data.subscription);
        }
      } catch (err) {
        console.error('Failed to fetch subscription status');
      }
    };
    fetchStatus();
  }, []);

  const subscription = paymentStatus;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Verification Banner */}
      {subscription && (
        <div className="mb-4">
          <VerificationBanner
            status={subscription.verificationStatus || 'none'}
            onVerifyClick={() => setActiveTab('profile')} // Or open a modal
          />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            color: 'var(--color-accent-rose)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}
      {/* Current plan */}
      <Card>
        <CardContent style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
              >
                <p
                  style={{
                    color: 'var(--color-text-primary)',
                    fontWeight: 600,
                    fontSize: 'var(--text-lg)',
                    margin: 0,
                  }}
                >
                  Free Plan
                </p>
                <Badge variant="default">Current</Badge>
              </div>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                }}
              >
                3 workspaces · 50 flashcards per deck · Basic AI tutor
              </p>
            </div>
            <Button variant="primary" size="sm">
              Upgrade to Premium
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Available plans
          </CardTitle>
        </CardHeader>
        <CardContent
          style={{ padding: '16px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}
        >
          {[
            {
              name: 'Free',
              price: '₦0',
              period: 'forever',
              badge: null,
              features: [
                '3 workspaces',
                '50 flashcards/deck',
                '20 AI messages/day',
                'Basic quiz generator',
              ],
              current: true,
              cta: null,
              variant: 'ghost' as const,
            },
            {
              name: 'Premium',
              id: 'premium_monthly',
              price: '₦2,000',
              period: '/month',
              badge: 'Most popular',
              features: [
                'Unlimited workspaces',
                'Unlimited flashcards',
                'Unlimited AI messages',
                'Advanced quiz generator',
                'Study plan & exam countdown',
                'Priority support',
              ],
              cta: 'Start 2-Day Trial',
              variant: 'primary' as const,
              trial: true,
            },
            {
              name: 'Annual',
              id: 'premium_annual',
              price: '₦20,000',
              period: '/year',
              badge: 'Save 17%',
              features: [
                'Everything in Premium',
                '1 Week Free Trial',
                'Dedicated onboarding call',
                'Export to Anki & PDF',
              ],
              cta: 'Start 1-Week Trial',
              variant: 'secondary' as const,
              trial: true,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              style={{
                flex: '1 1 220px',
                border:
                  plan.name === 'Premium'
                    ? '1px solid var(--color-border-accent)'
                    : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                background: plan.name === 'Premium' ? 'var(--color-primary-glow)' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {plan.name}
                </span>
                {plan.badge && (
                  <Badge variant={plan.name === 'Annual' ? 'warning' : 'primary'}>
                    {plan.badge}
                  </Badge>
                )}
              </div>
              <div>
                <span
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {plan.price}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                  {plan.period}
                </span>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: 'var(--color-accent-emerald)' }} aria-hidden="true">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.cta ? (
                <Button
                  variant={plan.variant}
                  size="sm"
                  style={{ marginTop: 'auto' }}
                  onClick={() => handleSubscribe(plan.id!, plan.trial)}
                  disabled={loading}
                  loading={loading}
                >
                  {plan.cta}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  style={{ marginTop: 'auto', opacity: 0.5 }}
                >
                  Current plan
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment history placeholder */}
      <Card>
        <CardHeader style={{ padding: '24px 24px 0' }}>
          <CardTitle style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Payment history
          </CardTitle>
          <CardDescription>Your recent transactions will appear here.</CardDescription>
        </CardHeader>
        <CardContent style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            No payments yet. Upgrade to see your invoice history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Root page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <section
      className="px-4 py-8 sm:px-8 sm:py-12"
      style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}
      aria-labelledby="settings-heading"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header
        style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <h1
          id="settings-heading"
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Manage your profile, preferences, and subscription.
        </p>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <nav
        role="tablist"
        aria-label="Settings sections"
        style={{
          display: 'flex',
          gap: '2px',
          padding: '4px',
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          width: 'fit-content',
          marginBottom: '32px',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 20px',
                borderRadius: 'calc(var(--radius-lg) - 2px)',
                border: 'none',
                background: isActive ? 'var(--color-bg-surface)' : 'transparent',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 150ms var(--ease-standard)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Tab panels ──────────────────────────────────────────────────── */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'preferences' && <PreferencesSection />}
        {activeTab === 'billing' && <BillingSection setActiveTab={setActiveTab} />}
      </div>
    </section>
  );
}
