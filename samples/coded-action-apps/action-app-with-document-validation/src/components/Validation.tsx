import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ValidationStation,
  ValidationStationLanguage,
  type IValidationStationOptions,
  type IVsSaveValidatedDataAsDraftRequest,
  type IVsSaveValidatedDataRequest,
  type SaveValidatedDataResult,
} from '@uipath/ui-widgets-validation-station';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import { MessageSeverity, Theme } from '@uipath/coded-action-app';
import { codedActionApp, sdk } from '../uipath';
import './Validation.css';

/** Themes the widget accepts - the Theme enum minus AutoTheme, which the app resolves. */
type WidgetTheme = 'light' | 'dark' | 'light-hc' | 'dark-hc';

interface ActionInputs {
  contentValidationData?: DuFramework.ContentValidationData | null;
}

const VALIDATION_STATION_OPTIONS: IValidationStationOptions = {
  // Makes the web component emit its in-memory extraction state as the reviewer edits, which
  // is what the built-in "Save as draft" button uploads. Without it that button is a no-op.
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
  // The task's whole input bag is kept, not just the payload the widget needs: it has to be
  // handed back verbatim on completion, or Action Center records the task with empty data.
  const [taskData, setTaskData] = useState<ActionInputs | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [isReadonly, setIsReadonly] = useState(false);
  const [theme, setTheme] = useState<WidgetTheme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // The widget scopes its bucket calls to the folder named on the payload, so fill in the
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

      setIsCompleting(true);
      try {
        // The whole input bag goes back: completeTask REPLACES the task's data, so anything
        // left out is recorded as empty.
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
  // pass onReportException={handleReportException} to <ValidationStation /> below.
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

  // No toolbar of our own: the widget ships its own action bar (submit, save as draft,
  // discard) and adding a second set would render every action twice.
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
      />
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
