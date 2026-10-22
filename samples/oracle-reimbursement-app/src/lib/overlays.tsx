import type { CSSProperties } from 'react';
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { closeModalAction } from '../store/store';
import { PAGES } from '../routes';
import { answerConfirm, dismissMessage } from './rules';

/** Apps' toast, reproduced rather than approximated — derived from the runtime's own */
const ICON: Record<string, string> = {
  error: 'error',
  warning: 'warning',
  success: 'check_circle',
  info: 'info',
};

/** Type colour for the heading and icon. Apps themes these; these are the fallbacks. */
const TYPE_COLOR: Record<string, string> = {
  error: 'var(--destructive, #b00020)',
  warning: 'var(--warning, #b06000)',
  success: 'var(--success, #1e7a3c)',
  info: 'var(--primary, #0067df)',
};

const TOAST: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  margin: 'auto',
  maxWidth: 600,
  width: 'fit-content',
  minWidth: 280,
  zIndex: 1000000,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '12px 16px',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 6,
  boxShadow:
    '0px 3px 14px 2px rgba(0,0,0,0.12), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 5px 5px -3px rgba(0,0,0,0.2)',
};

function Toast(props: {
  message: { id: number; title?: string; message?: string; type?: string };
  edge: 'top' | 'bottom';
  offset: number;
}) {
  const { message: m, edge, offset } = props;
  const type = m.type ?? 'info';
  const colour = TYPE_COLOR[type] ?? TYPE_COLOR.info;
  const place = edge === 'top' ? { top: offset } : { bottom: offset };
  return (
    <div style={{ ...TOAST, ...place }} className={type} tabIndex={0} data-uiapp-overlay="toast">
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, fontWeight: 'bold', color: colour,
        }}
      >
        <span
          className="material-icons"
          data-e2e={edge + '-toast-heading-icon-type'}
          aria-hidden="true"
          style={{ fontSize: 18 }}
        >
          {ICON[type] ?? 'info'}
        </span>
        <span data-e2e={'toast-content-' + edge + '-heading'} style={{ flex: 1 }}>{m.title}</span>
        <button
          type="button"
          onClick={() => dismissMessage(m.id)}
          data-e2e={edge + '-toast-message-dismiss'}
          aria-label="Dismiss"
          // As measured on Apps' toast: a 48px round icon button in the body ink, not the type colour.
          style={{
            border: 0, background: 'none', cursor: 'pointer', width: 48, height: 48, borderRadius: '50%',
            color: '#182027', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 24,
          }}
        >
          <span className="material-icons" style={{ fontSize: 24 }}>close</span>
        </button>
      </div>
      {m.message ? (
        <div
          data-e2e={'toast-content-' + edge + '-message'}
          style={{ whiteSpace: 'pre-line', fontSize: 14 }}
        >
          {m.message}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A page floated over the current one by `openPage(asPopOver)`. Rendered from
 * `PAGES` — the same registry the inline page container uses — inside a centred
 * dialog with a scrim, so the popup keeps its own controls and rules. Clicking the
 * scrim closes it unless the author set `preventCloseOnClick`; there is always a
 * close button. A bottom-sheet variant docks the panel to the foot of the screen.
 */
function ModalHost(props: {
  modal: { page: string; preventCloseOnClick?: boolean; bottomSheet?: boolean };
}) {
  const dispatch = useAppDispatch();
  const close = () => dispatch(closeModalAction());
  const Page = PAGES[props.modal.page];
  const bottom = props.modal.bottomSheet;
  return (
    <div
      data-uiapp-overlay="modal"
      onClick={props.modal.preventCloseOnClick ? undefined : close}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000002,
        display: 'flex',
        alignItems: bottom ? 'flex-end' : 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.32)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: '#fff',
          maxWidth: bottom ? '100%' : 'min(920px, 92vw)',
          width: bottom ? '100%' : 'auto',
          maxHeight: bottom ? '80vh' : '88vh',
          minWidth: bottom ? undefined : 'min(480px, 92vw)',
          overflow: 'auto',
          borderRadius: bottom ? '12px 12px 0 0' : 8,
          boxShadow: '0 12px 48px rgba(0,0,0,0.28)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 1,
            border: 0, background: 'rgba(0,0,0,0.04)', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'inherit',
          }}
        >
          <span className="material-icons" style={{ fontSize: 20 }}>close</span>
        </button>
        {Page
          ? <Page />
          : <div style={{ padding: 24 }}>{'Page "' + props.modal.page + '" not found.'}</div>}
      </div>
    </div>
  );
}

/**
 * Apps' confirmation dialog: a heading, a message, a plain "no" and a highlighted "yes".
 * Measured on the grid's row delete — "Delete record" / "Do you want to delete this
 * record?" / Cancel / Delete record — where the browser's own confirm() had stood in.
 */
function ConfirmHost(props: { confirm: { heading: string; message: string; yes: string; no: string } }) {
  const button: CSSProperties = {
    font: 'inherit', fontSize: 14, padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
  };
  return (
    <div
      data-uiapp-overlay="confirm"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000002, background: 'rgba(0,0,0,0.32)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        role="alertdialog" aria-modal="true" aria-label={props.confirm.heading}
        style={{
          background: '#fff', color: '#273139', borderRadius: 4, width: 560, maxWidth: '92vw',
          padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.24)', display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{props.confirm.heading}</div>
          {/* Apps' confirmation carries a close icon beside its heading; it answers "no". */}
          <button type="button" data-e2e="confirm-close" aria-label="Close" onClick={() => answerConfirm(false)}
            style={{ border: 0, background: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#526069' }}>
            <span className="material-icons" aria-hidden="true" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div style={{ fontSize: 14, minHeight: 72 }}>{props.confirm.message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {/* As measured on Apps' confirmation: a 36px outlined "no" and a filled red "yes". */}
          <button type="button" data-e2e="confirm-no" onClick={() => answerConfirm(false)}
            style={{ ...button, height: 36, background: 'transparent', color: '#3f51b5', border: '1px solid rgba(0,0,0,0.12)', fontWeight: 500 }}>
            {props.confirm.no}
          </button>
          <button type="button" data-e2e="confirm-yes" onClick={() => answerConfirm(true)}
            style={{ ...button, height: 36, background: '#b6242b', color: '#fff', border: 0, fontWeight: 600 }}>
            {props.confirm.yes}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppOverlays() {
  const messages = useAppSelector((s) => s.messages);
  const spinner = useAppSelector((s) => s.spinner);
  const modal = useAppSelector((s) => s.modal);
  const confirm = useAppSelector((s) => s.confirm);
  if (!messages.length && !spinner.show && !modal && !confirm) return null;

  const stack = (edge: 'top' | 'bottom') =>
    messages
      .filter((m) => (m.position ?? 'top') === edge)
      .map((m, i) => (
        <Toast key={m.id} message={m} edge={edge} offset={16 + i * 88} />
      ));

  return (
    <>
      {stack('top')}
      {stack('bottom')}
      {modal ? <ModalHost modal={modal} /> : null}
      {confirm ? <ConfirmHost confirm={confirm} /> : null}
      {spinner.show ? (
        <div
          data-uiapp-overlay="spinner"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000001,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, background: 'rgba(255,255,255,0.6)',
          }}
        >
          <Spinner />
          {spinner.message ? <span>{spinner.message}</span> : null}
        </div>
      ) : null}
    </>
  );
}
