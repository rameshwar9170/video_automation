'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/common/Sidebar';
import { schedulerApi, researchApi } from '@/services/youtube.api';
import { videoApi } from '@/services/video.api';
import { VIDEO_STATUS_STEPS, VideoStatus } from '@/types';
import Link from 'next/link';
import {
  Play, Square, Zap, CheckCircle, Circle, Loader2,
  TrendingUp, Video, AlertCircle, BookOpen, ExternalLink, Download, Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { CreateVideoModal } from '@/components/common/CreateVideoModal';

function getStepState(step: VideoStatus, currentStatus?: VideoStatus): 'done' | 'active' | 'pending' {
  if (!currentStatus || currentStatus === 'FAILED') return 'pending';
  if (currentStatus === 'PUBLISHED') return 'done';
  if (currentStatus === 'READY_TO_PUBLISH') {
    const steps = VIDEO_STATUS_STEPS.map((s) => s.status);
    const readyIdx = steps.indexOf('READY_TO_PUBLISH');
    const stepIdx = steps.indexOf(step);
    if (stepIdx <= readyIdx) return 'done';
    return 'pending';
  }
  const steps = VIDEO_STATUS_STEPS.map((s) => s.status);
  const currentIdx = steps.indexOf(currentStatus);
  const stepIdx = steps.indexOf(step);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

function StepIcon({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') return <CheckCircle size={16} className="step-icon done" style={{ background: 'none' }} color="var(--success)" />;
  if (state === 'active') return <Loader2 size={16} className="step-icon active" style={{ background: 'none', animation: 'spin 1s linear infinite' }} color="var(--accent-light)" />;
  return <Circle size={16} color="var(--text-muted)" />;
}

export default function DashboardPage() {
  const qc = useQueryClient();

  const { data: schedulerData } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: () => schedulerApi.getStatus(),
    refetchInterval: 5000,
  });

  const { data: videosData } = useQuery({
    queryKey: ['videos', 'dashboard'],
    queryFn: () => videoApi.list({ limit: 5 }),
    refetchInterval: 5000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['video-stats'],
    queryFn: () => videoApi.getStats(),
    refetchInterval: 5000,
  });

  const { data: topicsData } = useQuery({
    queryKey: ['topics-today'],
    queryFn: () => researchApi.getTopics(),
    refetchInterval: 30000,
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const startMutation = useMutation({
    mutationFn: () => schedulerApi.start(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduler-status'] });
      qc.invalidateQueries({ queryKey: ['video-stats'] });
      showToast('Autonomous scheduler activated! Videos will generate according to schedule.');
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => schedulerApi.stop(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduler-status'] });
      qc.invalidateQueries({ queryKey: ['video-stats'] });
      showToast('Autonomous scheduler stopped.', 'info');
    },
  });

  const triggerMutation = useMutation({
    mutationFn: () => schedulerApi.triggerNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] });
      qc.invalidateQueries({ queryKey: ['video-stats'] });
      qc.invalidateQueries({ queryKey: ['scheduler-status'] });
      showToast('Video generation started! Watch the pipeline progress below.');
    },
  });

  const scheduler = schedulerData?.data;
  const videos = videosData?.data ?? [];
  const topics = topicsData?.data ?? [];
  const stats = statsData?.data;

  // Active generation detection:
  // ONLY the most recent video (videos[0]) can be actively generating.
  // It is active if its status is neither PUBLISHED nor FAILED,
  // and it has been updated recently (<15 minutes) or scheduler is actively running.
  const latestVideo = videos.length > 0 ? videos[0] : null;

  const isVideoStale = (v: typeof latestVideo) => {
    if (!v) return true;
    const updatedAt = new Date(v.updatedAt || v.createdAt).getTime();
    const ageMinutes = (Date.now() - updatedAt) / (1000 * 60);
    return ageMinutes > 15 && !scheduler?.running;
  };

  const activeVideo =
    latestVideo &&
    latestVideo.status !== 'PUBLISHED' &&
    latestVideo.status !== 'FAILED' &&
    !isVideoStale(latestVideo)
      ? latestVideo
      : null;

  const published = stats?.publishedToday ?? videos.filter((v) => v.status === 'PUBLISHED').length;
  const failed = stats?.failedToday ?? videos.filter((v) => v.status === 'FAILED').length;

  const formatNextRun = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-in">
        <div className="page-title">Dashboard</div>
        <p className="page-subtitle">AI is managing your YouTube Shorts autonomously.</p>

        {/* Action Feedback Banner */}
        {toast && (
          <div className={`toast-banner ${toast.type}`}>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Autonomous Mode Banner */}
        <div className="autonomous-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className={`dot ${scheduler?.enabled ? 'dot-green' : 'dot-red'}`} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Autonomous Mode {scheduler?.enabled ? 'ON' : 'OFF'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {scheduler?.enabled
                  ? `Next run: ${formatNextRun(scheduler.nextRun)}`
                  : 'Enable to start automatic video generation'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {scheduler?.enabled ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
              >
                {stopMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="spin" /> Stopping…
                  </>
                ) : (
                  <>
                    <Square size={13} /> Stop
                  </>
                )}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="spin" /> Starting…
                  </>
                ) : (
                  <>
                    <Play size={13} /> Start
                  </>
                )}
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsModalOpen(true)}
              style={{ background: 'linear-gradient(135deg, var(--accent), #a855f7)' }}
              title="Create custom topic or multi-part series"
            >
              <Sparkles size={13} /> Create Video / Series
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending || scheduler?.running}
              title="Trigger auto trending video now"
            >
              {triggerMutation.isPending || scheduler?.running ? (
                <>
                  <Loader2 size={13} className="spin" /> Generating…
                </>
              ) : (
                <>
                  <Zap size={13} /> Auto Trend Now
                </>
              )}
            </button>
          </div>
        </div>

        <CreateVideoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => showToast('Video / Series generation started! Watch the pipeline progress below.')}
        />

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Published Today</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{published}</div>
            <div className="stat-sub">
              {stats?.publishedTotal !== undefined ? `${stats.publishedTotal} total videos live` : 'videos live on YouTube'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value" style={{ color: failed > 0 ? 'var(--error)' : 'var(--text-primary)' }}>{failed}</div>
            <div className="stat-sub">{failed > 0 ? `${failed} failed today (retryable)` : 'all systems running normally'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Topics Researched</div>
            <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{topics.length}</div>
            <div className="stat-sub">candidates found today</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pipeline Status</div>
            <div className="stat-value" style={{ fontSize: 16, marginTop: 10, color: scheduler?.running ? 'var(--warning)' : 'var(--text-secondary)' }}>
              {scheduler?.running ? '⚡ Running' : '● Idle'}
            </div>
            <div className="stat-sub">{scheduler?.running ? 'generating video' : 'awaiting schedule'}</div>
          </div>
        </div>

        {/* Live Activity */}
        <div className="settings-grid">
          {/* Pipeline Steps */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🔎 Current AI Activity</span>
              {activeVideo && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {activeVideo.progress}%
                </span>
              )}
            </div>
            {activeVideo ? (
              <>
                <div className="progress-bar" style={{ marginBottom: 16 }}>
                  <div className="progress-fill" style={{ width: `${activeVideo.progress}%` }} />
                </div>
                <div className="pipeline-steps">
                  {VIDEO_STATUS_STEPS.map(({ status, label }) => {
                    const state = getStepState(status, activeVideo.status as VideoStatus);
                    return (
                      <div key={status} className={`pipeline-step ${state}`}>
                        <StepIcon state={state} />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>

                {activeVideo.status === 'READY_TO_PUBLISH' && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: '16px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 700, fontSize: 14 }}>
                        <CheckCircle size={18} /> Video Generation Complete (Saved Locally)
                      </div>
                      <span className="badge badge-published">Score 100/100</span>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      "{activeVideo.title ?? activeVideo.topic?.topic}"
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <Link href={`/videos/${activeVideo.id}`} className="btn btn-primary btn-sm">
                        <Play size={13} /> Watch & Details
                      </Link>
                      <a
                        href={`http://localhost:4000/generated/videos/${activeVideo.id}.mp4`}
                        download={`${activeVideo.title ?? 'short'}.mp4`}
                        className="btn btn-secondary btn-sm"
                      >
                        <Download size={13} /> Download MP4
                      </a>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {latestVideo && latestVideo.status === 'PUBLISHED' && (
                  <div
                    style={{
                      padding: '14px 16px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle size={18} color="var(--success)" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          Latest Video Published & Live on YouTube
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          "{latestVideo.title || latestVideo.topic?.topic || 'Latest Short'}"
                        </div>
                      </div>
                    </div>
                    {latestVideo.youtubeVideoId && (
                      <a
                        href={`https://youtube.com/shorts/${latestVideo.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <ExternalLink size={13} /> View on YouTube
                      </a>
                    )}
                  </div>
                )}
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <Video size={32} color="var(--text-muted)" />
                  <p style={{ marginTop: 10 }}>
                    {scheduler?.enabled
                      ? `Pipeline idle — waiting for next run at ${formatNextRun(scheduler.nextRun)}`
                      : 'Pipeline idle. Enable autonomous mode or click "Create Video / Series" to generate.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Topics */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 Recent Research</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{topics.length} topics</span>
            </div>
            {topics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topics.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.topic}
                    </span>
                    <span className={`badge ${t.status === 'SELECTED' || t.status === 'USED' ? 'badge-published' : 'badge-default'}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <BookOpen size={32} color="var(--text-muted)" />
                <p style={{ marginTop: 10 }}>No research data yet today</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
