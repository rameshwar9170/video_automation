'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  FlaskConical,
  Youtube,
  Settings,
  Bot,
  Menu,
  X,
  Palette,
  Film,
  Sparkles,
  Radio,
  Layers,
} from 'lucide-react';

const techNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/videos', label: 'Tech Videos', icon: Video },
  { href: '/research', label: 'AI Topics & Research', icon: FlaskConical },
  { href: '/youtube', label: 'Tech YouTube', icon: Youtube },
];

const cartoonNavItems = [
  { href: '/cartoon', label: 'Cartoon Studio', icon: Palette },
  { href: '/cartoon?tab=series', label: 'Series Mode (Ep 1-3)', icon: Film },
  { href: '/cartoon?tab=channel', label: 'Cartoon YouTube', icon: Radio },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'stories';
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bot size={22} color="#818cf8" />
          <span style={{ fontWeight: 800, fontSize: 16, background: 'linear-gradient(135deg, var(--accent-light), #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI YouTube Agent
          </span>
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Bot size={22} color="#818cf8" />
              <h1>AI YouTube Agent</h1>
            </div>
            <button
              className="mobile-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
          <p>Multi-Channel Autonomous Studio</p>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {/* ── Compartment 1: AI Tech Channel ───────────────────────────── */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '4px 10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={12} color="#818cf8" /> Channel 1 • Tech
              </span>
              <span style={{ fontSize: 9, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                ACTIVE
              </span>
            </div>

            {techNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href === '/dashboard' && pathname === '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{ marginBottom: 2 }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* ── Compartment 2: Indian Cartoon Studio (New 2nd Channel) ───── */}
          <div
            style={{
              paddingTop: 12,
              borderTop: '1px solid rgba(236, 72, 153, 0.18)',
              background: 'linear-gradient(180deg, rgba(236, 72, 153, 0.04) 0%, transparent 100%)',
              borderRadius: 'var(--radius-md)',
              paddingBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#ec4899',
                padding: '4px 10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} color="#ec4899" /> Channel 2 • Cartoon
              </span>
              <span
                style={{
                  fontSize: 9,
                  background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                  color: '#fff',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 800,
                }}
              >
                2ND CH
              </span>
            </div>

            {cartoonNavItems.map(({ href, label, icon: Icon }) => {
              const [targetPath, queryString] = href.split('?');
              const itemTab = queryString ? new URLSearchParams(queryString).get('tab') : 'stories';
              const isCartoonPage = pathname === '/cartoon';
              const isActive =
                isCartoonPage &&
                ((href === '/cartoon' && currentTab === 'stories') ||
                  (href.includes('tab=') && currentTab === itemTab));

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    marginBottom: 2,
                    ...(isActive ? { color: '#f472b6', borderColor: '#ec4899' } : {}),
                  }}
                >
                  <Icon size={16} color={isActive ? '#ec4899' : undefined} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ── Footer Compartment: Settings ─────────────────────────────── */}
        <div style={{ padding: '12px 14px 34px', borderTop: '1px solid var(--border)' }}>
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className={`nav-item ${pathname.startsWith('/settings') ? 'active' : ''}`}
            style={{ marginBottom: 6 }}
          >
            <Settings size={16} />
            <span>Platform Settings</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>v2.0 • Multi-Channel</span>
            <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>● Online</span>
          </div>
        </div>
      </aside>
    </>
  );
}
