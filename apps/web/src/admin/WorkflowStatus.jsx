import React from 'react';
import { Archive, CheckCircle2, Clock3, MessageCircle, Sparkles } from 'lucide-react';
import { OPS_WORKFLOW_STATUSES, useOpsWorkflowStatus } from './opsWorkflow.js';

const STATUS_ICONS = {
  new: Sparkles,
  replied: MessageCircle,
  awaiting_customer: Clock3,
  confirmed: CheckCircle2,
  closed: Archive,
};

function labelFor(status, copy) {
  return copy.workflow.statuses[status] || status;
}

export function WorkflowStatusBadge({ recordId, copy }) {
  const [status] = useOpsWorkflowStatus(recordId);
  const Icon = STATUS_ICONS[status] || Sparkles;
  return (
    <span className={`admin-workflow-chip admin-workflow-chip--${status}`} title={copy.workflow.hint}>
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      {labelFor(status, copy)}
    </span>
  );
}

export function WorkflowStatusPanel({ recordId, copy }) {
  const [status, update, state] = useOpsWorkflowStatus(recordId);
  const [saved, setSaved] = React.useState(false);
  const c = copy.workflow;

  const changeStatus = async (event) => {
    try {
      await update(event.target.value);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaved(false);
    }
  };

  return (
    <section className="admin-workflow-panel" aria-labelledby="admin-workflow-title">
      <div className="admin-workflow-panel__copy">
        <div className="admin-workflow-panel__title">
          <Sparkles size={16} aria-hidden="true" />
          <h3 id="admin-workflow-title">{c.title}</h3>
        </div>
        <p>{c.hint}</p>
      </div>
      <label className="admin-field admin-workflow-panel__field">
        <span>{c.label}</span>
        <select value={status} onChange={changeStatus} disabled={state.loading}>
          {OPS_WORKFLOW_STATUSES.map((value) => (
            <option value={value} key={value}>{labelFor(value, copy)}</option>
          ))}
        </select>
      </label>
      <span className={`admin-workflow-panel__saved${saved ? ' is-visible' : ''}`} role="status" aria-live="polite">
        {state.error ? (state.error === 'save' ? c.saveError : c.loadError) : c.saved}
      </span>
    </section>
  );
}
