'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/common/Sidebar';
import { videoApi } from '@/services/video.api';
import { VIDEO_STATUS_STEPS, VideoStatus } from '@/types';
import {
  ExternalLink, RefreshCw, CheckCircle, AlertCircle,
  Loader2, ArrowLeft, Calendar, Hash, FileText, Youtube
} from 'lucide-react';
import Link from 'next/link';

function getStepState(step: VideoStatus, current?: VideoStatus): 'done' | 'active' | 'pending' {
  if (!current || current === 'FAILED') return 'pending';
  if (current === 'PUBLISHED') return 'done';
  if (current === 'READY_TO_PUBLISH') {
    const steps = VIDEO_STATUS_STEPS.map((s) => s.status);
    const readyIdx = steps.indexOf('READY_TO_PUBLISH');
    const stepIdx = steps.indexOf(step);
    if (stepIdx <= readyIdx) return 'done';
    return 'pending';
  }
  const steps = VIDEO_STATUS_STEPS.map((s) => s.status);
  const ci = steps.indexOf(current);
  const si = steps.indexOf(step);
  if (si < ci) return 'done';
  if (si === ci) return 'active';
  return 'pending';
}

export default function VideoDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoApi.getById(id),
    refetchInterval: (q) => {
      const status = q.state.data?.data?.status;
      if (!status) return 3000;
      if (['PUBLISHED', 'FAILED', 'READY_TO_PUBLISH'].includes(status)) return false;
      return 3000;
    },
  });

  const [toast, setToast] = useState<string | null>(null);

  const retryMutation = useMutation({
    mutationFn: () => videoApi.retry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video', id] });
      setToast('Video retry initiated! Pipeline is running.');
      setTimeout(() => setToast(null), 4000);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => videoApi.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video', id] });
      setToast('🎉 Video successfully published to YouTube!');
      setTimeout(() => setToast(null), 5000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to publish to YouTube';
      alert(`YouTube Upload: ${msg}`);
    },
  });

  const video = data?.data;

  if (isLoading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={40} color="var(--accent)" className="spin" />
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Link href="/videos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, marginBottom: 20 }}>
            <ArrowLeft size={14} /> Back to Videos
          </Link>
          <div className="empty-state">
            <AlertCircle size={48} color="var(--error)" />
            <h3>Video not found</h3>
            <p>The requested video ID does not exist or may have been deleted.</p>
          </div>
        </main>
      </div>
    );
  }

  const isActive = !['PUBLISHED', 'FAILED', 'READY_TO_PUBLISH'].includes(video.status);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <Link href="/videos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to Videos
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {video.status !== 'PUBLISHED' && video.videoPath && (
              <button
                className="btn btn-primary btn-sm"
                style={{ background: '#ff0000', borderColor: '#ff0000', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? <Loader2 size={13} className="spin" /> : <Youtube size={14} />}
                {publishMutation.isPending ? 'Uploading to YouTube…' : 'Publish to YouTube'}
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => qc.invalidateQueries({ queryKey: ['video', id] })}
              title="Refresh status"
            >
              <RefreshCw size={13} /> Refresh Status
            </button>
          </div>
        </div>

        {toast && (
          <div className="toast-banner success">
            <span>{toast}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
        )}

        <div className="video-detail-grid">
          {/* Left: Pipeline Steps */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Generation Progress</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{video.progress}%</span>
              </div>
              {isActive && (
                <div className="progress-bar" style={{ marginBottom: 16 }}>
                  <div className="progress-fill" style={{ width: `${video.progress}%` }} />
                </div>
              )}
              <div className="pipeline-steps">
                {VIDEO_STATUS_STEPS.map(({ status, label }) => {
                  const state = getStepState(status as VideoStatus, video.status as VideoStatus);
                  return (
                    <div key={status} className={`pipeline-step ${state}`}>
                      {state === 'done' && <CheckCircle size={15} color="var(--success)" />}
                      {state === 'active' && <Loader2 size={15} color="var(--accent-light)" style={{ animation: 'spin 1s linear infinite' }} />}
                      {state === 'pending' && <div style={{ width: 15, height: 15, borderRadius: '50%', background: 'var(--bg-card-hover)' }} />}
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {video.status === 'FAILED' && (
              <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <AlertCircle size={18} color="var(--error)" />
                  <span style={{ fontWeight: 600, color: 'var(--error)' }}>Generation Failed</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {video.errorMessage ?? 'An unknown error occurred.'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Attempt: {video.retryCount} / 3
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => retryMutation.mutate()}
                  disabled={retryMutation.isPending}
                >
                  <RefreshCw size={13} />
                  {retryMutation.isPending ? 'Retrying…' : 'Retry'}
                </button>
              </div>
            )}
          </div>

          {/* Right: Metadata */}
          <div>
            {video.status === 'READY_TO_PUBLISH' && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#f87171' }}>
                      <Youtube size={20} color="#ff0000" /> Video Ready to Publish
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                      Video and visuals are completely generated. Click the button to upload to your YouTube channel!
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#ff0000', borderColor: '#ff0000', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                  >
                    {publishMutation.isPending ? <Loader2 size={16} className="spin" /> : <Youtube size={16} />}
                    {publishMutation.isPending ? 'Uploading…' : 'Upload to YouTube Now'}
                  </button>
                </div>
              </div>
            )}

            {video.status === 'PUBLISHED' && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                <div className="yt-connected">
                  <CheckCircle size={22} color="var(--success)" />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>Published to YouTube ✓</div>
                    {video.youtubeVideoId && (
                      <a
                        href={`https://youtube.com/shorts/${video.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 10, display: 'inline-flex' }}
                      >
                        <ExternalLink size={13} /> Open on YouTube
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {video.videoPath && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                  <span className="card-title">🎬 Video Preview (1080x1920 Short)</span>
                  <a
                    href={`http://localhost:4000/generated/videos/${video.id}.mp4`}
                    download={`${video.title ?? 'short'}.mp4`}
                    className="btn btn-secondary btn-sm"
                  >
                    Download MP4
                  </a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', background: '#000', borderRadius: 8, padding: 8 }}>
                  <video
                    key={`${video.id}-${video.updatedAt}`}
                    src={`http://localhost:4000/generated/videos/${video.id}.mp4?v=${video.updatedAt ? new Date(video.updatedAt).getTime() : Date.now()}`}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ maxHeight: 460, maxWidth: '100%', borderRadius: 6, aspectRatio: '9/16', background: '#000' }}
                  />
                </div>
              </div>
            )}

            <div className="card">
              <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 20 }}>
                {video.title ?? 'Generating title…'}
              </h2>

              {video.topic?.topic && (
                <div className="form-group">
                  <div className="form-label">Topic</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{video.topic.topic}</p>
                </div>
              )}

              {video.description && (
                <div className="form-group">
                  <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={12} /> Description
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{video.description}</p>
                </div>
              )}

              {video.hashtags?.length > 0 && (
                <div className="form-group">
                  <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Hash size={12} /> Hashtags
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {video.hashtags.map((h) => (
                      <span key={h} className="badge badge-rendering">{h}</span>
                    ))}
                  </div>
                </div>
              )}

              {video.qualityScore !== undefined && video.qualityScore !== null && (
                <div className="form-group">
                  <div className="form-label">Quality Score</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: video.qualityScore >= 70 ? 'var(--success)' : 'var(--error)' }}>
                      {video.qualityScore}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/100</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={12} /> Created
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {new Date(video.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {video.hook && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>Hook</div>
                <p style={{ fontSize: 14, color: 'var(--accent-light)', fontStyle: 'italic', lineHeight: 1.7 }}>
                  "{video.hook}"
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
