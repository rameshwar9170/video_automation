'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/common/Sidebar';
import { settingsApi } from '@/services/settings.api';
import { ChannelSettings } from '@/types';
import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle } from 'lucide-react';

const NICHES = ['AI & Technology', 'Science', 'Finance', 'Health & Fitness', 'Entertainment', 'Education', 'Gaming', 'Sports'];
const LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese'];
const REGIONS = ['Global', 'India', 'United States', 'United Kingdom', 'Europe', 'Asia'];
const STYLES = ['Informative', 'Entertaining', 'Educational', 'Inspirational', 'News'];
const TONES = ['Engaging', 'Professional', 'Casual', 'Energetic', 'Calm'];
const AI_PROVIDERS = ['gemini'];
const VOICE_PROVIDERS = ['elevenlabs'];
const VISUAL_PROVIDERS = ['imagen'];

const DEFAULT_SETTINGS: Partial<ChannelSettings> = {
  niche: 'AI & Technology',
  language: 'English',
  region: 'Global',
  videosPerDay: 2,
  preferredTimes: ['01:00', '13:00'],
  style: 'Informative',
  tone: 'Engaging',
  targetAudience: 'Tech enthusiasts',
  durationMin: 30,
  durationMax: 60,
  autoPublish: false,
  autoResearch: true,
  aiProvider: 'gemini',
  voiceProvider: 'elevenlabs',
  visualProvider: 'motion_video',
  retryLimit: 3,
  qualityThreshold: 70,
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<ChannelSettings>>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  useEffect(() => {
    if (data?.data) {
      setForm({ ...DEFAULT_SETTINGS, ...data.data });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (d: Partial<ChannelSettings>) => settingsApi.save(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const set = (key: keyof ChannelSettings, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const timesStr = form.preferredTimes?.join(', ') ?? '';

  if (isLoading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div className="page-title">Settings</div>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Configure your AI agent's behavior</p>
          </div>
          <button
            className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <><Loader2 size={15} className="spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle size={15} color="var(--success)" /> Saved!</>
            ) : (
              <><Save size={15} /> Save Settings</>
            )}
          </button>
        </div>

        {saved && (
          <div className="toast-banner success">
            <span>Settings saved successfully! Updated preferences are active.</span>
            <button
              onClick={() => setSaved(false)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
        )}

        <div className="settings-grid">

          {/* Channel Section */}
          <div className="card">
            <div className="card-header"><span className="card-title">📺 Channel</span></div>

            <div className="form-group">
              <label className="form-label">Channel Name</label>
              <input className="form-input" value={form.channelName ?? ''} onChange={(e) => set('channelName', e.target.value)} placeholder="My Tech Channel" />
            </div>

            <div className="form-group">
              <label className="form-label">Content Niche</label>
              <select className="form-select" value={form.niche} onChange={(e) => set('niche', e.target.value)}>
                {NICHES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-select" value={form.language} onChange={(e) => set('language', e.target.value)}>
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Region</label>
              <select className="form-select" value={form.region} onChange={(e) => set('region', e.target.value)}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Content Section */}
          <div className="card">
            <div className="card-header"><span className="card-title">🎬 Content</span></div>

            <div className="form-group">
              <label className="form-label">Video Style</label>
              <select className="form-select" value={form.style} onChange={(e) => set('style', e.target.value)}>
                {STYLES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tone</label>
              <select className="form-select" value={form.tone} onChange={(e) => set('tone', e.target.value)}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <input className="form-input" value={form.targetAudience ?? ''} onChange={(e) => set('targetAudience', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Min Duration (s)</label>
                <input type="number" className="form-input" value={form.durationMin} onChange={(e) => set('durationMin', Number(e.target.value))} min={15} max={60} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Duration (s)</label>
                <input type="number" className="form-input" value={form.durationMax} onChange={(e) => set('durationMax', Number(e.target.value))} min={30} max={180} />
              </div>
            </div>
          </div>

          {/* Automation Section */}
          <div className="card">
            <div className="card-header"><span className="card-title">⚡ Automation</span></div>

            <div className="form-group">
              <label className="form-label">Videos Per Day</label>
              <input type="number" className="form-input" value={form.videosPerDay} onChange={(e) => set('videosPerDay', Number(e.target.value))} min={1} max={10} />
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Times (comma-separated, 24h)</label>
              <input
                className="form-input"
                value={timesStr}
                onChange={(e) => set('preferredTimes', e.target.value.split(',').map((t) => t.trim()))}
                placeholder="01:00, 13:00"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              <div className="toggle-wrapper">
                <label className="toggle">
                  <input type="checkbox" checked={form.autoPublish ?? false} onChange={(e) => set('autoPublish', e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Auto Publish</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Publish videos directly to YouTube</div>
                </div>
              </div>

              <div className="toggle-wrapper">
                <label className="toggle">
                  <input type="checkbox" checked={form.autoResearch ?? true} onChange={(e) => set('autoResearch', e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Auto Research</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI selects topics automatically</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI & System Section */}
          <div className="card">
            <div className="card-header"><span className="card-title">🤖 AI & System</span></div>

            <div className="form-group">
              <label className="form-label">AI Provider</label>
              <select className="form-select" value={form.aiProvider} onChange={(e) => set('aiProvider', e.target.value)}>
                {AI_PROVIDERS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Voice Provider</label>
              <select className="form-select" value={form.voiceProvider} onChange={(e) => set('voiceProvider', e.target.value)}>
                {VOICE_PROVIDERS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Visual & Motion Provider</label>
              <select className="form-select" value={form.visualProvider} onChange={(e) => set('visualProvider', e.target.value)}>
                <option value="motion_video">Real Motion Videos (Stock B-Roll: Pexels / Mixkit)</option>
                <option value="hybrid">Hybrid (Real Motion Video + AI Image Fallback)</option>
                <option value="imagen">Static AI Images (Google Imagen with Zoom/Pan)</option>
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Real Motion Videos downloads actual live video clips (people walking, actions, timelapse) instead of still pictures.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Retry Limit</label>
                <input type="number" className="form-input" value={form.retryLimit} onChange={(e) => set('retryLimit', Number(e.target.value))} min={1} max={10} />
              </div>
              <div className="form-group">
                <label className="form-label">Quality Threshold</label>
                <input type="number" className="form-input" value={form.qualityThreshold} onChange={(e) => set('qualityThreshold', Number(e.target.value))} min={50} max={100} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
