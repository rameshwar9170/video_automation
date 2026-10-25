'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/common/Sidebar';
import { videoApi } from '@/services/video.api';
import { Video, VideoStatus } from '@/types';
import { Play, ExternalLink, AlertCircle, Loader2, CheckCircle, Video as VideoIcon } from 'lucide-react';
import { useState } from 'react';
import { CreateVideoModal } from '@/components/common/CreateVideoModal';

const STATUS_FILTERS = ['All', 'PUBLISHED', 'GENERATING', 'FAILED', 'RENDERING', 'READY_TO_PUBLISH'];

function statusBadgeClass(status: VideoStatus) {
  if (status === 'PUBLISHED') return 'badge-published';
  if (status === 'FAILED') return 'badge-failed';
  if (['RENDERING', 'GENERATING_ASSETS'].includes(status)) return 'badge-rendering';
  if (status === 'UPLOADING') return 'badge-uploading';
  return 'badge-default';
}

function VideoCard({ video }: { video: Video }) {
  const router = useRouter();
  const isActive = !['PUBLISHED', 'FAILED', 'READY_TO_PUBLISH'].includes(video.status);

  return (
    <div
      className="video-card"
      style={{ cursor: 'pointer', textDecoration: 'none' }}
      onClick={() => router.push(`/videos/${video.id}`)}
    >
        <div className="video-thumb">
          {isActive ? (
            <Loader2 size={28} color="var(--accent-light)" style={{ animation: 'spin 1s linear infinite' }} />
          ) : video.status === 'PUBLISHED' ? (
            <CheckCircle size={28} color="var(--success)" />
          ) : video.status === 'FAILED' ? (
            <AlertCircle size={28} color="var(--error)" />
          ) : (
            <VideoIcon size={28} color="var(--text-muted)" />
          )}
        </div>
        <div className="video-card-body">
          <div className="video-card-title">
            {video.title ?? video.topic?.topic ?? 'Generating…'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className={`badge ${statusBadgeClass(video.status as VideoStatus)}`}>
              {video.status.replace(/_/g, ' ')}
            </span>
            {video.youtubeVideoId && (
              <a
                href={`https://youtube.com/shorts/${video.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
              >
                <ExternalLink size={12} /> YouTube
              </a>
            )}
          </div>
          {isActive && (
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div className="progress-fill" style={{ width: `${video.progress}%` }} />
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {new Date(video.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
  );
}

export default function VideosPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['videos', statusFilter],
    queryFn: () =>
      videoApi.list({ status: statusFilter === 'All' ? undefined : statusFilter }),
    refetchInterval: 5000,
  });

  const videos = data?.data ?? [];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <div>
            <div className="page-title">Videos</div>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>All generated YouTube Shorts</p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Play size={13} /> Generate Video / Series
          </button>
        </div>

        <CreateVideoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setToast('Video / Series generation initiated! Track progress live below.');
            setTimeout(() => setToast(null), 5000);
          }}
        />

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

        <div className="tabs" style={{ marginTop: 16 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`tab ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : videos.length === 0 ? (
          <div className="empty-state">
            <VideoIcon size={48} color="var(--text-muted)" />
            <h3>No videos yet</h3>
            <p>Go to Dashboard and click "Run Now" to generate your first video.</p>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
