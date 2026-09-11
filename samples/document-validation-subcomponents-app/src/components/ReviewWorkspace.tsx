import {
  CompactBusinessRules,
  CompactDocTypeField,
  CompactFieldsForm,
  CompactTableEditor,
  DocumentViewer,
  useDuDocumentArtifacts,
  ValidationStationLanguage,
  type IVsSaveExceptionReportRequest,
  type IVsSaveValidatedDataAsDraftRequest,
  type IVsSaveValidatedDataRequest,
  type SaveValidatedDataResult,
} from '@uipath/ui-widgets-validation-station';
import type { UiPath } from '@uipath/uipath-typescript/core';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import { useMemo, useState } from 'react';
import CenteredMessage from './CenteredMessage';
import Panel from './Panel';

interface ReviewWorkspaceProps {
  sdk: UiPath;
  task: TaskGetResponse;
  onSubmitComplete: (
    request: IVsSaveValidatedDataRequest,
    result?: SaveValidatedDataResult,
  ) => void;
  onSaveAsDraftComplete: (
    request: IVsSaveValidatedDataAsDraftRequest,
    result?: SaveValidatedDataResult,
  ) => void;
  onReportException: (documentId: string, reason: string) => void;
}

/**
 * The composed review screen. It fetches the document artifacts **once** via
 * `useDuDocumentArtifacts`, then hands the same artifacts to five compact
 * subcomponents laid out in a custom grid. Every subcomponent carries the same
 * `instanceId`, so they share one store: selecting a field in the form
 * highlights it in the viewer, selecting the line-items table opens the table
 * editor, and rule clicks focus the offending field — no cross-wiring needed.
 *
 * Only the fields form persists: it receives `sdk` + `data` (in addition to the
 * shared artifacts) so its built-in Submit / Save-draft / Report-exception
 * actions round-trip through the SDK. The other four are fed the pre-fetched
 * artifacts only.
 */
function ReviewWorkspace({
  sdk,
  task,
  onSubmitComplete,
  onSaveAsDraftComplete,
  onReportException,
}: ReviewWorkspaceProps) {
  // The artifacts fetch scopes itself to the folder named on the payload, so fill in the
  // task's folder when the payload arrived without one. Memoised because the fetch keys off
  // this object's identity - a fresh one each render would refetch the document forever.
  const data = useMemo(() => {
    const raw = task.data as DuFramework.ContentValidationData;
    if (raw.FolderId != null || raw.FolderKey != null || task.folderId == null) return raw;
    return { ...raw, FolderId: task.folderId };
  }, [task]);

  const { artifacts, error } = useDuDocumentArtifacts(sdk, data);
  const [status, setStatus] = useState<string>('');

  if (error)
    return <CenteredMessage tone="error" text={`Failed to load document: ${error}`} />;
  if (!artifacts) return <CenteredMessage text="Loading document…" />;

  const documentId = data.DocumentId;
  // One shared store for the whole workspace, scoped to this document.
  const instanceId = `doc-review-${documentId ?? task.id}`;

  // Data every subcomponent shares (fetched once, fed as JS properties).
  const shared = {
    artifacts,
    documentId,
    instanceId,
    theme: 'light' as const,
    language: ValidationStationLanguage.English,
    // Not persistent: these panels live in a static grid and are never
    // re-parented, so they don't need the portal-survival path. Leaving it on
    // makes the ref cleanup call forceDestroy() on StrictMode's throwaway
    // unmount, tearing down the Angular element so it never re-renders (blank).
    persistent: false,
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 min-h-0 p-2 grid gap-2"
        style={{
          gridTemplateColumns: '1.3fr 1fr',
          gridTemplateRows: 'auto 1fr auto',
          gridTemplateAreas: `
            "viewer doctype"
            "viewer form"
            "table  rules"
          `,
        }}
      >
        <Panel area="viewer">
          <DocumentViewer {...shared} style={{ height: '100%' }} />
        </Panel>

        <Panel area="doctype" label="Document type">
          <CompactDocTypeField
            {...shared}
            onDocumentTypeChanged={(id) => setStatus(`Document type → ${id}`)}
          />
        </Panel>

        <Panel area="form">
          {/* hideBusinessRules / hideDocumentTypeField: the standalone panels
              below own those surfaces, so the form drops its built-in ones. */}
          <CompactFieldsForm
            {...shared}
            sdk={sdk}
            data={data}
            options={{
              hideBusinessRules: true,
              hideDocumentTypeField: true,
              emitDtoStateChanges: true,
            }}
            onFieldValueSelected={(d) =>
              setStatus(`Selected field: ${d.Field?.FieldName ?? '?'}`)
            }
            onDirtyChange={(dirty) => dirty && setStatus('Unsaved changes')}
            onSubmit={onSubmitComplete}
            onSaveAsDraft={onSaveAsDraftComplete}
            onReportException={(request: IVsSaveExceptionReportRequest) => {
              // `exceptionReport` is typed `unknown` on the widget's contract - it carries
              // the IReportAsExceptionDTO shape, of which the reason is all this app needs.
              const { Reason } = (request.exceptionReport ?? {}) as { Reason?: string };
              onReportException(request.documentId, Reason ?? '');
            }}
          />
        </Panel>

        <Panel area="table" label="Line items — select a table field to edit">
          <CompactTableEditor
            {...shared}
            onClosed={() => setStatus('Closed table editor')}
          />
        </Panel>

        <Panel area="rules" label="Business rules">
          <CompactBusinessRules
            {...shared}
            onBusinessRuleClick={(rule) =>
              setStatus(`Rule clicked → field ${rule.fieldId}`)
            }
          />
        </Panel>
      </div>

      <div className="px-4 py-1 border-t border-gray-200 shrink-0 flex items-center gap-2 min-h-[28px] text-xs">
        <span className="text-gray-500">
          Shared store: <code className="text-gray-700">{instanceId}</code>
        </span>
        {status && <span className="text-gray-900">· {status}</span>}
      </div>
    </div>
  );
}

export default ReviewWorkspace;
