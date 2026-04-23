import { useState } from 'react';
import { createJob } from '../api';

interface Props {
  onJobCreated: (job: any) => void;
}

export function JobForm({ onJobCreated }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    setLoading(true);
    setError(null);

    try {
      const job = await createJob(text);
      onJobCreated(job);
      setText('');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="tts-text"
            style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}
          >
            Text to synthesise
          </label>
          <textarea
            id="tts-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            style={{
              width: '100%',
              padding: '0.6rem',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontFamily: 'inherit',
              fontSize: 14,
              resize: 'vertical',
            }}
            placeholder="Paste or type your text here…"
          />
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {text.length.toLocaleString()} characters
          </p>
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: 14, marginBottom: '0.75rem' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || text.trim().length === 0}
          onClick={handleSubmit as React.MouseEventHandler}
          style={{
            background: loading ? '#94a3b8' : '#6366f1',
            color: '#fff',
            border: 'none',
            padding: '0.6rem 1.4rem',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Submitting…' : 'Create Job'}
        </button>
      </form>
    </div>
  );
}
