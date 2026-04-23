import { useState, useEffect } from 'react';
import { JobForm } from './components/JobForm';
import { JobList } from './components/JobList';
import { getJobs, getMe, setApiKey } from './api';

const API_KEYS = [
  { label: 'Alice (Pro)',  value: 'key-alice-123' },
  { label: 'Bob (Free)',   value: 'key-bob-456'   },
];

export default function App() {
  const [jobs, setJobs]           = useState<any[]>([]);
  const [user, setUser]           = useState<any>(null);
  const [activeKey, setActiveKey] = useState(API_KEYS[0].value);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const data = await getJobs();
      setJobs(data);
    } catch {
      setLoadError('Could not load jobs');
    }
  };

  const fetchUser = async () => {
    try {
      const data = await getMe();
      setUser(data);
    } catch {
      // silently ignore — user banner is optional
    }
  };

  useEffect(() => {
    setApiKey(activeKey);
    fetchJobs();
    fetchUser();

    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const handleJobCreated = (job: any) => {
    if (job) {
      setJobs((prev) => [job, ...prev]);
    }
    fetchJobs();
  };

  const handleKeyChange = (key: string) => {
    setActiveKey(key);
    setJobs([]);
    setUser(null);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            🎙 Speechify Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>
            Text-to-speech job management
          </p>
        </div>

        {/* User switcher */}
        <div style={{ display: 'flex', gap: 8 }}>
          {API_KEYS.map((k) => (
            <button
              key={k.value}
              onClick={() => handleKeyChange(k.value)}
              style={{
                background: activeKey === k.value ? '#6366f1' : '#f1f5f9',
                color:      activeKey === k.value ? '#fff'     : '#475569',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* Usage banner */}
      {user && (
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: 14,
          }}
        >
          <strong>{user.email}</strong> &nbsp;·&nbsp; Plan:{' '}
          <strong>{user.plan}</strong> &nbsp;·&nbsp; Usage:{' '}
          <strong>{user.usage?.toLocaleString()}</strong> /{' '}
          {user.quota?.toLocaleString()} chars this month
        </div>
      )}

      {loadError && (
        <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: 14 }}>{loadError}</p>
      )}

      {/* Job creation form */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: '0.75rem' }}>
          New Job
        </h2>
        <JobForm onJobCreated={handleJobCreated} />
      </section>

      {/* Job list */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Jobs</h2>
          <button
            onClick={fetchJobs}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 13,
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            ↻ Refresh
          </button>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            padding: '0.5rem',
          }}
        >
          <JobList jobs={jobs} />
        </div>
      </section>
    </div>
  );
}
