import { Input } from '@uipath/apollo-wind/components/ui/input';
import { useEffect, useRef, useState } from 'react';
import { Guarded, baseAttrs, displayText, isHidden, applyInputMask, inputMaskOf, inputTypeFor, labelAfter, useFieldState,
  useFieldValidity, useControl, type UiBaseProps, withSeparators } from './ui-base';

export interface UiTextInputProps extends UiBaseProps {
  value?: unknown;
  onChange?: (value: never) => void;
  placeholder?: string;
  /**
   * The caption. `unknown` rather than `string` because a designer can BIND it — a
   * switch authors it as `labelText`, and it is usually an expression.
   */
  label?: unknown;
  /**
   * The authored `required` rule, for the caption's asterisk only — the RULE itself is
   * enforced by `useControlValidation` on the page. `unknown` because it can be bound:
   * a field may be required only when another one has a particular value.
   */
  required?: unknown;
  readOnly?: boolean;
  accent?: string;
  /** `numberControlPrefix`: a unit or currency sign shown in the field, before the value. */
  prefix?: unknown;
  /** `inputControlInputType`: Text | Number | Email — Apps' one text control serves all three. */
  inputType?: unknown;
  /** `numberControlSeparator`: thousands separators while the field is not being edited. */
  useSeparator?: boolean;
  /** `inputMaskPlaceholder`: the mask pattern, e.g. `(___) ___-____`. Needs `maskSlot` too. */
  maskPattern?: unknown;
  /** `inputMaskSlot`: the character(s) marking a fillable position in the pattern. */
  maskSlot?: unknown;
  /** `inputMaskAccept`: a regex source for the characters that may fill a slot; digits by default. */
  maskAccept?: unknown;
}

function UiTextInputImpl(p: UiTextInputProps) {
  p = useControl(p);
  const f = useFieldState(p);
  const v = useFieldValidity(p.ctl);
  const [editing, setEditing] = useState(false);
  /*
   * The input mask, as Apps applies it (input-mask.service.ts): typed characters are laid
   * into the pattern on every change and the caret moves to the first empty slot. The
   * element is remembered from the event rather than taken through a ref, because the
   * design-system Input does not forward one.
   */
  const mask = inputMaskOf(p);
  const maskInput = useRef<HTMLInputElement | null>(null);
  const [caret, setCaret] = useState<number | null>(null);
  useEffect(() => {
    if (caret === null) return;
    maskInput.current?.setSelectionRange(caret, caret);
    setCaret(null);
  }, [caret]);
  const field = <Input
        className="ui-input"
        type={p.useSeparator || mask ? 'text' : inputTypeFor(p.inputType, 'text')}
        inputMode={p.useSeparator ? 'decimal' : undefined}
        value={(p.useSeparator && !editing ? withSeparators(f.value) : (f.value ?? '')) as never}
        placeholder={mask ? mask.pattern : p.placeholder}
        readOnly={p.readOnly}
        disabled={p.disabled}
        onFocus={(e) => {
          setEditing(true);
          // Focusing an empty masked field shows the pattern, as Apps does.
          if (mask && (f.value === undefined || f.value === null || f.value === '')) {
            maskInput.current = e.currentTarget;
            const m = applyInputMask('', mask);
            f.onChange(m.text as never);
            setCaret(m.caret);
          }
        }}
        onBlur={() => {
          setEditing(false);
          v.onBlur();
          // A pattern with nothing typed into it is an empty value, as Apps clears it on blur.
          if (mask && f.value === mask.pattern) f.onChange('' as never);
        }}
        aria-invalid={v.show || p.isValid === false || undefined}
        onChange={(e) => {
          if (mask) {
            maskInput.current = e.currentTarget;
            const m = applyInputMask(e.currentTarget.value, mask);
            f.onChange(m.text as never);
            setCaret(m.caret);
            return;
          }
          f.onChange(p.useSeparator ? e.target.value.replace(/,/g, '') : e.target.value);
        }}
      />;
  const hasPrefix = p.prefix !== undefined && p.prefix !== null && p.prefix !== '';
  if (isHidden(p)) return null;

  const caption = p.label
    ? (
      <span className="ui-label">
        {displayText(p.label)}
        {p.required ? <span className="ui-required" aria-hidden="true">*</span> : null}
      </span>
    )
    : null;
  const after = labelAfter(p.labelPosition);
  return (
    <label {...baseAttrs({ ...p, e2e: "forms-host-text-control" })} data-accent={p.accent} data-invalid={v.show || undefined}
      data-label-position={
        typeof p.labelPosition === 'string' ? p.labelPosition : undefined}>
      {after ? null : caption}
      {/* The field and its message side by side beside the caption, as Apps lays them out
        * (control-label, then a row holding mat-form-field and the error-label). */}
      <span className="ui-field-group">
        {hasPrefix
          ? <span className="ui-field"><span className="ui-prefix">{displayText(p.prefix)}</span>{field}</span>
          : field}
        {v.show ? <span className="ui-error" role="alert">{v.message}</span> : null}
      </span>
      {after ? caption : null}
    </label>
  );
}

/** The exported control: the real component inside its own error boundary. */
export function UiTextInput(p: UiTextInputProps) {
  return <Guarded ctl={p.ctl}><UiTextInputImpl {...p} /></Guarded>;
}
