import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ValidationStation, fetchDuDocumentArtifacts,
  type DuDocumentArtifacts, type EvaluatedBusinessRulesForFieldValueDto, type IFieldValueDetailsDto,
  type ISaveResult, type IValidationStationOptions, type IVsSaveValidatedDataRequest,
  type SaveValidatedDataResult, type SelectAndFocusFieldValueByPath, type SetFieldValueByPath,
  type DeleteFieldValueByPath, type SetFieldValueByPathResult,
} from '@uipath/ui-widgets-validation-station';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import { uiPathOrNull } from '../../lib/sdk';
import { showMessage } from '../../lib/rules';
import {
  getAppVar, registerValidationStation, setAppVar, setControlProp,
  type ValidationFieldPath, type ValidationStationCommands,
} from '../../lib/runtime';
import { Guarded, baseAttrs, fireRule, isHidden, useControl, usePageName, type UiBaseProps } from './ui-base';

/** The station's state, as its companion app variable holds it. */
interface StationState {
  Taxonomy?: unknown;
  ExtractionResult?: unknown;
  SelectedDocumentType?: unknown;
  SelectedField?: unknown;
  BusinessRules?: unknown;
}

/**
 * The SDK as the widget types it. The widget imports `UiPath` from the SDK's `core` entry and
 * this app from its root entry; the two declarations are the same class at run time, but
 * TypeScript sees two nominal types (each has a `#private`), so the one instance is cast once.
 */
type WidgetSdk = Parameters<typeof fetchDuDocumentArtifacts>[0];

/** The members the Apps runtime also mirrors onto the CONTROL, so `Controls.P.Station.X` reads them. */
const CONTROL_MIRRORED: readonly (keyof StationState)[] = ['Taxonomy', 'ExtractionResult', 'SelectedDocumentType', 'SelectedField'];

/** How long a station command may take before it is given up on — the robot activities' own timeout. */
const COMMAND_TIMEOUT_MS = 30000;

export interface UiValidationStationProps extends UiBaseProps {
  /** The authored `duValidationStationSrc`: the `ContentValidationData` naming the document. */
  dataSource?: unknown;
  /** `ShowDocumentType` — whether the document-type field shows. Apps defaults it to true. */
  showDocumentType?: unknown;
  /** Which side the fields panel sits on: `left` (Apps' default) or `right`. */
  fieldPosition?: unknown;
  /** Whether the fields panel is hidden. */
  hideFields?: unknown;
  /**
   * The companion app variable the station publishes into, and a workflow addresses it by.
   * Emitted by the converter from the variable Apps created for the control.
   */
  stationVar?: string;
  accent?: string;
  /** The control's authored events. */
  onReady?: () => void;
  onDocumentTypeChanged?: () => void;
  onFieldSelected?: () => void;
  onFieldValueChanged?: () => void;
}

/** A pending command, settled by the result event the web component answers it with. */
interface Pending { resolve: () => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }

function pending(resolve: () => void, reject: (err: Error) => void, what: string): Pending {
  return {
    resolve, reject,
    timer: setTimeout(() => reject(new Error(`the Validation Station did not answer the ${what} within ${COMMAND_TIMEOUT_MS / 1000}s`)), COMMAND_TIMEOUT_MS),
  };
}

/** The web component's path for a workflow's field path — `_buildPath` in the Apps runtime. */
function widgetPath(path: readonly ValidationFieldPath[]): { fieldName: string; valueIndex: number }[] {
  const segments = path.map((s) => ({ fieldName: String(s.fieldName ?? ''), index: Number(s.index ?? -1) }));
  // The two-segment TABLE form: the row travels on the column segment.
  if (segments.length === 2 && segments[0]!.index < 0 && segments[1]!.index >= 0) {
    return [{ fieldName: segments[0]!.fieldName, valueIndex: segments[1]!.index },
      { fieldName: segments[1]!.fieldName, valueIndex: 0 }];
  }
  return segments.map((s) => ({ fieldName: s.fieldName, valueIndex: s.index >= 0 ? s.index : 0 }));
}

/** Apps' own wording for a station failure. */
function reportStationError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error ?? 'Unable to load Validation control');
  showMessage({ title: 'Error', message, type: 'error' });
}

/** The Apollo theme the page body carries, which the web component takes as its own. */
function bodyTheme(): 'light' | 'dark' | 'light-hc' | 'dark-hc' {
  const classes = typeof document === 'undefined' ? [] : [...document.body.classList];
  for (const t of ['dark-hc', 'light-hc', 'dark'] as const) if (classes.includes(t)) return t;
  return 'light';
}

function UiValidationStationImpl(p: UiValidationStationProps) {
  p = useControl(p);
  const pageName = usePageName();
  const sdk = uiPathOrNull() as unknown as WidgetSdk | null;
  const variable = p.stationVar;

  // ── the document: loads only when the source's DocumentId changes ──
  const source = p.dataSource as DuFramework.ContentValidationData | null | undefined;
  const [doc, setDoc] = useState<DuFramework.ContentValidationData | null>(null);
  useEffect(() => {
    if (source && source.DocumentId && source.DocumentId !== doc?.DocumentId) setDoc(source);
  }, [source, doc]);

  // ── the station's state, published into the companion variable and the control ──
  const publish = useCallback((patch: StationState) => {
    if (variable) {
      const current = (getAppVar<StationState>(variable) ?? {});
      setAppVar(variable, { ...current, ...patch });
    }
    for (const key of CONTROL_MIRRORED) {
      if (key in patch) setControlProp(pageName, p.ctl, key, patch[key]);
    }
  }, [variable, pageName, p.ctl]);

  // ── the artifacts, fetched here so the taxonomy and result can be published on load ──
  const [artifacts, setArtifacts] = useState<DuDocumentArtifacts | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    if (!sdk || !doc) return;
    let live = true;
    setArtifacts(null);
    setLoadError(null);
    setControlProp(pageName, p.ctl, 'DataSource', doc);
    fetchDuDocumentArtifacts(sdk, doc).then((loaded) => {
      if (!live) return;
      setArtifacts(loaded);
      const result = loaded.extractionResult as { ResultsDocument?: { DocumentTypeId?: unknown } } | undefined;
      publish({
        Taxonomy: loaded.taxonomy,
        ExtractionResult: loaded.extractionResult,
        SelectedDocumentType: result?.ResultsDocument?.DocumentTypeId,
      });
    }, (err: unknown) => {
      if (!live) return;
      const why = err instanceof Error ? err.message : String(err);
      setLoadError(why);
      // Apps' own words on the toast; the cause goes to the console, where a developer looks.
      // eslint-disable-next-line no-console
      console.error('[uiapp-convert] the Validation Station could not load document '
        + String(doc.DocumentId) + ': ' + why, err);
      reportStationError('Unable to load Validation control');
    });
    return () => { live = false; };
  }, [sdk, doc, pageName, p.ctl, publish]);

  // ── commands, each settled by the result event it provokes ──
  const [save, setSave] = useState<{ validate: boolean } | undefined>(undefined);
  const [setByPath, setSetByPath] = useState<SetFieldValueByPath | undefined>(undefined);
  const [focusByPath, setFocusByPath] = useState<SelectAndFocusFieldValueByPath | undefined>(undefined);
  const [deleteByPath, setDeleteByPath] = useState<DeleteFieldValueByPath | undefined>(undefined);
  const waiting = useRef<{ save?: Pending; set?: Pending; focus?: Pending; delete?: Pending }>({});
  const settle = (key: keyof typeof waiting.current, error?: string) => {
    const w = waiting.current[key];
    if (!w) return;
    clearTimeout(w.timer);
    waiting.current[key] = undefined;
    if (error) w.reject(new Error(error)); else w.resolve();
  };
  const [loaded, setLoaded] = useState(false);

  /*
   * No "Save" button, as in Apps. Apps' template never enables the station's save-as-draft
   * action (the web component defaults it off), so a converted app shows only Discard; the
   * React widget pins `enableSaveAsDraft: true` on the element with no prop to turn it off,
   * so it is turned off on the element itself — after every render, since the widget sets
   * it again whenever it re-renders the element.
   */
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current?.querySelector('ui-du-validation-station-standalone-wc-element') as
      (HTMLElement & { enableSaveAsDraft?: boolean }) | null | undefined;
    if (el && el.enableSaveAsDraft !== false) el.enableSaveAsDraft = false;
  });

  useEffect(() => {
    if (!variable) return;
    const commands: ValidationStationCommands = {
      setField: (path, property, value) => new Promise<void>((resolve, reject) => {
        const target = widgetPath(path);
        switch (property) {
          case 'DeleteValue':
            waiting.current.delete = pending(resolve, reject, 'delete');
            setDeleteByPath({ path: target });
            return;
          case 'SetFocus':
            waiting.current.focus = pending(resolve, reject, 'focus');
            setFocusByPath({ path: target });
            return;
          case 'Confidence':
            waiting.current.set = pending(resolve, reject, 'field write');
            setSetByPath({ path: target, update: { Confidence: Number(value) } });
            return;
          case 'Confirm':
            waiting.current.set = pending(resolve, reject, 'field write');
            setSetByPath({ path: target, update: { OperatorConfirmed: Boolean(value) } });
            return;
          case 'KeepReference':
            waiting.current.set = pending(resolve, reject, 'field write');
            setSetByPath({ path: target, update: { DeleteReference: !value } });
            return;
          default:
            waiting.current.set = pending(resolve, reject, 'field write');
            setSetByPath({ path: target, update: { Value: value === null || value === undefined ? '' : String(value) } });
        }
      }),
      focusField: (fieldName) => new Promise<void>((resolve, reject) => {
        waiting.current.focus = pending(resolve, reject, 'focus');
        setFocusByPath({ path: [{ fieldName: String(fieldName ?? ''), valueIndex: 0 }] });
      }),
      save: () => new Promise<void>((resolve, reject) => {
        waiting.current.save = pending(resolve, reject, 'save');
        setSave({ validate: true });
      }),
    };
    return registerValidationStation(variable, commands);
  }, [variable]);

  /*
   * A field write the station could not apply is reported and the workflow goes on — the
   * robot's Assign never waited on it either; a toast is what the Apps runtime shows.
   * Focus and save are the two the robot DID wait on, and they throw into the workflow.
   */
  const onSetResult = (r: SetFieldValueByPathResult) => {
    if (!r.success) reportStationError(r.error ?? 'Unable to set the field value');
    settle('set');
  };
  const onDeleteResult = (r: SetFieldValueByPathResult) => {
    if (!r.success) reportStationError(r.error ?? 'Unable to delete the field value');
    settle('delete');
  };
  const onFocusResult = (r: SetFieldValueByPathResult) => settle('focus', r.success ? undefined : (r.error ?? 'Unable to focus the field'));
  const onSaveResult = (r: ISaveResult) => { if (!r.success) settle('save', r.error ?? 'Unable to save the Validation Station'); };
  const onSubmit = (_request: IVsSaveValidatedDataRequest, result?: SaveValidatedDataResult) => {
    settle('save', result?.success ? undefined : (result?.error ?? 'the validated data was not saved'));
  };

  const options = useMemo<IValidationStationOptions>(() => ({
    hideSubmitButton: true,
    hideReportAsExceptionButton: true,
    emitDtoStateChanges: true,
    hideDocumentTypeField: p.showDocumentType === false || p.showDocumentType === 'false',
    fieldsSectionPosition: String(p.fieldPosition ?? 'left') === 'right' ? 'right' : 'left',
    hideFields: p.hideFields === true || p.hideFields === 'true',
  }), [p.showDocumentType, p.fieldPosition, p.hideFields]);

  if (isHidden(p)) return null;
  const attrs = { ...baseAttrs(p), 'data-accent': p.accent };
  if (!sdk) {
    return (
      <div {...attrs} data-unavailable="" role="note">
        {p.ctl}: this control needs a UiPath connection (fill in uipath.json and run it
        through the platform).
      </div>
    );
  }
  return (
    <div {...attrs} ref={host} className={[attrs.className, 'ui-validation-station'].filter(Boolean).join(' ')}
      data-loaded={loaded || undefined} data-disabled={p.disabled === true || undefined}>
      {loadError ? (
        <div className="ui-validation-station-error" role="alert">Unable to load Validation control</div>
      ) : !doc || !artifacts ? (
        <div className="ui-validation-station-waiting">{doc ? 'Loading…' : 'Waiting for input'}</div>
      ) : (
        <ValidationStation
          sdk={sdk}
          data={doc}
          artifacts={artifacts}
          documentId={doc.DocumentId}
          theme={bodyTheme()}
          isReadonly={p.disabled === true}
          options={options}
          save={save}
          setFieldValueByPath={setByPath}
          selectAndFocusFieldValueByPath={focusByPath}
          deleteFieldValueByPath={deleteByPath}
          onLoaded={() => { setLoaded(true); void fireRule(p.onReady); }}
          onDocumentTypeChanged={(id: string) => { publish({ SelectedDocumentType: id }); void fireRule(p.onDocumentTypeChanged); }}
          onExtractionResultChanged={(result: unknown) => publish({ ExtractionResult: result })}
          onFieldValueSelected={(details: IFieldValueDetailsDto) => { publish({ SelectedField: details }); void fireRule(p.onFieldSelected); }}
          onFieldValueChanged={(details: IFieldValueDetailsDto) => { publish({ SelectedField: details }); void fireRule(p.onFieldValueChanged); }}
          onBusinessRulesEvaluated={(rules: EvaluatedBusinessRulesForFieldValueDto[]) => {
            if (variable) setAppVar(variable, { ...(getAppVar<StationState>(variable) ?? {}), BusinessRules: rules });
          }}
          onSaveResult={onSaveResult}
          onSubmit={onSubmit}
          onSaveAsDraft={(_request: unknown, result?: SaveValidatedDataResult) => {
            if (result && !result.success) reportStationError(result.error ?? 'Unable to save the draft');
          }}
          onSetFieldValueByPathResult={onSetResult}
          onSelectAndFocusFieldValueByPathResult={onFocusResult}
          onDeleteFieldValueByPathResult={onDeleteResult}
        />
      )}
    </div>
  );
}

/** The exported control: the real component inside its own error boundary. */
export function UiValidationStation(p: UiValidationStationProps) {
  return <Guarded ctl={p.ctl}><UiValidationStationImpl {...p} /></Guarded>;
}
