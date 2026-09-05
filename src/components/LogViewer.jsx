import { useEffect, useState, useCallback } from 'react';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function LogViewer({ refreshSignal }) {
  const [logs, setLogs] = useState([]);
  const [persisted, setPersisted] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setPersisted(data.persisted !== false);
        setError(null);
      } else {
        setError(data.error || 'Failed to load logs.');
      }
    } catch (err) {
      setError('Could not reach the logs endpoint.');
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (refreshSignal) fetchLogs();
  }, [refreshSignal, fetchLogs]);

  return (
    <section className="log-section">
      <div className="log-header">
        <span className="log-title">ACTIVITY LOG</span>
        <span className="log-persist-note">
          {persisted ? 'live · updates every 5s' : 'no MONGODB_URI set — logs are not persisted'}
        </span>
      </div>

      <div className="log-list log-scroll">
        {error && <div className="log-empty">{error}</div>}
        {!error && logs.length === 0 && (
          <div className="log-empty">No interactions yet. Submit a message above to see it here.</div>
        )}
        {!error && logs.map((log) => (
          <div className="log-row" key={log._id || log.createdAt + log.input}>
            <span className="log-time">{timeAgo(log.createdAt)}</span>
            <span className={`log-badge ${log.flagged ? 'fail' : 'pass'}`}>
              {log.flagged ? 'BLOCKED' : 'PASSED'}
            </span>
            <span className="log-input-preview" title={log.input}>{log.input}</span>
            <span className="log-stage">{log.stage || '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
