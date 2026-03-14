import Link from 'next/link';

// =============================================================================
// PublicFooter — Shared footer for public pages
// Layer: app (routing layer)
// FSD: No imports from features/ or widgets/
// =============================================================================

const FOOTER_COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'How It Works', href: '/#how-it-works' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-16) var(--space-6) var(--space-8)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--content-max-width)',
          margin: '0 auto',
        }}
      >
        {/* Top row: brand + columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr repeat(3, auto)',
            gap: 'var(--space-16)',
            alignItems: 'start',
            flexWrap: 'wrap',
          }}
        >
          {/* Brand */}
          <div style={{ maxWidth: '260px' }}>
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
                display: 'block',
                marginBottom: 'var(--space-3)',
              }}
            >
              ExamKiller
            </Link>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 'var(--line-height-relaxed)',
                maxWidth: '200px',
              }}
            >
              Academic rigor meets digital delight. Built for Nigerian university students.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--letter-spacing-wider)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                {col.heading}
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                        transition: 'color var(--duration-fast) var(--ease-standard)',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = 'var(--color-text-primary)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = 'var(--color-text-secondary)')
                      }
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div
          style={{
            marginTop: 'var(--space-16)',
            paddingTop: 'var(--space-6)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <p
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}
          >
            © {new Date().getFullYear()} ExamKiller. All rights reserved.
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-editorial)',
              fontStyle: 'italic',
              margin: 0,
            }}
          >
            Built for students who refuse to fail.
          </p>
        </div>
      </div>

      {/* Responsive overrides */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 767px) {
          footer > div > div:first-child {
            grid-template-columns: 1fr 1fr !important;
            gap: var(--space-8) !important;
          }
          footer > div > div:first-child > div:first-child {
            grid-column: 1 / -1;
          }
        }
      `,
        }}
      />
    </footer>
  );
}
