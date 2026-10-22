import { Guarded, fireRule, baseAttrs, displayText, isHidden, useControl, type UiBaseProps } from './ui-base';

export interface UiPageHeadingProps extends UiBaseProps {
  text?: unknown;
  icon?: string;
  url?: unknown;
  variant?: string;
  accent?: string;
  /** A downloader and a picker are labelled controls even though neither is an input. */
  label?: string;
}

function UiPageHeadingImpl(p: UiPageHeadingProps) {
  p = useControl(p);
  if (isHidden(p)) return null;
  return (
    <div {...baseAttrs({ ...p, e2e: "forms-host-heading-control" })} data-accent={p.accent} onClick={() => fireRule(p.onClick)}>
      {p.label ? <span className="ui-label">{displayText(p.label)}</span> : null}
      {displayText(p.text)}
    </div>
  );
}

/** The exported control: the real component inside its own error boundary. */
export function UiPageHeading(p: UiPageHeadingProps) {
  return <Guarded ctl={p.ctl}><UiPageHeadingImpl {...p} /></Guarded>;
}
