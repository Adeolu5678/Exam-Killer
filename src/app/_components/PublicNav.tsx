'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';

import { Menu, X } from 'lucide-react';

import { Button } from '@/shared/ui';

// =============================================================================
// PublicNav — Shared sticky glassmorphic navigation for public pages
// Layer: app (routing layer)
// Imports: shared/ui ONLY — FSD compliant
// =============================================================================

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/pricing' },
];

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 'var(--space-6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: scrolled ? 'var(--color-bg-overlay)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
          transition:
            'background-color var(--duration-slow) var(--ease-standard), border-color var(--duration-slow) var(--ease-standard)',
        }}
      >
        {/* Max-width wrapper */}
        <div
          style={{
            width: '100%',
            maxWidth: 'var(--content-max-width)',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-8)',
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              fontFamily: 'var(--font-display)',
              letterSpacing: 'var(--letter-spacing-tight)',
              background:
                'linear-gradient(135deg, var(--color-primary), var(--color-accent-violet))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            ExamKiller
          </Link>

          {/* Desktop links */}
          <div
            className="nav-desktop-links"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-8)',
            }}
          >
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 'var(--font-weight-medium)',
                  textDecoration: 'none',
                  transition: 'color var(--duration-fast) var(--ease-standard)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}
          >
            <div className="nav-desktop-links" style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button as={Link} href="/auth/login" variant="ghost" size="sm">
                Sign In
              </Button>
              <Button as={Link} href="/auth/signup" variant="primary" size="sm">
                Get Started
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="nav-mobile-toggle"
              style={{
                display: 'none', // shown via CSS below
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 49,
            paddingTop: 'var(--topbar-height)',
            backgroundColor: 'var(--color-bg-base)',
            display: 'flex',
            flexDirection: 'column',
            padding: 'calc(var(--topbar-height) + var(--space-6)) var(--space-6) var(--space-6)',
            gap: 'var(--space-2)',
          }}
        >
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'block',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          ))}
          <div
            style={{
              marginTop: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <Button
              as={Link}
              href="/auth/login"
              variant="secondary"
              size="lg"
              style={{ width: '100%' }}
            >
              Sign In
            </Button>
            <Button
              as={Link}
              href="/auth/signup"
              variant="primary"
              size="lg"
              style={{ width: '100%' }}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      )}

      {/* Responsive CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 767px) {
          .nav-desktop-links { display: none !important; }
          .nav-mobile-toggle  { display: flex !important; }
        }
      `,
        }}
      />
    </>
  );
}
