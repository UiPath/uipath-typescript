import { useContext, useEffect, useState } from 'react';
import { usePageSourcesSettled } from '../../lib/runtime';
import { Guarded, baseAttrs, isHidden, ownClick, PageScope, useControlLoaded, type UiBaseProps } from './ui-base';

export interface UiPanelProps extends UiBaseProps {
  /**
   * Hold the content behind a loading curtain until this container's load rule has run
   * and the page's sources have settled. Set on a page's ROOT when the page authors
   * Apps' `showRuntimeLoadProgress` (it does by default): Apps covers a loading page,
   * and without the hold a page whose load rule hides tabs or picks the active one showed
   * its pre-load state first — seven tabs, opening on the wrong one — then jumped.
   */
  holdUntilLoaded?: boolean;
}

function UiPanelImpl(p: UiPanelProps) {
  // One hook for both: the resolved props (a rule may have hidden or disabled this
  // container) and whether its load rule is done, which the curtain below waits for.
  const control = useControlLoaded(p);
  p = control.props;
  const loaded = control.loaded;
  const settled = usePageSourcesSettled(useContext(PageScope));
  // Children mount before this effect runs, so their loaders have announced themselves by
  // the time the curtain first asks whether the sources have settled.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  /*
   * ONCE. The curtain is for the first load, as Apps' is: after that a dropdown whose
   * choices depend on another field refetches on every change, a Submit or Reset refetches
   * the grid, and a curtain that followed `settled` covered the whole page for each of
   * them — the page blinked out on every click (measured on a real app).
   */
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { if (mounted && loaded && settled) setRevealed(true); }, [mounted, loaded, settled]);
  if (isHidden(p)) return null;
  const holding = p.holdUntilLoaded === true && !revealed;
  // A container's click rule fires for clicks on the container itself, not on a control inside it.
  return (
    <div {...baseAttrs(p)} onClick={ownClick(p)} data-holding={holding || undefined}>
      {p.children}
      {holding
        ? <div className="ui-load-curtain" role="status" aria-busy="true"><span className="ui-spinner" aria-hidden="true" /></div>
        : null}
    </div>
  );
}

/** The exported control: the real component inside its own error boundary. */
export function UiPanel(p: UiPanelProps) {
  return <Guarded ctl={p.ctl}><UiPanelImpl {...p} /></Guarded>;
}
