/** How much a reviewer changed one part of the task compared with what was proposed. */
export enum HowMuchChanged {
  /** Left as proposed after the reviewer looked at it. */
  Kept = 'Kept',
  /** Left as proposed and never looked at. */
  Untouched = 'Untouched',
  /** A text edit of about 30% of the characters or less. */
  LightlyEdited = 'Lightly edited',
  /** A larger text edit, or a value of another kind. */
  Rewritten = 'Rewritten',
  /** Cleared, or marked as rejected by the app. */
  Rejected = 'Rejected',
}

/** One part of the task that the process proposed and the reviewer can change. */
export interface DecisionPart {
  /** Stable id of the part. */
  id: string;
  /** Name of the part as it reads in the record. */
  part: string;
  /** The value the process proposed. */
  proposed: unknown;
  /** Name and version of the agent, rule or step that proposed it. */
  source?: string;
}

/** Options for createDecisionRecorder. */
export interface DecisionRecorderOptions {
  /** The parts the process proposed. */
  proposed: DecisionPart[];
  /** Id of the reviewer, from `Task.reviewerId`. */
  reviewerId?: string;
  /** Scope written on a changed part when the change does not name one. */
  defaultScope?: string;
  /** Clock in milliseconds, for tests. Defaults to `Date.now`. */
  now?: () => number;
}

/** Options for DecisionRecorder.change. */
export interface DecisionChangeOptions {
  /** Treat the change as a rejection of the proposal, whatever the new value is. */
  rejected?: boolean;
  /** Scope of this change, for example "Just this claim". */
  scope?: string;
  /** Text for the change log. Defaults to the part name with the old and new value. */
  what?: string;
}

/** One row of the record: a part, what was proposed and submitted, and how much it changed. */
export interface DecisionRecordRow {
  part: string;
  proposed: string;
  submitted: string;
  howMuch: HowMuchChanged;
  source: string;
  lookedAt: boolean;
  scope: string;
}

/** One entry of the change log, in the order the changes happened. */
export interface DecisionChangeEntry {
  step: number;
  what: string;
  /** Seconds from creating the recorder to this change. */
  atSecond: number;
  /** Names of the parts the reviewer had opened by this change. */
  lookedAt: string[];
}

/** What the recorder returns for the task data. */
export interface DecisionRecording {
  record: DecisionRecordRow[];
  changeLog: DecisionChangeEntry[];
  timeOnTaskSeconds: number;
  reviewerId: string;
}

/** Tracks what a reviewer looked at and changed in a decision task. */
export interface DecisionRecorder {
  /** Marks a part as looked at. Opening a part counts even when its value stays as proposed. */
  lookedAt(id: string): void;
  /** Records the submitted value of a part. Returning it to the proposed value clears the change. */
  change(id: string, submitted: unknown, options?: DecisionChangeOptions): void;
  /** Adds a line to the change log for something that is not a part. */
  note(what: string): void;
  /** Returns the record, change log, time on task and reviewer id to merge into the task data. */
  snapshot(): DecisionRecording;
}

const LIGHT_EDIT_RATIO = 0.3;
const NO_VALUE = '—';

const display = (value: unknown): string => {
  if (value === undefined || value === null) return NO_VALUE;
  return typeof value === 'string' ? value : JSON.stringify(value);
};

const isCleared = (value: unknown): boolean => value === undefined || value === null || value === '';

const sameValue = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

const levenshtein = (a: string, b: string): number => {
  const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return rows[a.length][b.length];
};

const howMuchChanged = (proposed: unknown, submitted: unknown, rejected: boolean, looked: boolean): HowMuchChanged => {
  if (rejected || (isCleared(submitted) && !isCleared(proposed))) return HowMuchChanged.Rejected;
  if (sameValue(proposed, submitted)) return looked ? HowMuchChanged.Kept : HowMuchChanged.Untouched;
  if (typeof proposed === 'string' && typeof submitted === 'string') {
    const ratio = levenshtein(proposed, submitted) / Math.max(proposed.length, submitted.length, 1);
    return ratio <= LIGHT_EDIT_RATIO ? HowMuchChanged.LightlyEdited : HowMuchChanged.Rewritten;
  }
  return HowMuchChanged.Rewritten;
};

type Submission = { value: unknown; rejected: boolean; scope: string };

/** Creates a recorder for the parts a process proposed in a decision task. */
export function createDecisionRecorder(options: DecisionRecorderOptions): DecisionRecorder {
  const now = options.now ?? Date.now;
  const started = now();
  const parts = new Map(options.proposed.map((p) => [p.id, p]));
  const looked = new Set<string>();
  const submissions = new Map<string, Submission>();
  const log: DecisionChangeEntry[] = [];
  const seconds = (): number => Math.round((now() - started) / 1000);
  const lookedNames = (): string[] => [...looked].map((id) => parts.get(id)?.part ?? id);
  const push = (what: string): void => {
    log.push({ step: log.length + 1, what, atSecond: seconds(), lookedAt: lookedNames() });
  };
  const requirePart = (id: string): DecisionPart => {
    const part = parts.get(id);
    if (!part) throw new Error(`Unknown decision part: ${id}`);
    return part;
  };

  return {
    lookedAt(id) {
      requirePart(id);
      looked.add(id);
    },

    change(id, submitted, changeOptions = {}) {
      const part = requirePart(id);
      looked.add(id);
      if (sameValue(part.proposed, submitted) && !changeOptions.rejected) {
        submissions.delete(id);
        push(`${changeOptions.what ?? part.part}: returned to the proposal`);
        return;
      }
      submissions.set(id, {
        value: submitted,
        rejected: changeOptions.rejected ?? false,
        scope: changeOptions.scope ?? options.defaultScope ?? NO_VALUE,
      });
      push(changeOptions.what ?? `${part.part}: ${display(part.proposed)} → ${display(submitted)}`);
    },

    note(what) {
      push(what);
    },

    snapshot() {
      const record = options.proposed.map((part): DecisionRecordRow => {
        const submission = submissions.get(part.id);
        const value = submission ? submission.value : part.proposed;
        return {
          part: part.part,
          proposed: display(part.proposed),
          submitted: display(value),
          howMuch: howMuchChanged(part.proposed, value, submission?.rejected ?? false, looked.has(part.id)),
          source: part.source ?? '',
          lookedAt: looked.has(part.id),
          scope: submission ? submission.scope : NO_VALUE,
        };
      });
      return { record, changeLog: [...log], timeOnTaskSeconds: seconds(), reviewerId: options.reviewerId ?? '' };
    },
  };
}
