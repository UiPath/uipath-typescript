import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ValidationStation,
  ValidationStationLanguage,
  type IValidationStationOptions,
  type IVsSaveExceptionReportRequest,
  type IVsSaveValidatedDataAsDraftRequest,
  type IVsSaveValidatedDataRequest,
  type SaveValidatedDataResult,
} from '@uipath/ui-widgets-validation-station';
import { OrchestratorDuModule } from '@uipath/uipath-typescript/orchestrator-du-module';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import { MessageSeverity, Theme } from '@uipath/coded-action-app';
import { codedActionApp, sdk } from '../uipath';
import './Validation.css';

/** Themes the widget accepts - the Theme enum minus AutoTheme, which the app resolves. */
type WidgetTheme = 'light' | 'dark' | 'light-hc' | 'dark-hc';

interface ActionInputs {
  contentValidationData?: DuFramework.ContentValidationData | null;
}

// Makes the web component emit its in-memory extraction state as the reviewer edits, which
// is what the built-in "Save as draft" button uploads. Without it that button is a no-op.
const VALIDATION_STATION_OPTIONS: IValidationStationOptions = {
  emitDtoStateChanges: true,
};

// The only outcome declared in action-schema.json, and only the submit flow uses it: a
// validation action is finished or it is not, so there is no approve/reject decision to
// record. Reporting an exception deliberately does not complete the action - see below.
const SUBMIT_OUTCOME = 'Submit';

/** Work this app does after the widget has handed back control and gone idle. */
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
  // The task's whole input bag is kept, not just the payload the widget needs: it has to be
  // handed back verbatim on completion, or Action Center records the task with empty data.
  const [taskData, setTaskData] = useState<ActionInputs | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [isReadonly, setIsReadonly] = useState(false);
  const [theme, setTheme] = useState<WidgetTheme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const duModule = useMemo(() => new OrchestratorDuModule(sdk), []);

  // The widget scopes its bucket calls to the folder named on the payload, so fill in the
  // task's folder when the payload arrived without one.
  const data = useMemo(() => {
    const payload = taskData?.contentValidationData;
    if (!payload) return null;
    if (payload.FolderId !== undefined || payload.FolderKey !== undefined) return payload;
    return folderId === null ? payload : { ...payload, FolderId: folderId };
  }, [taskData, folderId]);

  useEffect(() => {
    codedActionApp
      .getTask()
      .then((task) => {
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
    // pass on current task data to completeTask
    const result = await codedActionApp.completeTask(outcome, payload);
    if (!result.success) {
      codedActionApp.showMessage(
        result.errorMessage ?? 'Failed to complete the action.',
        MessageSeverity.Error,
      );
    }
  }, []);

  // Submit finished: the widget has run ProcessExtractedData and uploaded the validated
  // result. It renders nothing on failure, so every error has to surface from here.
  //
  // `result` is only populated when the widget owned the write-back, which it does here
  // because it was given `sdk` + `data`. No result means nothing was persisted - treated as
  // a failure, rather than completing the action over unsaved edits.
  const handleSubmit = useCallback(
    async (_request: IVsSaveValidatedDataRequest, result?: SaveValidatedDataResult) => {
      if (!result?.success) {
        codedActionApp.showMessage(
          result?.error ?? 'Failed to submit the document.',
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

  // The widget makes no API call when the reviewer reports an exception - it just hands the
  // host the document id and reason. Persisting it is this app's job.
  //
  // This flow does NOT complete the action: submitExceptionReport transitions the task on the
  // Document Understanding side, so completing it here as well would be a second close.
  const handleReportException = useCallback(
    async (request: IVsSaveExceptionReportRequest) => {
      if (taskId === null || folderId === null) return;

      // `exceptionReport` is typed `unknown` on the widget's contract - it carries the
      // IReportAsExceptionDTO shape, of which the reason is the only part this app needs.
      const { Reason } = (request.exceptionReport ?? {}) as { Reason?: string };

      setPendingAction('report');
      try {
        const response = await duModule.submitExceptionReport(
          taskId,
          request.documentId,
          Reason || 'Reported via Validation Station',
          { folderId },
        );

        if (!response.IsSuccessful) {
          codedActionApp.showMessage(
            response.ErrorMessage ?? 'Failed to report the exception.',
            MessageSeverity.Error,
          );
          return;
        }

        // Nothing else to do - say so, since not completing means the pane does not change.
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

  // No toolbar of our own: the widget ships its own action bar (submit, save as draft,
  // discard, report as exception) and adding a second set would render every action twice.
  return (
    <div className="validation-host">
      <ValidationStation
        sdk={sdk}
        data={data}
        theme={theme}
        language={ValidationStationLanguage.English}
        isReadonly={isReadonly}
        options={VALIDATION_STATION_OPTIONS}
        onSubmit={handleSubmit}
        onSaveAsDraft={handleSaveAsDraft}
        onReportException={handleReportException}
      />
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
