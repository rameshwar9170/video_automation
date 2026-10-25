'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { videoApi } from '@/services/video.api';
import {
  X,
  Sparkles,
  Flame,
  Layers,
  Video as VideoIcon,
  Globe,
  Loader2,
  CheckCircle2,
  Play,
} from 'lucide-react';

interface CreateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_TOPICS = [
  { emoji: '🔥', label: 'Top 3 Secret AI Websites in 2026' },
  { emoji: '📱', label: '3 Hidden Android Settings You Must Turn ON' },
  { emoji: '🚀', label: 'ISRO Chandrayaan Secret Mission Details' },
  { emoji: '💰', label: '1 Money Rule The Wealthy 1% Never Share' },
  { emoji: '🧠', label: 'Dark Psychology: How to Read Anyone Instantly' },
  { emoji: '⚡', label: 'Top 3 Free Tools That Feel Illegal to Know' },
];

export function CreateVideoModal({ isOpen, onClose, onSuccess }: CreateVideoModalProps) {
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Hindi');
  const [isSeries, setIsSeries] = useState(false);
  const [totalParts, setTotalParts] = useState(3);
  const [tone, setTone] = useState('High Energy & Shocking');
  const [style, setStyle] = useState('Cinematic Motion B-Roll');

  const qc = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: () =>
      videoApi.generate({
        customTopic: topic.trim() || undefined,
        language,
        isSeries,
        totalParts: isSeries ? totalParts : 1,
        tone,
        style,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] });
      qc.invalidateQueries({ queryKey: ['scheduler-status'] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles size={20} color="var(--accent-light)" />
            <span>Generate Viral Video / Series</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Active Features Info Banner */}
          <div className="feature-pill-banner">
            <CheckCircle2 size={16} />
            <span>
              Real HD Motion Video Clips + Auto-Ducked BGM Beat + Dynamic Captions Enabled
            </span>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="form-label">Generation Mode</label>
            <div className="mode-selector">
              <div
                className={`mode-option-card ${!isSeries ? 'active' : ''}`}
                onClick={() => setIsSeries(false)}
              >
                <div className="mode-option-title">
                  <VideoIcon size={16} color={!isSeries ? 'var(--accent-light)' : 'var(--text-secondary)'} />
                  <span>Single Short</span>
                </div>
                <div className="mode-option-desc">
                  30–50s standalone viral video with high-impact pattern hook & CTA.
                </div>
              </div>

              <div
                className={`mode-option-card ${isSeries ? 'active' : ''}`}
                onClick={() => setIsSeries(true)}
              >
                <div className="mode-option-title">
                  <Layers size={16} color={isSeries ? 'var(--accent-light)' : 'var(--text-secondary)'} />
                  <span>Multi-Part Series</span>
                </div>
                <div className="mode-option-desc">
                  Episodic format with cliffhangers to trigger binge loops and subscriber jumps.
                </div>
              </div>
            </div>
          </div>

          {/* Series Parts Count (if Series Mode selected) */}
          {isSeries && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Number of Episodes / Parts</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[2, 3, 4, 5].map((parts) => (
                  <button
                    key={parts}
                    type="button"
                    className={`btn btn-sm ${totalParts === parts ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setTotalParts(parts)}
                  >
                    {parts} Parts
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Topic Input */}
          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Topic / Premise</span>
              <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>
                Leave blank for AI Trending auto-pick
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Top 3 Secret AI Websites or Dark Secrets of Bermuda Triangle"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            {/* Presets */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Flame size={12} color="var(--warning)" /> Quick Viral Presets:
              </div>
              <div className="preset-chip-list">
                {PRESET_TOPICS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-chip"
                    onClick={() => setTopic(preset.label)}
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Language Selection */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={13} /> Narration Language
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { id: 'Hindi', label: 'Hindi / Hinglish', desc: 'Viral Indian Audience' },
                { id: 'English', label: 'English', desc: 'Global Reach' },
                { id: 'Marathi', label: 'Marathi', desc: 'Regional High Viral' },
              ].map((lang) => (
                <div
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={`mode-option-card ${language === lang.id ? 'active' : ''}`}
                  style={{ padding: '10px 12px' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {lang.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {lang.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tone & Style Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Narrative Pacing & Tone</label>
              <select
                className="form-select"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="High Energy & Shocking">High Energy & Shocking</option>
                <option value="Fast-Paced Curiosity">Fast-Paced Curiosity</option>
                <option value="Deep Mystery & Suspense">Deep Mystery & Suspense</option>
                <option value="Inspiring & Powerful">Inspiring & Powerful</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Visual Style</label>
              <select
                className="form-select"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="Cinematic Motion B-Roll">Cinematic Real Motion B-Roll</option>
                <option value="Tech & Cyberpunk Action">Tech & Cyberpunk Action</option>
                <option value="Documentary & Realistic">Documentary & Realistic</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={generateMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 size={14} className="spin" /> Starting Generation…
              </>
            ) : (
              <>
                <Play size={14} />
                {isSeries ? `Launch ${totalParts}-Part Series` : 'Generate Video'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
