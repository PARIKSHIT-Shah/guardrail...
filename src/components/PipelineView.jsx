const STAGES = [
  {
    key: 'toxicity_injection',
    badge: 'STAGE 1',
    title: 'Toxicity & Injection',
    desc: 'Screens for jailbreak patterns and toxic language.'
  },
  {
    key: 'content_policy',
    badge: 'STAGE 2',
    title: 'Content Policy',
    desc: 'Checks against violence, hate, self-harm & more.'
  },
  {
    key: 'final_generation',
    badge: 'STAGE 3',
    title: 'Output Generation',
    desc: 'Produces the final, safe response.'
  }
];

// status: 'idle' | 'checking' | result object with { flagged, stage, trace }
export default function PipelineView({ status }) {
  function stateFor(stageKey, index) {
    if (status === 'idle') return 'idle';
    if (status === 'checking') {
      return 'checking'; // simplistic: all light up while request is in flight
    }
    // status is a result object
    const { flagged, stage, trace } = status;
    const traceEntry = trace?.find((t) => t.stage === stageKey);

    if (!flagged) {
      return traceEntry ? 'pass' : 'idle';
    }
    // flagged case
    if (stage === stageKey) return 'fail';
    if (traceEntry) return 'pass';
    return 'idle';
  }

  return (
    <div className="pipeline">
      {STAGES.map((s, i) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div className="pipeline-node">
            <span className="pipeline-node-badge">{s.badge}</span>
            <div className={`pipeline-node-box state-${stateFor(s.key, i)}`}>
              <div className="pipeline-node-title">{s.title}</div>
              <div className="pipeline-node-desc">{s.desc}</div>
            </div>
          </div>
          {i < STAGES.length - 1 && <div className="pipeline-connector" />}
        </div>
      ))}
    </div>
  );
}
