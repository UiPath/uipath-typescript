import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDecisionRecorder,
  DecisionPart,
  DecisionRecorder,
  HowMuchChanged,
} from '../../../../packages/coded-action-app/src/decision-recorder';

const AMOUNT = 'amount';
const MESSAGE = 'message';
const NOTE = 'note';
const SOURCE = 'Claims agent v4';
const SCOPE = 'Counts for claims like this';
const REVIEWER = 'reviewer-1';
const UNKNOWN_ID = 'missing';

const PARTS: DecisionPart[] = [
  { id: AMOUNT, part: 'Approved amount', proposed: '5000', source: SOURCE },
  { id: MESSAGE, part: 'Message to the customer', proposed: 'We can cover $5,000 under your plan and add goodwill.' },
  { id: NOTE, part: 'Internal note', proposed: 'Check the lab report' },
];

describe('createDecisionRecorder', () => {
  let clock: number;
  let recorder: DecisionRecorder;

  const row = (part: string) => recorder.snapshot().record.find((r) => r.part === part)!;

  beforeEach(() => {
    clock = 1_000_000;
    recorder = createDecisionRecorder({
      proposed: PARTS,
      reviewerId: REVIEWER,
      defaultScope: SCOPE,
      now: () => clock,
    });
  });

  it('records a part that was never opened or changed as Untouched', () => {
    const result = row('Approved amount');

    expect(result).toEqual({
      part: 'Approved amount',
      proposed: '5000',
      submitted: '5000',
      howMuch: HowMuchChanged.Untouched,
      source: SOURCE,
      lookedAt: false,
      scope: '—',
    });
  });

  it('records a part that was opened and left as proposed as Kept', () => {
    recorder.lookedAt(AMOUNT);

    expect(row('Approved amount')).toMatchObject({ howMuch: HowMuchChanged.Kept, lookedAt: true });
  });

  it('records a small text edit as Lightly edited and a large one as Rewritten', () => {
    recorder.change(MESSAGE, 'We can cover $5,000 under your plan and add some goodwill.');
    recorder.change(NOTE, 'Ask the customer for photos');

    expect(row('Message to the customer').howMuch).toBe(HowMuchChanged.LightlyEdited);
    expect(row('Internal note').howMuch).toBe(HowMuchChanged.Rewritten);
  });

  it('records a cleared value as Rejected and a non-text change as Rewritten', () => {
    recorder.change(NOTE, '');
    recorder.change(AMOUNT, 4800);

    expect(row('Internal note').howMuch).toBe(HowMuchChanged.Rejected);
    expect(row('Approved amount')).toMatchObject({ submitted: '4800', howMuch: HowMuchChanged.Rewritten });
  });

  it('records a change marked as rejected as Rejected whatever the new value is', () => {
    recorder.change(AMOUNT, '0', { rejected: true });

    expect(row('Approved amount').howMuch).toBe(HowMuchChanged.Rejected);
  });

  it('uses the scope of the change, then the default scope, and leaves unchanged parts without one', () => {
    recorder.change(AMOUNT, '4800', { scope: 'Just this claim' });
    recorder.change(NOTE, 'Ask the customer for photos');

    expect(row('Approved amount').scope).toBe('Just this claim');
    expect(row('Internal note').scope).toBe(SCOPE);
    expect(row('Message to the customer').scope).toBe('—');
  });

  it('counts a changed part as looked at and clears the change when it returns to the proposal', () => {
    recorder.change(AMOUNT, '4800');
    recorder.change(AMOUNT, '5000');

    expect(row('Approved amount')).toMatchObject({ submitted: '5000', howMuch: HowMuchChanged.Kept, lookedAt: true, scope: '—' });
  });

  it('logs the changes in order with the time and what had been opened', () => {
    recorder.lookedAt(MESSAGE);
    clock += 3_000;
    recorder.change(AMOUNT, '4800', { what: 'Amount lowered' });
    clock += 4_000;
    recorder.note('Next time: picked a rule');

    const { changeLog, timeOnTaskSeconds } = recorder.snapshot();

    expect(changeLog).toEqual([
      { step: 1, what: 'Amount lowered', atSecond: 3, lookedAt: ['Message to the customer', 'Approved amount'] },
      { step: 2, what: 'Next time: picked a rule', atSecond: 7, lookedAt: ['Message to the customer', 'Approved amount'] },
    ]);
    expect(timeOnTaskSeconds).toBe(7);
  });

  it('describes a change with the old and the new value when no text is given', () => {
    recorder.change(AMOUNT, '4800');

    expect(recorder.snapshot().changeLog[0].what).toBe('Approved amount: 5000 → 4800');
  });

  it('returns the reviewer id, and an empty string when none was given', () => {
    const anonymous = createDecisionRecorder({ proposed: PARTS });

    expect(recorder.snapshot().reviewerId).toBe(REVIEWER);
    expect(anonymous.snapshot().reviewerId).toBe('');
  });

  it('rejects a part id that was not proposed', () => {
    expect(() => recorder.lookedAt(UNKNOWN_ID)).toThrow(UNKNOWN_ID);
    expect(() => recorder.change(UNKNOWN_ID, 'x')).toThrow(UNKNOWN_ID);
  });

  it('returns a copy of the change log so later changes do not alter an earlier snapshot', () => {
    recorder.change(AMOUNT, '4800');
    const first = recorder.snapshot();
    recorder.change(MESSAGE, 'Short');

    expect(first.changeLog).toHaveLength(1);
    expect(recorder.snapshot().changeLog).toHaveLength(2);
  });
});
