'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/common/Sidebar';
import { youtubeApi } from '@/services/youtube.api';
import {
  CheckCircle,
  Youtube,
  ExternalLink,
  AlertCircle,
  Loader2,
  KeyRound,
  Info,
  Users,
  Eye,
  Video,
  Copy,
  Check,
  Radio,
  PlaySquare,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

function formatNumber(num?: string | number | null) {
  if (!num) return '0';
  const n = Number(num);
  if (isNaN(n)) return String(num);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function YouTubePage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const [isConnecting, setIsConnecting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['youtube-channel'],
    queryFn: () => youtubeApi.getChannel(),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => youtubeApi.disconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['youtube-channel'] }),
  });

  const channel = data?.data;

  const handleCopyChannelId = () => {
    if (channel?.channelId) {
      navigator.clipboard.writeText(channel.channelId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setSetupError(null);
      const res = await youtubeApi.getConnectUrl();
      if (res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        setIsConnecting(false);
      }
    } catch (err: any) {
      setIsConnecting(false);
      const msg = err.message || err.response?.data?.message || 'Failed to connect to backend server.';
      setSetupError(msg);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-in">
        <div className="page-title">YouTube Connection</div>
        <p className="page-subtitle">Connect your YouTube channel to enable automatic publishing and live statistics.</p>

        {connected === 'true' && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8,
              color: 'var(--success)',
              marginBottom: 20,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle size={16} /> YouTube channel connected successfully!
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              color: 'var(--error)',
              marginBottom: 20,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} /> OAuth authorization failed. Check your Google Cloud settings.
          </div>
        )}

        {setupError && (
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 8,
              color: 'var(--error)',
              marginBottom: 20,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4 }}>
              <AlertCircle size={16} /> Connection Notice
            </div>
            <div>{setupError}</div>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : channel?.connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1040 }}>
            {/* Channel Profile Hero Card */}
            <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  {channel.avatarUrl ? (
                    <img
                      src={channel.avatarUrl}
                      alt={channel.channelName ?? 'Channel'}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        border: '2px solid var(--accent)',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'rgba(255,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Youtube size={32} color="#ff0000" />
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20, fontWeight: 800 }}>{channel.channelName}</span>
                      <span className="badge badge-published" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Radio size={10} color="var(--success)" /> Live Connected
                      </span>
                    </div>

                    {channel.customUrl && (
                      <div style={{ fontSize: 13, color: 'var(--accent-light)', marginTop: 2, fontWeight: 600 }}>
                        {channel.customUrl}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>Channel ID:</span>
                      <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                        {channel.channelId}
                      </code>
                      <button
                        onClick={handleCopyChannelId}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copied ? 'var(--success)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href={channel.customUrl ? `https://youtube.com/${channel.customUrl}` : `https://youtube.com/channel/${channel.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <ExternalLink size={13} /> View Channel
                  </a>
                  <a
                    href="https://studio.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <PlaySquare size={13} /> YouTube Studio
                  </a>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>
              </div>
            </div>

            {/* Key Live Statistics Cards */}
            <div className="stat-grid" style={{ marginBottom: 0 }}>
              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="stat-label">Subscribers</div>
                  <Users size={18} color="var(--accent)" />
                </div>
                <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(channel.subscriberCount)}
                </div>
                <div className="stat-sub">channel audience</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="stat-label">Total Views</div>
                  <Eye size={18} color="var(--success)" />
                </div>
                <div className="stat-value" style={{ color: 'var(--success)' }}>
                  {formatNumber(channel.viewCount)}
                </div>
                <div className="stat-sub">lifetime views across all content</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="stat-label">Total Videos</div>
                  <Video size={18} color="#f59e0b" />
                </div>
                <div className="stat-value" style={{ color: '#f59e0b' }}>
                  {formatNumber(channel.videoCount)}
                </div>
                <div className="stat-sub">uploaded videos & shorts</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="stat-label">Auto-Publish</div>
                  <Radio size={18} color="var(--accent-light)" />
                </div>
                <div className="stat-value" style={{ fontSize: 18, marginTop: 8 }}>
                  {channel.autoPublish ? (
                    <span style={{ color: 'var(--success)' }}>Active (Public)</span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>Off (Private Draft)</span>
                  )}
                </div>
                <div className="stat-sub">configured in channel settings</div>
              </div>
            </div>

            {/* Recent Channel Uploads */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📺 Recent Channel Videos & Shorts</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {channel.recentVideos?.length ?? 0} recent videos found
                </span>
              </div>

              {channel.recentVideos && channel.recentVideos.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                  }}
                >
                  {channel.recentVideos.map((vid: any) => (
                    <a
                      key={vid.videoId}
                      href={`https://youtube.com/watch?v=${vid.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card"
                      style={{
                        padding: 12,
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'transform 0.2s, border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {vid.thumbnail ? (
                        <div style={{ position: 'relative', width: '100%', height: 140, borderRadius: 8, overflow: 'hidden' }}>
                          <img
                            src={vid.thumbnail}
                            alt={vid.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: 140, background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Youtube size={32} color="#ff0000" />
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>
                          {vid.title}
                        </div>
                        {vid.publishedAt && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(vid.publishedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                  <Youtube size={36} color="#ff0000" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>No recent videos found on this channel yet</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 360, margin: '4px auto 0' }}>
                    Videos created by your AI Agent will automatically publish here when auto-publish is active!
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 960 }}>
            {/* Connection Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: 'rgba(255,0,0,0.1)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Youtube size={24} color="#ff0000" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>YouTube Channel</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status: Not Connected</div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
                Connect your YouTube channel using Google OAuth 2.0 to grant permission to automatically publish generated Shorts.
              </p>

              <div
                style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: 20,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                }}
              >
                <Info size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Note:</strong> Videos can still be generated and downloaded locally even without YouTube connected!
                </span>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={isConnecting}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={16} className="spin" /> Connecting to Google…
                  </>
                ) : (
                  <>
                    <Youtube size={16} /> Connect YouTube Channel
                  </>
                )}
              </button>
            </div>

            {/* Google OAuth Setup Guide */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <KeyRound size={20} color="var(--accent)" />
                <span className="card-title" style={{ fontSize: 15 }}>Google OAuth Credentials</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                OAuth credentials configured for this application:
              </p>

              <div
                style={{
                  background: 'var(--bg-primary)',
                  borderRadius: 6,
                  padding: '12px 14px',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  lineHeight: 1.8,
                }}
              >
                <div style={{ color: 'var(--success)' }}>✓ GOOGLE_CLIENT_ID configured</div>
                <div style={{ color: 'var(--success)' }}>✓ GOOGLE_CLIENT_SECRET configured</div>
                <div style={{ color: 'var(--accent-light)' }}>Redirect URI: http://localhost:4000/api/youtube/callback</div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.7 }}>
                Click <strong>Connect YouTube Channel</strong> to authorize access to your YouTube channel.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
