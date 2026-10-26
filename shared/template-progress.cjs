// Read-only progress presentation. Existing consumer callbacks remain the only
// source of stage information; clock ticks never imply work or completion.
function createTemplateProgressView(React, timing = {}) {
  const now = timing.now || (() => typeof performance !== 'undefined' ? performance.now() : Date.now());
  const schedule = timing.schedule || ((fn, ms) => setInterval(fn, ms));
  const cancel = timing.cancel || (id => clearInterval(id));
  const thresholdSeconds = 120;
  return function TemplateProgressView({runId, status, busy = true, terminal = false}) {
    const message = typeof status === 'string' && status.trim() ? status.trim() : 'Waiting for the first step…';
    const snapshot = React.useRef(null);
    const [, tick] = React.useState(0);
    const stamp = now();
    if (!snapshot.current || snapshot.current.runId !== runId) {
      snapshot.current = {runId, message, changedAt: stamp, terminal: false};
    }
    const current = snapshot.current;
    if (!current.terminal) {
      if (current.message !== message) { current.message = message; current.changedAt = stamp; }
      if (terminal || !busy) current.terminal = true;
    }
    const running = !current.terminal;
    React.useEffect(() => {
      if (!running) return;
      let attached = true;
      const timer = schedule(() => { if (attached) tick(value => value + 1); }, 1000);
      return () => { attached = false; cancel(timer); };
    }, [runId, running]);
    const seconds = Math.floor(Math.max(0, stamp - current.changedAt) / 1000);
    const h = React.createElement;
    return h('section', {'aria-label': 'Template run progress', style: {display: 'grid', gap: 4, padding: '8px 0'}},
      h('small', {role: 'status'}, running ? 'Current step: ' + current.message : current.message),
      running && h('small', {'data-progress-age': true}, 'Last step change: ' + seconds + ' s ago.'),
      running && seconds >= thresholdSeconds && h('p', {role: 'status', style: {margin: 0}},
        'No new step update for ' + seconds + ' s. Completion has not been confirmed.'),
      !running && h('small', null, 'Run finished.'),
    );
  };
}
module.exports = {createTemplateProgressView};
