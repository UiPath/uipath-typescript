import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CompactBusinessRules,
  CompactDocTypeField,
  CompactFieldsForm,
  CompactTableEditor,
  DocumentViewer,
  useBucketArtifacts,
  ValidationStationLanguage,
  type IValidationStationOptions,
  type SaveValidatedDataResult,
} from '@uipath/ui-widgets-validation-station';
import { OrchestratorDuModule } from '@uipath/uipath-typescript/orchestrator-du-module';
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

// The doc-type field and business rules are rendered as their own panels below, so the fields
// form drops its built-in copies. emitDtoStateChanges is what makes "Save as draft" work.
const FIELDS_FORM_OPTIONS: IValidationStationOptions = {
  hideBusinessRules: true,
  hideDocumentTypeField: true,
  emitDtoStateChanges: true,
};

// The only outcome declared in action-schema.json, and only the submit flow uses it.
// Reporting an exception deliberately does not complete the action - see below.
const SUBMIT_OUTCOME = 'Submit';

/** Work this app does after the fields form has handed back control. */
type PendingAction = 'submit' | 'report';

const PENDING_LABELS: Record<PendingAction, string> = {
  submit: 'Completing the action…',
  report: 'Reporting the exception…',
};

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
  const [taskId, setTaskId] = useState<number | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [isReadonly, setIsReadonly] = useState(false);
  const [theme, setTheme] = useState<WidgetTheme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const duModule = useMemo(() => new OrchestratorDuModule(sdk), []);

  const data = taskData?.contentValidationData ?? null;

  useEffect(() => {
    codedActionApp
      .getTask()
      .then((task) => {
        // task.data is typed `unknown`; it is the inputs bag from action-schema.json.
        setTaskData((task.data as ActionInputs | null) ?? null);
        setTaskId(task.taskId);
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

  const completeTask = useCallback(async (outcome: string, payload: unknown) => {
    // completeTask REPLACES the task's data. contentValidationData must go back exactly as
    // getTask() gave it; any other field can carry what the reviewer changed.
    const result = await codedActionApp.completeTask(outcome, payload);
    if (!result.success) {
      codedActionApp.showMessage(
        result.errorMessage ?? 'Failed to complete the action.',
        MessageSeverity.Error,
      );
    }
  }, []);

  // Submit finished: the fields form has run ProcessExtractedData and uploaded the validated
  // result. It renders nothing on failure, so every error has to surface from here.
  const handleSubmitComplete = useCallback(
    async (result: SaveValidatedDataResult) => {
      if (!result.success) {
        codedActionApp.showMessage(
          result.error ?? 'Failed to submit the document.',
          MessageSeverity.Error,
        );
        return;
      }

      setPendingAction('submit');
      try {
        await completeTask(SUBMIT_OUTCOME, taskData);
      } finally {
        setPendingAction(null);
      }
    },
    [completeTask, taskData],
  );

  // A draft leaves the action open for the reviewer to come back to, so there is nothing to
  // complete here - only the outcome to report.
  const handleSaveAsDraftComplete = useCallback((result: SaveValidatedDataResult) => {
    codedActionApp.showMessage(
      result.success ? 'Draft saved.' : (result.error ?? 'Failed to save the draft.'),
      result.success ? MessageSeverity.Success : MessageSeverity.Error,
    );
  }, []);

  // The fields form makes no API call when the reviewer reports an exception - it just hands
  // the host the document id and reason. Persisting it is this app's job.
  //
  // This flow does NOT complete the action: submitExceptionReport transitions the task on the
  // Document Understanding side, so completing it here as well would be a second close.
  const handleReportExceptionComplete = useCallback(
    async (documentId: string, reason: string) => {
      if (taskId === null || folderId === null) return;

      setPendingAction('report');
      try {
        const response = await duModule.submitExceptionReport(
          taskId,
          documentId,
          reason || 'Reported via Validation Station',
          { folderId },
        );

        if (!response.IsSuccessful) {
          codedActionApp.showMessage(
            response.ErrorMessage ?? 'Failed to report the exception.',
            MessageSeverity.Error,
          );
          return;
        }

        codedActionApp.showMessage('Exception reported.', MessageSeverity.Success);
      } catch (err: unknown) {
        codedActionApp.showMessage(
          errorMessage(err, 'Failed to report the exception.'),
          MessageSeverity.Error,
        );
      } finally {
        setPendingAction(null);
      }
    },
    [duModule, taskId, folderId],
  );

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
      folderId={folderId}
      theme={theme}
      isReadonly={isReadonly}
      pendingAction={pendingAction}
      onSubmitComplete={handleSubmitComplete}
      onSaveAsDraftComplete={handleSaveAsDraftComplete}
      onReportExceptionComplete={handleReportExceptionComplete}
    />
  );
};

interface WorkspaceProps {
  data: DuFramework.ContentValidationData;
  folderId: number | null;
  theme: WidgetTheme;
  isReadonly: boolean;
  pendingAction: PendingAction | null;
  onSubmitComplete: (result: SaveValidatedDataResult) => void;
  onSaveAsDraftComplete: (result: SaveValidatedDataResult) => void;
  onReportExceptionComplete: (documentId: string, reason: string) => void;
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
  folderId,
  theme,
  isReadonly,
  pendingAction,
  onSubmitComplete,
  onSaveAsDraftComplete,
  onReportExceptionComplete,
}: WorkspaceProps) => {
  // Fetched here, in the parent, and shared. Calling this per subcomponent would download
  // the same unchanged document once per panel.
  const { artifacts, error } = useBucketArtifacts(sdk, data, folderId ?? undefined);

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
          {/* The only subcomponent that persists, so the only one given sdk + data + folderId. */}
          <CompactFieldsForm
            {...shared}
            sdk={sdk}
            data={data}
            folderId={folderId ?? undefined}
            options={FIELDS_FORM_OPTIONS}
            onSubmitComplete={onSubmitComplete}
            onSaveAsDraftComplete={onSaveAsDraftComplete}
            onReportExceptionComplete={onReportExceptionComplete}
          />
        </Panel>

        <Panel area="table" label="Line items — select a table field to edit">
          <CompactTableEditor {...shared} />
        </Panel>

        <Panel area="rules" label="Business rules">
          <CompactBusinessRules {...shared} />
        </Panel>
      </div>

      {pendingAction && (
        <div className="validation-busy" role="status" aria-live="polite">
          <span className="validation-busy__spinner" aria-hidden="true" />
          {PENDING_LABELS[pendingAction]}
        </div>
      )}
    </div>
  );
};

export default Validation;
