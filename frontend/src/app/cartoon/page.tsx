'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/common/Sidebar';
import {
  cartoonApi,
  CartoonTheme,
  CartoonChannelStatus,
  CartoonScriptPreviewData,
} from '@/services/cartoon.api';
import {
  Palette,
  Sparkles,
  Play,
  Loader2,
  CheckCircle2,
  Film,
  ExternalLink,
  Flame,
  Globe,
  Smile,
  X,
  Radio,
  Layers,
  Users,
  Tv,
  Check,
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle,
  Clapperboard,
  Youtube,
  ShieldCheck,
  Zap,
  ArrowRight,
  Info,
  Download,
  Copy,
  FileText,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CartoonStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'stories';
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('Clever Animal Fables');
  const [language, setLanguage] = useState('Hindi');
  const [animationStyle, setAnimationStyle] = useState('3D Pixar Disney Style Animation');
  const [tone, setTone] = useState('Playful, Funny & Dramatic');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Series Mode State
  const [seriesTitle, setSeriesTitle] = useState('Chintu Aur Jadui Samosa');
  const [totalEpisodes, setTotalEpisodes] = useState(3);
  const [characters, setCharacters] = useState('Chintu (Clever Boy), Motu Halwai (Sweet Shop Owner), Narrator (Bollywood Storyteller)');
  const [previewData, setPreviewData] = useState<CartoonScriptPreviewData | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const qc = useQueryClient();

  // Handle URL callback notification
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      const ch = searchParams.get('channel') || 'Cartoon Channel';
      setToast({ message: `Successfully connected ${ch} to Cartoon Studio!`, type: 'success' });
      qc.invalidateQueries({ queryKey: ['cartoon-channel'] });
    }
  }, [searchParams, qc]);

  // Query: Cartoon Videos
  const { data: videosData, isLoading: isVideosLoading } = useQuery({
    queryKey: ['cartoon-videos'],
    queryFn: () => cartoonApi.getVideos({ limit: 16 }),
    refetchInterval: 5000,
  });

  // Query: Themes
  const { data: themesData } = useQuery({
    queryKey: ['cartoon-themes'],
    queryFn: () => cartoonApi.getThemes(),
  });

  // Query: Channel 2 YouTube Status
  const { data: channelData, isLoading: isChannelLoading } = useQuery({
    queryKey: ['cartoon-channel'],
    queryFn: () => cartoonApi.getChannelStatus(),
    refetchInterval: 10000,
  });

  // Mutation: Single Video Generation
  const generateMutation = useMutation({
    mutationFn: () =>
      cartoonApi.generate({
        topic: topic.trim() || undefined,
        theme: selectedTheme,
        language,
        style: animationStyle,
        tone,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartoon-videos'] });
      setIsModalOpen(false);
      setToast({
        message: 'Cartoon video generation started! Visuals & voice rendering in background.',
        type: 'success',
      });
      setTimeout(() => setToast(null), 6000);
    },
    onError: (err: any) => {
      setToast({ message: `Generation error: ${err.message}`, type: 'error' });
    },
  });

  // Mutation: Episodic Series Generation (Ep 1, 2, 3...)
  const seriesMutation = useMutation({
    mutationFn: () =>
      cartoonApi.generateSeries({
        seriesTitle: seriesTitle.trim() || 'Chintu Aur Jadui Samosa',
        totalEpisodes,
        theme: selectedTheme,
        language,
        style: animationStyle,
        tone,
        characters: characters.split(',').map((c) => c.trim()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartoon-videos'] });
      setToast({
        message: `Success! Generating ${totalEpisodes}-part series "${seriesTitle}" (Episode 1, 2, 3...) with cliffhangers and character voices!`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 7000);
    },
    onError: (err: any) => {
      setToast({ message: `Series launch failed: ${err.message}`, type: 'error' });
    },
  });

  // Mutation: Script Preview
  const previewMutation = useMutation({
    mutationFn: () =>
      cartoonApi.previewScript({
        topic: seriesTitle,
        theme: selectedTheme,
        language,
        style: animationStyle,
        tone,
        seriesTitle,
        episodeNumber: 1,
        totalEpisodes,
      }),
    onSuccess: (res) => {
      setPreviewData(res.data || null);
      setIsPreviewModalOpen(true);
    },
    onError: (err: any) => {
      setToast({ message: `Script preview failed: ${err.message}`, type: 'error' });
    },
  });

  // Mutation: Toggle Auto-Publish for Channel 2
  const autoPublishMutation = useMutation({
    mutationFn: (newVal: boolean) => cartoonApi.toggleAutoPublish(newVal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartoon-channel'] });
      setToast({ message: 'Auto-publish preference updated for Cartoon Channel!', type: 'success' });
      setTimeout(() => setToast(null), 4000);
    },
  });

  // Mutation: Connect Channel 2
  const connectMutation = useMutation({
    mutationFn: () => cartoonApi.getConnectUrl(),
    onSuccess: (res) => {
      if (res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      }
    },
    onError: (err: any) => {
      setToast({ message: `Failed to get connection URL: ${err.message}`, type: 'error' });
    },
  });

  // Mutation: Disconnect Channel 2
  const disconnectMutation = useMutation({
    mutationFn: () => cartoonApi.disconnectChannel(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartoon-channel'] });
      setToast({ message: 'Channel 2 disconnected successfully.', type: 'success' });
      setTimeout(() => setToast(null), 4000);
    },
  });

  const videos = videosData?.data || [];
  const themes = themesData?.data || [];
  const channel = channelData?.data;

  // Header dynamic titles
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'series':
        return {
          title: 'Episodic Cartoon Series Engine',
          subtitle: 'Create serialized Indian cartoon stories (Ep 1, 2, 3...) with character continuity & cliffhangers',
          action: (
            <button
              className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
              onClick={() => seriesMutation.mutate()}
              disabled={seriesMutation.isPending}
            >
              {seriesMutation.isPending ? <Loader2 size={14} className="spin" /> : <Clapperboard size={14} />}
              Launch {totalEpisodes}-Part Series
            </button>
          ),
        };
      case 'channel':
        return {
          title: 'Channel 2 YouTube Integration',
          subtitle: 'Independent YouTube Shorts channel management, live statistics, and autonomous publishing',
          action: channel?.connected ? (
            <div className="badge badge-published" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}>
              <Radio size={12} color="var(--success)" /> Auto-Post Active
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? <Loader2 size={14} className="spin" /> : <Youtube size={14} />}
              Connect Channel 2
            </button>
          ),
        };
      default:
        return {
          title: 'Indian Cartoon Studio',
          subtitle: 'Autonomous 3D Pixar & Disney-style Indian animated shorts creation engine',
          action: (
            <button
              className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
              onClick={() => setIsModalOpen(true)}
            >
              <Sparkles size={14} /> Create Cartoon Short
            </button>
          ),
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-in">
        {/* Dynamic Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Palette size={26} color="#ec4899" />
              <span>{headerInfo.title}</span>
            </div>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              {headerInfo.subtitle}
            </p>
          </div>
          <div>{headerInfo.action}</div>
        </div>

        {/* Compartment Tabs Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 14,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          {[
            { id: 'stories', label: 'Cartoon Stories & Shorts', icon: Film, count: videos.length },
            { id: 'series', label: 'Episodic Series (Ep 1, 2, 3...)', icon: Clapperboard, badge: 'New AI' },
            {
              id: 'channel',
              label: 'Channel 2: YouTube Auto-Post',
              icon: Radio,
              statusDot: channel?.connected ? '#10b981' : '#f59e0b',
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => router.push(`/cartoon?tab=${tab.id}`)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                  ...(isActive ? { background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderColor: '#ec4899', color: '#fff' } : {}),
                }}
              >
                <tab.icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.18)', padding: '1px 6px', borderRadius: 10 }}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span style={{ fontSize: 10, background: '#f43f5e', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                    {tab.badge}
                  </span>
                )}
                {tab.statusDot && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: tab.statusDot,
                      display: 'inline-block',
                      marginLeft: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Toast Alert */}
        {toast && (
          <div className={`toast-banner ${toast.type}`} style={{ marginBottom: 20 }}>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1: CARTOON STORIES & SHORTS
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'stories' && (
          <>
            {/* Feature Highlights Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(139, 92, 246, 0.12))',
                border: '1px solid rgba(236, 72, 153, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 24px',
                marginBottom: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#f472b6', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Smile size={18} /> Dedicated Animated Stories Pipeline (Channel 2)
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 660, lineHeight: 1.5 }}>
                  Generates witty Indian cartoon fables with 3D Pixar character visuals, lively Indian character voices, bouncy cartoon BGM, and high-contrast comic subtitles. Completely separate from Channel 1 Tech stories!
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => router.push('/cartoon?tab=series')}>
                  <Clapperboard size={14} /> Series Mode (Ep 1, 2..)
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                  onClick={() => setIsModalOpen(true)}
                >
                  <Play size={13} /> Launch Story
                </button>
              </div>
            </div>

            {/* Popular Cartoon Story Categories */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={15} color="var(--warning)" /> Popular Indian Cartoon Themes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {themes.map((th) => (
                  <div
                    key={th.id}
                    onClick={() => {
                      setSelectedTheme(th.title);
                      setTopic(th.example);
                      setIsModalOpen(true);
                    }}
                    className="mode-option-card"
                    style={{ cursor: 'pointer', transition: 'all var(--transition)' }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{th.emoji}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{th.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{th.description}</div>
                    <div style={{ fontSize: 10, color: '#ec4899', marginTop: 8, fontWeight: 600 }}>
                      Try: &quot;{th.example}&quot;
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated Videos Grid */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Film size={18} color="#ec4899" />
                  <span>Cartoon Channel Shorts</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{videos.length} videos</span>
              </div>

              {videos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  <Palette size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>No cartoon shorts generated yet</div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 16 }}>
                    Create your first 3D Indian animated cartoon short or episodic series!
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Sparkles size={13} /> Create Cartoon Short
                  </button>
                </div>
              ) : (
                <div className="video-grid">
                  {videos.map((vid) => (
                    <div
                      key={vid.id}
                      className="video-card"
                      onClick={() => router.push(`/videos/${vid.id}`)}
                    >
                      <div className="video-thumb" style={{ background: 'linear-gradient(135deg, #4a044e, #1e1b4b)' }}>
                        <Palette size={28} color="#f472b6" />
                      </div>
                      <div className="video-card-body">
                        <div className="video-card-title">{vid.title || 'Generating Cartoon Short…'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <span className={`badge ${vid.status === 'PUBLISHED' ? 'badge-published' : 'badge-processing'}`}>
                            {vid.status}
                          </span>
                          {vid.youtubeVideoId && (
                            <a
                              href={`https://youtube.com/shorts/${vid.youtubeVideoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: '#ec4899', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                            >
                              <ExternalLink size={12} /> YouTube
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2: EPISODIC SERIES MODE (EP 1, 2, 3...)
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'series' && (
          <div>
            {/* 2-Column Series Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 28 }}>
              {/* Left Column: Series Configuration */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sliders size={18} color="#ec4899" />
                  <span>Configure Serialized Cartoon</span>
                </div>

                {/* Series Title */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Series Premise / Story Arc Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={seriesTitle}
                    onChange={(e) => setSeriesTitle(e.target.value)}
                    placeholder="e.g. Chintu Aur Jadui Samosa"
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    AI structures Episode 1, 2, 3 with continuity around this premise.
                  </div>
                </div>

                {/* Number of Episodes */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Total Number of Episodes</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { num: 2, label: '2 Episodes (Dilemma + Climax)' },
                      { num: 3, label: '3 Episodes (Standard Trilogy)' },
                      { num: 4, label: '4 Episodes (Epic Saga)' },
                    ].map((item) => (
                      <button
                        key={item.num}
                        type="button"
                        onClick={() => setTotalEpisodes(item.num)}
                        className={`btn btn-sm ${totalEpisodes === item.num ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          flexDirection: 'column',
                          padding: '10px 8px',
                          textAlign: 'center',
                          ...(totalEpisodes === item.num ? { background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' } : {}),
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: 15 }}>Ep 1 to {item.num}</span>
                        <span style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Dialogue & Voice Language</label>
                  <select className="form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="Hindi">Hindi / Hinglish (Chhota Bheem / Motu Patlu Energy)</option>
                    <option value="English">English (Indian Animated Fables Style)</option>
                    <option value="Marathi">Marathi (Funny Animated Tales)</option>
                  </select>
                </div>

                {/* Character Ensemble */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Character Acting Cast (Voices & Roles)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={characters}
                    onChange={(e) => setCharacters(e.target.value)}
                    placeholder="e.g. Chintu (Kid), Motu Halwai (Shop Uncle), Narrator (Bollywood Voice)"
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    AI generates distinct character lines like <code>[Chintu]: ...</code> and <code>[Motu Halwai]: ...</code>.
                  </div>
                </div>

                {/* Theme & Tone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Theme Genre</label>
                    <select className="form-select" value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)}>
                      <option value="Clever Animal Fables">🐵 Clever Animal Fables</option>
                      <option value="Little Inventor">🚀 Little Inventor</option>
                      <option value="Funny Everyday Chaos">😂 Funny Everyday Chaos</option>
                      <option value="Magical Quests">✨ Magical Fantasy Quests</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Narrative Tone</label>
                    <select className="form-select" value={tone} onChange={(e) => setTone(e.target.value)}>
                      <option value="Playful, Funny & Dramatic">Playful & Funny</option>
                      <option value="Wholesome & Moral">Wholesome & Moral</option>
                      <option value="Chaotic Comical Adventure">Chaotic Adventure</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => previewMutation.mutate()}
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? <Loader2 size={14} className="spin" /> : <Eye size={14} />}
                    Preview Episode 1 Script
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                    onClick={() => seriesMutation.mutate()}
                    disabled={seriesMutation.isPending}
                  >
                    {seriesMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="spin" /> Launching Series…
                      </>
                    ) : (
                      <>
                        <Clapperboard size={14} /> Launch Full Series
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Serial Narrative Blueprint */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={18} color="#ec4899" />
                    <span>How Episodic Continuity Works</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 18 }}>
                    The series engine automatically builds hooked cliffhangers to maximize YouTube Shorts retention and subscriber conversion:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#f472b6' }}>
                        <span style={{ background: '#ec4899', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>1</span>
                        Episode 1: The Dilemma & Introduction
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0 28px', lineHeight: 1.4 }}>
                        Establishes character roles (e.g. Chintu vs Motu Halwai) and triggers an unexpected chaotic event. Ends with a question hook.
                      </p>
                    </div>

                    <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
                        <span style={{ background: '#8b5cf6', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>2</span>
                        Episode 2: Chaos Escalation & Cliffhanger
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0 28px', lineHeight: 1.4 }}>
                        Instant recap hook, characters run into bigger trouble, ending with high-stakes cliffhanger: <em>&quot;To see what happens next, watch Episode 3!&quot;</em>
                      </p>
                    </div>

                    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#34d399' }}>
                        <span style={{ background: '#10b981', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>3</span>
                        Episode 3: The Climax & Hilarious Moral
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0 28px', lineHeight: 1.4 }}>
                        Ultimate funny resolution, moral takeaway, and CTA inviting audience to comment their favorite character.
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} color="var(--success)" />
                  <span>All episodes are queued and rendered sequentially to maintain narrative timeline.</span>
                </div>
              </div>
            </div>

            {/* List of Serialized Episodes */}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="#ec4899" />
                <span>Episodic Series History</span>
              </div>
              <div className="video-grid">
                {videos
                  .filter((v) => v.title?.toLowerCase().includes('episode') || v.title?.toLowerCase().includes('ep'))
                  .map((vid) => (
                    <div
                      key={vid.id}
                      className="video-card"
                      onClick={() => router.push(`/videos/${vid.id}`)}
                    >
                      <div className="video-thumb" style={{ background: 'linear-gradient(135deg, #581c87, #831843)' }}>
                        <Clapperboard size={28} color="#f472b6" />
                      </div>
                      <div className="video-card-body">
                        <div className="video-card-title">{vid.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <span className={`badge ${vid.status === 'PUBLISHED' ? 'badge-published' : 'badge-processing'}`}>
                            {vid.status}
                          </span>
                          {vid.youtubeVideoId && (
                            <a
                              href={`https://youtube.com/shorts/${vid.youtubeVideoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: '#ec4899', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                            >
                              <ExternalLink size={12} /> YouTube
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 3: CHANNEL 2: YOUTUBE AUTO-POST
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'channel' && (
          <div>
            {/* 2-Column High-Fidelity Channel Hub */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
              {/* Column 1: Channel Connection & Status */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                }}
              >
                {isChannelLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 10 }}>
                    <Loader2 size={24} className="spin" color="#ec4899" />
                    <span style={{ fontSize: 14 }}>Connecting with Channel 2 status…</span>
                  </div>
                ) : channel?.connected ? (
                  <div>
                    {/* Widescreen Banner Preview */}
                    <div
                      style={{
                        height: 140,
                        borderRadius: 'var(--radius-md)',
                        backgroundImage: 'url(/branding/kathacraft_banner.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        marginBottom: 16,
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      }}
                    />

                    {/* Connected Channel Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <img
                          src="/branding/kathacraft_logo.jpg"
                          alt="KathaCraft 3D Logo"
                          style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid #ec4899', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{channel.channelName}</span>
                            <span className="badge badge-published">Live Connected</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {channel.customUrl || channel.channelId}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {channel.channelId && (
                          <a
                            href={`https://studio.youtube.com/channel/${channel.channelId}/editing/profile`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <ExternalLink size={13} /> YouTube Studio
                          </a>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => disconnectMutation.mutate()}
                          disabled={disconnectMutation.isPending}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>

                    {/* Live Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
                      <div className="stat-card" style={{ padding: 14 }}>
                        <div className="stat-label">Subscribers</div>
                        <div className="stat-value" style={{ fontSize: 20, marginTop: 4 }}>
                          {channel.subscriberCount ? Number(channel.subscriberCount).toLocaleString() : '0'}
                        </div>
                        <div className="stat-sub" style={{ fontSize: 11 }}>Audience</div>
                      </div>
                      <div className="stat-card" style={{ padding: 14 }}>
                        <div className="stat-label">Total Views</div>
                        <div className="stat-value" style={{ fontSize: 20, marginTop: 4 }}>
                          {channel.viewCount ? Number(channel.viewCount).toLocaleString() : '0'}
                        </div>
                        <div className="stat-sub" style={{ fontSize: 11 }}>All-time</div>
                      </div>
                      <div className="stat-card" style={{ padding: 14 }}>
                        <div className="stat-label">Shorts</div>
                        <div className="stat-value" style={{ fontSize: 20, marginTop: 4 }}>
                          {channel.videoCount || '0'}
                        </div>
                        <div className="stat-sub" style={{ fontSize: 11 }}>Uploads</div>
                      </div>
                    </div>

                    {/* Auto-Publish Control */}
                    <div
                      style={{
                        background: 'rgba(236, 72, 153, 0.08)',
                        border: '1px solid rgba(236, 72, 153, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                          Autonomous Auto-Publish to KathaCraft 3D
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                          Upload cartoon shorts automatically upon render completion with optimized SEO tags.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`btn btn-sm ${channel.autoPublish ? 'btn-primary' : 'btn-secondary'}`}
                        style={channel.autoPublish ? { background: '#10b981' } : {}}
                        onClick={() => autoPublishMutation.mutate(!channel.autoPublish)}
                        disabled={autoPublishMutation.isPending}
                      >
                        {channel.autoPublish ? <Check size={14} /> : <AlertCircle size={14} />}
                        {channel.autoPublish ? 'Auto-Publish: ON' : 'Auto-Publish: OFF'}
                      </button>
                    </div>

                    {/* Brand Assets Download Suite */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={15} color="#ec4899" />
                        <span>KathaCraft 3D Branding Kit (Download Assets)</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        {/* Logo Download */}
                        <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src="/branding/kathacraft_logo.jpg"
                            alt="Logo"
                            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>Profile Avatar (1:1)</div>
                            <a
                              href="/branding/kathacraft_logo.jpg"
                              download="kathacraft_3d_avatar.jpg"
                              className="btn btn-secondary btn-sm"
                              style={{ marginTop: 4, padding: '4px 10px', fontSize: 11 }}
                            >
                              <Download size={12} /> Download Logo
                            </a>
                          </div>
                        </div>

                        {/* Banner Download */}
                        <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src="/branding/kathacraft_banner.jpg"
                            alt="Banner"
                            style={{ width: 60, height: 34, borderRadius: 4, objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>Channel Banner (16:9)</div>
                            <a
                              href="/branding/kathacraft_banner.jpg"
                              download="kathacraft_3d_banner.jpg"
                              className="btn btn-secondary btn-sm"
                              style={{ marginTop: 4, padding: '4px 10px', fontSize: 11 }}
                            >
                              <Download size={12} /> Download Banner
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Copy-Paste YouTube Info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Channel Description (About):</span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() =>
                                handleCopy(
                                  `Welcome to KathaCraft 3D! 🎬✨\nWhere Indian folklore, clever animal fables, and serialized cartoon adventures (Ep 1, 2, 3...) come to life with high-energy 3D Pixar & Disney-style animation!\n\n🌟 What We Create:\n• Serialized Indian cartoon adventures with cliffhangers\n• Hilarious fables featuring Chintu, Motu Halwai & the village ensemble\n• High-contrast comic subtitles & multi-character voice acting\n\n🎬 Daily 3D Indian Animated Shorts\n🔔 Subscribe to KathaCraft 3D and join the journey! #Shorts #Cartoon #3DAnimation #KathaCraft3D`,
                                  'desc'
                                )
                              }
                            >
                              {copiedField === 'desc' ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                              {copiedField === 'desc' ? 'Copied!' : 'Copy Bio'}
                            </button>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', maxHeight: 54, overflowY: 'auto', lineHeight: 1.4 }}>
                            Welcome to KathaCraft 3D! 🎬✨ Where Indian folklore, clever fables, and serialized cartoon adventures come to life with 3D Pixar animation…
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Channel SEO Tags & Keywords:</span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() =>
                                handleCopy(
                                  'KathaCraft 3D, Indian Cartoons, 3D Animation Shorts, Hindi Kahaniya, Moral Stories, Funny Cartoon, Desi Toons, Animated Series, Chintu Cartoons, Indian Fables',
                                  'tags'
                                )
                              }
                            >
                              {copiedField === 'tags' ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                              {copiedField === 'tags' ? 'Copied!' : 'Copy Tags'}
                            </button>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            KathaCraft 3D, Indian Cartoons, 3D Animation Shorts, Hindi Kahaniya, Moral Stories, Funny Cartoon, Desi Toons…
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(239, 68, 68, 0.15))',
                          border: '1px solid rgba(236, 72, 153, 0.3)',
                          borderRadius: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Youtube size={26} color="#ec4899" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>
                          Channel 2: Indian Cartoon Studio
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status: Not Connected</span>
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
                      Connect your second YouTube account using Google OAuth to allow your autonomous agent to publish 3D cartoon shorts, humorous animal fables, and serialized episodes directly to this channel.
                    </p>

                    {/* Notice box */}
                    <div
                      style={{
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.22)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 16px',
                        marginBottom: 20,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                      }}
                    >
                      <ShieldCheck size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>100% Isolated From Channel 1:</strong> Your primary tech channel tokens and videos remain completely untouched. Each channel operates with its own separate refresh token and publishing queue.
                      </div>
                    </div>

                    {/* Connect Button */}
                    <button
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                        padding: '12px 20px',
                        fontSize: 14,
                      }}
                      onClick={() => connectMutation.mutate()}
                      disabled={connectMutation.isPending}
                    >
                      {connectMutation.isPending ? (
                        <>
                          <Loader2 size={16} className="spin" /> Redirecting to Google…
                        </>
                      ) : (
                        <>
                          <Youtube size={17} /> Connect Channel 2 YouTube Account
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Column 2: Multi-Channel Architecture & Cartoon Defaults */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Architecture Card */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={18} color="#818cf8" />
                    <span>Dual-Channel Architecture Overview</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Tech Channel Card */}
                    <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-light)' }}>
                          Channel 1: AI Tech Stories
                        </span>
                        <span className="badge badge-published" style={{ fontSize: 10 }}>Active</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Category: Science & Tech (28) • Liam Narration • Tech BGM
                      </div>
                    </div>

                    {/* Cartoon Channel Card */}
                    <div style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#f472b6' }}>
                          Channel 2: Indian Cartoon Studio
                        </span>
                        <span className={`badge ${channel?.connected ? 'badge-published' : 'badge-processing'}`} style={{ fontSize: 10 }}>
                          {channel?.connected ? 'Connected' : 'Pending Connect'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Category: Film & Animation (1) • Multi-Character Dialogues • Cartoon BGM
                      </div>
                    </div>
                  </div>
                </div>

                {/* Publishing Defaults Card */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={16} color="#ec4899" />
                    <span>Cartoon Channel Auto-Settings</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Language:</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>Hindi / Hinglish</div>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Category ID:</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>1 (Film & Animation)</div>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Subtitles:</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>Comic Lower-Third</div>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>BGM Track:</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>cartoon-playful.mp3</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            MODAL: CREATE SINGLE CARTOON SHORT
           ═══════════════════════════════════════════════════════════════════════ */}
        {isModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <Palette size={20} color="#ec4899" />
                  <span>Create 3D Cartoon Short</span>
                </div>
                <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="feature-pill-banner" style={{ color: '#f472b6', borderColor: 'rgba(236,72,153,0.3)', background: 'rgba(236,72,153,0.08)' }}>
                  <CheckCircle2 size={16} />
                  <span>3D Pixar Animation Visuals + Bouncy Cartoon Music + Expressive Hindi Voice + Subtitles</span>
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Story Premise / Character Idea</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Clever Monkey Outsmarts Greedy Crocodile or Flying Homework Machine"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Leave blank to let AI auto-invent a hilarious fable.
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Story Theme</label>
                  <select className="form-select" value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)}>
                    <option value="Clever Animal Fables">🐵 Clever Animal Fables (Moral & Funny)</option>
                    <option value="Little Inventor">🚀 Little Inventor (Crazy Inventions)</option>
                    <option value="Funny Everyday Chaos">😂 Funny Everyday Chaos (Relatable Humor)</option>
                    <option value="Magical Quests">✨ Magical Fantasy Quests</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Language</label>
                  <select className="form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="Hindi">Hindi / Hinglish</option>
                    <option value="English">English</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Animation Style</label>
                    <select className="form-select" value={animationStyle} onChange={(e) => setAnimationStyle(e.target.value)}>
                      <option value="3D Pixar Disney Style Animation">3D Pixar / Disney Style</option>
                      <option value="Cute 3D Anime Style">Cute 3D Anime Style</option>
                      <option value="Vibrant 2D Comic Cartoon">Vibrant 2D Comic Cartoon</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Narrative Tone</label>
                    <select className="form-select" value={tone} onChange={(e) => setTone(e.target.value)}>
                      <option value="Playful, Funny & Dramatic">Playful & Funny</option>
                      <option value="Wholesome & Moral">Wholesome & Moral</option>
                      <option value="Chaotic Comical Adventure">Chaotic Adventure</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)} disabled={generateMutation.isPending}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 size={13} className="spin" /> Generating Story…
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} /> Launch Cartoon Short
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            MODAL: SCRIPT PREVIEW
           ═══════════════════════════════════════════════════════════════════════ */}
        {isPreviewModalOpen && previewData && (
          <div className="modal-backdrop" onClick={() => setIsPreviewModalOpen(false)}>
            <div className="modal-content" style={{ maxWidth: 700, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <Clapperboard size={20} color="#ec4899" />
                  <span>Script & Voice Acting Preview: {previewData.title}</span>
                </div>
                <button className="modal-close-btn" onClick={() => setIsPreviewModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div style={{ background: 'rgba(236,72,153,0.08)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, color: '#f472b6', fontSize: 13 }}>Hook Opening:</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>&quot;{previewData.hook}&quot;</div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
                  Scene-by-Scene Character Dialogues & Visuals:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {previewData.scenes.map((scene) => (
                    <div
                      key={scene.sceneNumber}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#ec4899' }}>
                          Scene {scene.sceneNumber} ({scene.duration}s)
                        </span>
                        <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 10 }}>
                          Actor: {scene.characterName || 'Narrator'} ({scene.voiceTone || 'expressive'})
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                        {scene.caption || scene.narration}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Visual: {scene.visualInstruction}
                      </div>
                    </div>
                  ))}
                </div>

                {previewData.moralLesson && (
                  <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <strong>Moral Takeaway:</strong> {previewData.moralLesson}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsPreviewModalOpen(false)}>
                  Close Preview
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    seriesMutation.mutate();
                  }}
                >
                  <Clapperboard size={14} /> Launch Full Series Now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
