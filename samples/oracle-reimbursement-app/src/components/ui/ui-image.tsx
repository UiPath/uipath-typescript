import { useEffect, useState } from 'react';
import { Guarded, baseAttrs, isHidden, useControl, useResolvedUrl, type UiBaseProps } from './ui-base';

export interface UiImageProps extends UiBaseProps {
  /** A URL, or an inline `AppsFile` — see resolveUrl. */
  url?: unknown;
}

function UiImageImpl(p: UiImageProps) {
  p = useControl(p);
  // A string or inline file at once; a record's attachment once downloaded.
  const { url: src, loading, failed: unfetchable } = useResolvedUrl(p.url);
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  /*
   * Was a source AUTHORED — not, did it produce one.
   *
   * That is the line Apps draws, measured on one app three ways. A control whose `url`
   * property holds no expression at all keeps an undefined value, so Apps' file loader
   * bails at `canResolveSource` and calls `_resetImage()`: empty box, error flag off. A
   * control whose `url` IS authored goes down the resolve path even when the expression
   * produces nothing, and comes back through the catch: the unable-to-render text. Same
   * app, same popup — an Add form showed the message under a photo bound to a record
   * that does not exist yet, and showed blank space under two avatars whose url slots
   * were never filled in.
   *
   * The emitter already carries the distinction: it writes `url={…}` only for a property
   * with an authored expression, so the KEY is present whenever one was authored, even on
   * the render where it evaluates to undefined. Reading the value cannot tell the two
   * apart; reading whether the prop was passed can.
   */
  const bound = 'url' in p;
  if (isHidden(p)) return null;

  return (
    <div {...baseAttrs({ ...p, e2e: "forms-host-image-control" })} onClick={p.onClick}>
      {/*
        * FOUR states, in Apps' own order (`image.component.html`): error, then the
        * picture, then the spinner, and otherwise nothing.
        *
        * The placeholder belongs to the ERROR state alone — Apps sets that flag in the
        * catch around resolving the source, or from the `<img>` element's own error
        * event, and nowhere else. An image control the designer never bound calls Apps'
        * `_resetImage()`, which leaves the flag false and renders an EMPTY box. Printing
        * the placeholder for it announces a failure for a control that was never asked to
        * show anything: this app has a male and a female avatar whose `url` slots carry an
        * id and no expression, one of which is visible at all times, so every Edit popup
        * showed "Unable to render image" under the gender radio where Apps shows space.
        *
        * A download in flight is a SPINNER, as Apps draws one (`designer-spinner-panel`),
        * not the word "Loading" — and never the failure text, which is what made a photo
        * arrive by first claiming it could not.
        */}
      {unfetchable || broken
        ? <p className="ui-image-placeholder">Unable to render image</p>
        : loading
          ? (
            <div className="ui-image-loading" role="status" aria-label="Loading">
              <span className="ui-spinner" aria-hidden="true" />
            </div>
          )
          : src
            ? <img className="ui-img" src={src} alt={String(p.text ?? '')} onError={() => setBroken(true)} />
            : bound
              ? <p className="ui-image-placeholder">Unable to render image</p>
              : null}
    </div>
  );
}

/** The exported control: the real component inside its own error boundary. */
export function UiImage(p: UiImageProps) {
  return <Guarded ctl={p.ctl}><UiImageImpl {...p} /></Guarded>;
}
