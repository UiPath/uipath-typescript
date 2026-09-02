import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ValidationStation,
  ValidationStationLanguage,
  type IValidationStationOptions,
  type SaveValidatedDataResult,
} from '@uipath/ui-widgets-validation-station';
import { OrchestratorDuModule } from '@uipath/uipath-typescript/orchestrator-du-module';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import { MessageSeverity, Theme } from '@uipath/coded-action-app';
import { codedActionApp, sdk } from '../uipath';
import './Validation.css';

/** Themes the widget accepts - the Theme enum minus AutoTheme, which the app resolves. */
type WidgetTheme = 'light' | 'dark' | 'light-hc' | 'dark-hc';

/** The `inputs` bag declared in action-schema.json, as delivered in `task.data`. */
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
  const [data, setData] = useState<DuFramework.ContentValidationData | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [isReadonly, setIsReadonly] = useState(false);
  const [theme, setTheme] = useState<WidgetTheme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const duModule = useMemo(() => new OrchestratorDuModule(sdk), []);

  useEffect(() => {
    codedActionApp
      .getTask()
      .then((task) => {
        const inputs = task.data as ActionInputs | null;
        setData(inputs?.contentValidationData ?? null);
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

  const completeTask = useCallback(async (outcome: string) => {
    // The validated document already sits in the storage bucket - the widget put it there -
    // so the completion carries no payload of its own.
    const result = await codedActionApp.completeTask(outcome, {});
    if (!result.success) {
      codedActionApp.showMessage(
        result.errorMessage ?? 'Failed to complete the action.',
        MessageSeverity.Error,
      );
    }
  }, []);

  // Submit finished: the widget has run ProcessExtractedData and uploaded the validated
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
        await completeTask(SUBMIT_OUTCOME);
      } finally {
        setPendingAction(null);
      }
    },
    [completeTask],
  );

  // A draft leaves the action open for the reviewer to come back to, so there is nothing to
  // complete here - only the outcome to report.
  const handleSaveAsDraftComplete = useCallback((result: SaveValidatedDataResult) => {
    codedActionApp.showMessage(
      result.success ? 'Draft saved.' : (result.error ?? 'Failed to save the draft.'),
      result.success ? MessageSeverity.Success : MessageSeverity.Error,
    );
  }, []);

  // The widget makes no API call when the reviewer reports an exception - it just hands the
  // host the document id and reason. Persisting it is this app's job.
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
        folderId={folderId ?? undefined}
        theme={theme}
        language={ValidationStationLanguage.English}
        isReadonly={isReadonly}
        options={VALIDATION_STATION_OPTIONS}
        onSubmitComplete={handleSubmitComplete}
        onSaveAsDraftComplete={handleSaveAsDraftComplete}
        onReportExceptionComplete={handleReportExceptionComplete}
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
