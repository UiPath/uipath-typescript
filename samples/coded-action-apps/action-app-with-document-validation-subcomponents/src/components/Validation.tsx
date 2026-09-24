import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CompactBusinessRules,
  CompactDocTypeField,
  CompactFieldsForm,
  CompactTableEditor,
  DocumentViewer,
  useDuDocumentArtifacts,
  ValidationStationLanguage,
  type DuSaveCallbacks,
  type IValidationStationOptions,
  type IVsSaveValidatedDataAsDraftRequest,
  type IVsSaveValidatedDataRequest,
  type SaveValidatedDataResult,
} from '@uipath/ui-widgets-validation-station';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import { MessageSeverity, Theme } from '@uipath/coded-action-app';
import { codedActionApp, sdk } from '../uipath';
import Panel from './Panel';
import './Validation.css';

/** Themes the subcomponents accept - the Theme enum minus AutoTheme, which the app resolves. */
type WidgetTheme = 'light' | 'dark' | 'light-hc' | 'dark-hc';

interface ActionInputs {
  contentValidationData?: DuFramework.ContentValidationData | null;
}

const FIELDS_FORM_OPTIONS: IValidationStationOptions = {
  // The doc-type field and business rules are rendered as their own panels below, so the
  // fields form drops its built-in copies. emitDtoStateChanges is what makes "Save as draft"
  // work.
  hideBusinessRules: true,
  hideDocumentTypeField: true,
  emitDtoStateChanges: true,

  // "Report as exception" is hidden: recording one needs submitExceptionReport, which takes
  // a Document Understanding validation task id. This action is an app task, so that call
  // always fails. See below if you want the button anyway.
  hideReportAsExceptionButton: true,
};

// The only outcome declared in action-schema.json: a validation action is finished or it is
// not, so there is no approve/reject decision to record.
const SUBMIT_OUTCOME = 'Submit';

const resolveTheme = (theme: Theme): WidgetTheme => {
  switch (theme) {
    case Theme.Dark:
      return 'dark';
    case Theme.LightHighContrast:
      return 'light-hc';
    case Theme.DarkHighContrast:
      return 'dark-hc';
    case Theme.Light:
      return 'light';
    default:
      // AutoTheme - Action Center is deferring to the operating system.
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
};

const isDarkTheme = (theme: WidgetTheme): boolean => theme === 'dark' || theme === 'dark-hc';

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

interface ValidationProps {
  onInitTheme: (isDark: boolean) => void;
}

const Validation = ({ onInitTheme }: ValidationProps) => {
  // Keep the bag: contentValidationData has to go back to completeTask untouched.
  const [taskData, setTaskData] = useState<ActionInputs | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [isReadonly, setIsReadonly] = useState(false);
  const [theme, setTheme] = useState<WidgetTheme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // The artifacts fetch scopes itself to the folder named on the payload, so fill in the
  // task's folder when the payload arrived without one.
  const data = useMemo(() => {
    const payload = taskData?.contentValidationData;
    if (!payload) return null;
    if (payload.FolderId != null || payload.FolderKey != null) return payload;
    return folderId == null ? payload : { ...payload, FolderId: folderId };
  }, [taskData, folderId]);

  useEffect(() => {
    codedActionApp
      .getTask()
      .then((task) => {
        // task.data is typed `unknown`; it is the inputs bag from action-schema.json.
        setTaskData((task.data as ActionInputs | null) ?? null);
        setFolderId(task.folderId);
        setIsReadonly(task.isReadOnly);

        const resolved = resolveTheme(task.theme);
        setTheme(resolved);
        onInitTheme(isDarkTheme(resolved));
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err, 'Failed to load the action.'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [onInitTheme]);

  // Submit finished: the fields form has run ProcessExtractedData and uploaded the validated
  // result. It renders nothing on failure, so every error has to surface from here.
  //
  // `result` is only populated when the form owned the write-back, which it does here because
  // it is the one subcomponent given `sdk` + `data`. No result means nothing was persisted -
  // treated as a failure, rather than completing the action over unsaved edits.
  const handleSubmit = useCallback(
    async (_request: IVsSaveValidatedDataRequest, result?: SaveValidatedDataResult) => {
      if (!result?.success) {
        codedActionApp.showMessage(
          result?.error ?? 'Failed to submit the document.',
          MessageSeverity.Error,
        );
        return;
      }

      setIsCompleting(true);
      try {
        // completeTask REPLACES the task's data, so the whole bag goes back:
        // contentValidationData exactly as getTask() gave it, plus anything the reviewer
        // changed.
        const completed = await codedActionApp.completeTask(SUBMIT_OUTCOME, taskData);
        if (!completed.success) {
          codedActionApp.showMessage(
            completed.errorMessage ?? 'Failed to complete the action.',
            MessageSeverity.Error,
          );
        }
      } finally {
        setIsCompleting(false);
      }
    },
    [taskData],
  );

  // A draft leaves the action open for the reviewer to come back to, so there is nothing to
  // complete here - only the outcome to report.
  const handleSaveAsDraft = useCallback(
    (_request: IVsSaveValidatedDataAsDraftRequest, result?: SaveValidatedDataResult) => {
      const saved = result?.success === true;
      codedActionApp.showMessage(
        saved ? 'Draft saved.' : (result?.error ?? 'Failed to save the draft.'),
        saved ? MessageSeverity.Success : MessageSeverity.Error,
      );
    },
    [],
  );

  // Want the button back? It still cannot record a real exception report, so the usual
  // fallback is to tell the reviewer and close the action. Drop hideReportAsExceptionButton
  // above, re-add `type IVsSaveExceptionReportRequest` to the import, uncomment this, and
  // put onReportException back on WorkspaceProps (drop the Omit), <Workspace /> and
  // <CompactFieldsForm />.
  //
  // const handleReportException = useCallback(
  //   async (request: IVsSaveExceptionReportRequest) => {
  //     // Nothing stores the reason - write it somewhere of your own if you need it.
  //     const { Reason } = (request.exceptionReport ?? {}) as { Reason?: string };
  //     console.warn('Exception reported:', Reason);
  //
  //     codedActionApp.showMessage('Exception noted. Closing the action.', MessageSeverity.Warning);
  //
  //     // Drop the rest to leave the action open instead. SUBMIT_OUTCOME is reused because it
  //     // is the only outcome in action-schema.json - add another to tell the two apart.
  //     setIsCompleting(true);
  //     try {
  //       await codedActionApp.completeTask(SUBMIT_OUTCOME, taskData);
  //     } finally {
  //       setIsCompleting(false);
  //     }
  //   },
  //   [taskData],
  // );

  if (isLoading) {
    return <p className="validation-status">Loading the action…</p>;
  }

  if (loadError) {
    return (
      <p className="validation-status validation-status--error" role="alert">
        {loadError}
      </p>
    );
  }

  if (!data) {
    return (
      <p className="validation-status validation-status--error" role="alert">
        This action arrived without its <code>contentValidationData</code> input, so there is no
        document to review.
      </p>
    );
  }

  return (
    <Workspace
      data={data}
      theme={theme}
      isReadonly={isReadonly}
      isCompleting={isCompleting}
      onSubmit={handleSubmit}
      onSaveAsDraft={handleSaveAsDraft}
    />
  );
};

// The two save callbacks are the widget's own `DuSaveCallbacks`, required rather than
// optional: the fields form is the only panel that persists, so both must be wired.
// `onReportException` is omitted because that button is hidden - see the block above.
interface WorkspaceProps extends Required<Omit<DuSaveCallbacks, 'onReportException'>> {
  data: DuFramework.ContentValidationData;
  theme: WidgetTheme;
  isReadonly: boolean;
  isCompleting: boolean;
}

/**
 * The composed review screen. Split out from `Validation` so the artifacts hook runs only
 * once the task payload exists, rather than on every render of the loading states.
 *
 * Fetches the document artifacts **once** and hands the same object to five subcomponents.
 * They all carry the same `instanceId`, which is the only wiring they need: selecting a field
 * in the form highlights it in the viewer, picking a table field opens the table editor, and
 * clicking a rule focuses the offending field.
 */
const Workspace = ({
  data,
  theme,
  isReadonly,
  isCompleting,
  onSubmit,
  onSaveAsDraft,
}: WorkspaceProps) => {
  // Fetched here, in the parent, and shared. Calling this per subcomponent would download
  // the same unchanged document once per panel.
  const { artifacts, error } = useDuDocumentArtifacts(sdk, data);

  if (error) {
    return (
      <p className="validation-status validation-status--error" role="alert">
        Failed to load the document: {error}
      </p>
    );
  }

  if (!artifacts) {
    return <p className="validation-status">Loading the document…</p>;
  }

  const shared = {
    artifacts,
    documentId: data.DocumentId,
    // One shared store for the whole workspace, scoped to this document.
    instanceId: `action-review-${data.DocumentId ?? 'document'}`,
    theme,
    language: ValidationStationLanguage.English,
    isReadonly,
    // These panels sit in a static grid and are never re-parented. Leaving `persistent` on
    // makes StrictMode's throwaway unmount call forceDestroy(), and the panel renders blank.
    persistent: false,
  };

  return (
    <div className="workspace">
      <div className="workspace__grid">
        <Panel area="viewer">
          <DocumentViewer {...shared} style={{ height: '100%' }} />
        </Panel>

        <Panel area="doctype" label="Document type">
          <CompactDocTypeField {...shared} />
        </Panel>

        <Panel area="form">
          {/* The only subcomponent that persists, so the only one given sdk + data. */}
          <CompactFieldsForm
            {...shared}
            sdk={sdk}
            data={data}
            options={FIELDS_FORM_OPTIONS}
            onSubmit={onSubmit}
            onSaveAsDraft={onSaveAsDraft}
          />
        </Panel>

        <Panel area="table" label="Line items — select a table field to edit">
          <CompactTableEditor {...shared} />
        </Panel>

        <Panel area="rules" label="Business rules">
          <CompactBusinessRules {...shared} />
        </Panel>
      </div>

      {isCompleting && (
        <div className="validation-busy" role="status" aria-live="polite">
          <span className="validation-busy__spinner" aria-hidden="true" />
          Completing the action…
        </div>
      )}
    </div>
  );
};

export default Validation;
