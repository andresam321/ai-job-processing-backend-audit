interface Props {
  jobs: any[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: '#fef3c7', text: '#92400e' },
  processing: { bg: '#dbeafe', text: '#1e40af' },
  completed:  { bg: '#d1fae5', text: '#065f46' },
  failed:     { bg: '#fee2e2', text: '#991b1b' },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#475569' };
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status ?? '—'}
    </span>
  );
}

export function JobList({ jobs }: Props) {
  if (!jobs || jobs.length === 0) {
    return (
      <p style={{ color: '#64748b', fontStyle: 'italic', padding: '1rem 0' }}>
        No jobs yet. Submit some text above to get started.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px', color: '#475569' }}>Job ID</th>
            <th style={{ padding: '8px 12px', color: '#475569' }}>Status</th>
            <th style={{ padding: '8px 12px', color: '#475569' }}>Characters</th>
            <th style={{ padding: '8px 12px', color: '#475569' }}>Output</th>
            <th style={{ padding: '8px 12px', color: '#475569' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, idx) => (
            <tr
              key={job?.id ?? idx}
              style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}
            >
              <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
                {job?.id ? `${job.id.substring(0, 8)}…` : '—'}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <StatusBadge status={job?.status} />
              </td>
              <td style={{ padding: '10px 12px' }}>
                {job?.characterCount?.toLocaleString() ?? '—'}
              </td>
              <td style={{ padding: '10px 12px' }}>
                {job?.outputUrl ? (
                  <a href={job.outputUrl} style={{ color: '#6366f1', fontSize: 12 }}>
                    Download
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>—</span>
                )}
              </td>
              <td style={{ padding: '10px 12px', color: '#64748b' }}>
                {job?.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
