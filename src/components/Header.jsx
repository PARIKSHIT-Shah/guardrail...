export default function Header() {
  return (
    <header className="gr-header">
      <div>
        <div className="gr-wordmark">
          <span className="bracket">[</span>guardrail<span className="bracket">]</span>
        </div>
        <p className="gr-subtitle">
          A three-stage moderation pipeline: every message is checked for
          prompt injection, screened against content policy, then safely
          answered — nothing skips the chain.
        </p>
      </div>
      <div className="gr-status">
        <span className="gr-status-dot" />
        pipeline online
      </div>
    </header>
  );
}
