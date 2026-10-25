'use client';

import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@/components/common/Sidebar';
import { researchApi } from '@/services/youtube.api';
import { Topic } from '@/types';
import { FlaskConical, TrendingUp, CheckCircle, X, Loader2 } from 'lucide-react';

function ScoreBar({ label, value }: { label: string; value?: number }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="score-bar">
      <span className="score-label">{label}</span>
      <div className="score-track">
        <div className="score-fill" style={{ width: `${value}%` }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28 }}>{Math.round(value)}</span>
    </div>
  );
}

function TopicCard({ topic }: { topic: Topic }) {
  const statusColor =
    topic.status === 'SELECTED' || topic.status === 'USED'
      ? 'var(--success)'
      : topic.status === 'REJECTED'
      ? 'var(--error)'
      : 'var(--text-muted)';

  return (
    <div className="topic-card">
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {topic.status === 'SELECTED' || topic.status === 'USED' ? (
            <CheckCircle size={16} color="var(--success)" />
          ) : topic.status === 'REJECTED' ? (
            <X size={16} color="var(--error)" />
          ) : (
            <TrendingUp size={16} color="var(--text-muted)" />
          )}
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            {topic.topic}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ScoreBar label="Freshness" value={topic.freshness} />
          <ScoreBar label="Interest" value={topic.interest} />
          <ScoreBar label="Video Fit" value={topic.videoPotential} />
          <ScoreBar label="Originality" value={topic.originality} />
        </div>
      </div>

      <div style={{ textAlign: 'right', minWidth: 70 }}>
        {topic.score !== undefined && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: statusColor }}>
              {Math.round(topic.score)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              score
            </div>
          </div>
        )}
        <span
          className="badge"
          style={{
            marginTop: 8,
            background: topic.status === 'SELECTED' || topic.status === 'USED'
              ? 'rgba(16,185,129,0.15)'
              : topic.status === 'REJECTED'
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(148,163,184,0.1)',
            color: statusColor,
          }}
        >
          {topic.status}
        </span>
      </div>
    </div>
  );
}

export default function ResearchPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['topics-research'],
    queryFn: () => researchApi.getTopics(),
    refetchInterval: 30000,
  });

  const topics = data?.data ?? [];
  const selected = topics.filter((t) => t.status === 'SELECTED' || t.status === 'USED');
  const candidates = topics.filter((t) => t.status === 'CANDIDATE');
  const rejected = topics.filter((t) => t.status === 'REJECTED');

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div>
            <div className="page-title">Research</div>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Today's AI-researched topic candidates</p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2 size={13} className="spin" /> Refreshing…
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Topics Found</div>
            <div className="stat-value">{topics.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Selected</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{selected.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rejected</div>
            <div className="stat-value" style={{ color: 'var(--text-muted)' }}>{rejected.length}</div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : topics.length === 0 ? (
          <div className="empty-state">
            <FlaskConical size={48} color="var(--text-muted)" />
            <h3>No research data yet</h3>
            <p>Trigger a run from the dashboard to start researching topics.</p>
          </div>
        ) : (
          <>
            {selected.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  ✓ Selected Topics
                </h3>
                {selected.map((t) => <TopicCard key={t.id} topic={t} />)}
                <div className="divider" />
              </>
            )}

            {candidates.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Candidates
                </h3>
                {candidates.map((t) => <TopicCard key={t.id} topic={t} />)}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
