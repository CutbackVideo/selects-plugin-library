'use strict';

// Stages must be exclusive: never nest measurements on the same accumulator.
// Parallel decoder subprocess durations belong in separate diagnostics.
class StageTimings {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.started = now();
    this.stages = {};
  }
  add(stage, started) {
    const value = this.stages[stage] ??= { calls: 0, milliseconds: 0 };
    value.calls++;
    value.milliseconds += this.now() - started;
  }
  measure(stage, operation) {
    const started = this.now();
    try { return operation(); } finally { this.add(stage, started); }
  }
  async measureAsync(stage, operation) {
    const started = this.now();
    try { return await operation(); } finally { this.add(stage, started); }
  }
  summary() {
    const totalMilliseconds = this.now() - this.started;
    const measuredMilliseconds = Object.values(this.stages).reduce((sum, value) => sum + value.milliseconds, 0);
    return {
      totalMilliseconds,
      otherMilliseconds: Math.max(0, totalMilliseconds - measuredMilliseconds),
      stages: Object.fromEntries(Object.entries(this.stages).map(([name, value]) => [name, { ...value }])),
    };
  }
}

module.exports = { StageTimings };
