import { useEffect, useMemo, useState } from 'react';
import { Entities, EntityFieldDataType, FieldDisplayType, QueryFilterOperator } from '@uipath/uipath-typescript/entities';
import type { EntityGetResponse, EntityRecord } from '@uipath/uipath-typescript/entities';
import { useAuth } from '../hooks/useAuth';

type StepStatus = 'idle' | 'running' | 'done' | 'error' | 'skipped';

interface Step {
  title: string;
  call: string;
  status: StepStatus;
  detail?: string;
}

interface DownloadResult {
  url: string;
  type: string;
  size: number;
  text?: string;
}

const INITIAL_STEPS: Step[] = [
  { title: 'Create record', call: 'entities.insertRecordById(entityId, data)', status: 'idle' },
  { title: 'Upload attachment', call: 'entities.uploadAttachment(entityId, recordId, fieldName, file)', status: 'idle' },
  { title: 'Store id in text field', call: 'entities.updateRecordById(entityId, recordId, { [linkField]: id })', status: 'idle' },
  { title: 'Query record', call: 'entities.queryRecordsById(entityId, { filterGroup })  →  POST EntityService/entity/{id}/query', status: 'idle' },
  { title: 'Look up stored id', call: 'new Set(records.map(r => r.Id)).has(record[linkField])', status: 'idle' },
  { title: 'Download attachment', call: 'entities.downloadAttachment(entityId, record.Id, fieldName)', status: 'idle' },
];

const STATUS_STYLES: Record<StepStatus, string> = {
  idle: 'bg-gray-100 text-gray-500',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  skipped: 'bg-amber-100 text-amber-700',
};

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

// Data Fabric S202 serializes GUIDs in uppercase on the app-layer JSON path; S201 emitted lowercase.
const guidCase = (value: string) => {
  const letters = value.replace(/[^a-fA-F]/g, '');
  if (!letters) return 'digits only';
  if (letters === letters.toUpperCase()) return 'UPPERCASE';
  return letters === letters.toLowerCase() ? 'lowercase' : 'mixed';
};

export const AttachmentFlow = () => {
  const { sdk } = useAuth();
  const entities = useMemo(() => new Entities(sdk), [sdk]);

  const [allEntities, setAllEntities] = useState<EntityGetResponse[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [entityId, setEntityId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [recordJson, setRecordJson] = useState('{}');
  const [existingRecordId, setExistingRecordId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // Text field that holds a record id, like receipt-prod's P04Receipt.FileProcessingStatus
  const [linkField, setLinkField] = useState('');
  // Stored value as written before DF S202 (lowercase) or as Data Fabric returns it now
  const [storeLowercase, setStoreLowercase] = useState(true);
  const [mimicReceiptProd, setMimicReceiptProd] = useState(true);

  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [queriedRecord, setQueriedRecord] = useState<EntityRecord | null>(null);
  const [download, setDownload] = useState<DownloadResult | null>(null);

  // Only entities that have at least one File-type field can hold attachments
  const attachmentEntities = useMemo(
    () => allEntities.filter((e) => e.fields.some((f) => f.fieldDisplayType === FieldDisplayType.File)),
    [allEntities]
  );
  const selectedEntity = attachmentEntities.find((e) => e.id === entityId);
  const fileFields = selectedEntity?.fields.filter((f) => f.fieldDisplayType === FieldDisplayType.File) ?? [];
  const textFields =
    selectedEntity?.fields.filter((f) => !f.isSystemField && f.fieldDataType?.name === EntityFieldDataType.STRING) ?? [];

  useEffect(() => {
    entities
      .getAll()
      .then(setAllEntities)
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoadingEntities(false));
  }, [entities]);

  useEffect(() => () => {
    if (download) URL.revokeObjectURL(download.url);
  }, [download]);

  const selectEntity = (id: string) => {
    setEntityId(id);
    const entity = attachmentEntities.find((e) => e.id === id);
    setFieldName(entity?.fields.find((f) => f.fieldDisplayType === FieldDisplayType.File)?.name ?? '');
    setLinkField(
      entity?.fields.find((f) => !f.isSystemField && f.fieldDataType?.name === EntityFieldDataType.STRING)?.name ?? ''
    );
  };

  const updateStep = (index: number, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const run = async () => {
    if (!selectedEntity || !fieldName || !linkField || !file) return;

    setRunning(true);
    setSteps(INITIAL_STEPS);
    setQueriedRecord(null);
    setDownload(null);

    let current = 0;
    try {
      // 1. Create a record to attach the file to (or reuse an existing one)
      updateStep(current, { status: 'running' });
      let recordId = existingRecordId.trim();
      if (recordId) {
        updateStep(current, { status: 'done', detail: `Skipped — using existing record ${recordId}` });
      } else {
        const data: Record<string, unknown> = JSON.parse(recordJson || '{}');
        const inserted = await entities.insertRecordById(selectedEntity.id, data);
        recordId = inserted.Id;
        updateStep(current, { status: 'done', detail: `Created record ${recordId}` });
      }

      // 2. Upload the file into the record's File field
      current = 1;
      updateStep(current, { status: 'running' });
      await entities.uploadAttachment(selectedEntity.id, recordId, fieldName, file);
      updateStep(current, { status: 'done', detail: `Uploaded "${file.name}" (${file.size} bytes) to ${fieldName}` });

      // 3. Store the record's id as text, as receipt-prod does with
      //    Rk(sdk, receiptId, { ReceiptStatus: "05", FileProcessingStatus: id })
      current = 2;
      updateStep(current, { status: 'running' });
      const storedId = storeLowercase ? recordId.toLowerCase() : recordId;
      await entities.updateRecordById(selectedEntity.id, recordId, { [linkField]: storedId });
      updateStep(current, {
        status: 'done',
        detail: `${linkField} = ${storedId} (${guidCase(storedId)}${storeLowercase ? ', as written before DF S202' : ''})`,
      });

      // 4. Find the record again via the query endpoint
      current = 3;
      updateStep(current, { status: 'running' });
      const result = await entities.queryRecordsById(selectedEntity.id, {
        filterGroup: {
          queryFilters: [{ fieldName: 'Id', operator: QueryFilterOperator.Equals, value: recordId }],
        },
      });
      const record = result.items[0];
      if (!record) throw new Error(`Record ${recordId} not returned by query`);
      setQueriedRecord(record);
      updateStep(current, {
        status: 'done',
        detail: `Found ${result.items.length} record(s). Queried Id = ${record.Id} (${guidCase(record.Id)})`,
      });

      // 5. Look the stored id up among the queried ids, as receipt-prod does with
      //    ReceiptStatus === "05" && FileProcessingStatus && idSet.has(FileProcessingStatus)
      current = 4;
      updateStep(current, { status: 'running' });
      const linkedId = String(record[linkField] ?? '');
      const idSet = new Set(result.items.map((r) => String(r.Id)));
      const found = idSet.has(linkedId);
      const foundIgnoringCase = [...idSet].some((id) => id.toLowerCase() === linkedId.toLowerCase());
      const lookupDetail =
        `${linkField} = ${linkedId} (${guidCase(linkedId)}), queried Id = ${record.Id} (${guidCase(record.Id)}). ` +
        `idSet.has(): ${found ? 'FOUND' : 'NOT FOUND'}; ignoring case: ${foundIgnoringCase ? 'FOUND' : 'NOT FOUND'}.`;
      if (mimicReceiptProd && !found) {
        updateStep(current, { status: 'error', detail: lookupDetail });
        updateStep(current + 1, {
          status: 'skipped',
          detail: 'Skipped: the stored id was not found among the queried ids, so the record is dropped (receipt-prod behaviour).',
        });
        return;
      }
      updateStep(current, { status: 'done', detail: lookupDetail });

      // 6. Download the attachment from the queried record
      current = 5;
      updateStep(current, { status: 'running' });
      const blob = await entities.downloadAttachment(selectedEntity.id, record.Id, fieldName);
      const type = blob.type || file.type;
      setDownload({
        url: URL.createObjectURL(blob),
        type,
        size: blob.size,
        text: type.startsWith('text/') || type === 'application/json' ? await blob.text() : undefined,
      });
      updateStep(current, { status: 'done', detail: `Downloaded ${blob.size} bytes (${type || 'unknown type'})` });
    } catch (err) {
      console.error(err);
      updateStep(current, { status: 'error', detail: errorMessage(err) });
    } finally {
      setRunning(false);
    }
  };

  if (loadingEntities) {
    return <p className="text-gray-600">Loading entities...</p>;
  }

  if (loadError) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{loadError}</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">1. Choose where to attach</h2>

        {attachmentEntities.length === 0 ? (
          <p className="text-sm text-gray-600">
            No entities with a File field were found. Add a File field to an entity in Data Fabric and reload.
          </p>
        ) : (
          <>
            <label className="block text-sm">
              <span className="text-gray-700">Entity</span>
              <select
                value={entityId}
                onChange={(e) => selectEntity(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select an entity</option>
                {attachmentEntities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.displayName || e.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">File field</span>
              <select
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                disabled={!selectedEntity}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
              >
                {fileFields.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.displayName || f.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">New record data (JSON)</span>
              <textarea
                value={recordJson}
                onChange={(e) => setRecordJson(e.target.value)}
                disabled={!!existingRecordId.trim()}
                rows={4}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs disabled:bg-gray-100"
              />
              <span className="text-xs text-gray-500">Fill in any required fields of the entity.</span>
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">…or existing record ID (optional)</span>
              <input
                value={existingRecordId}
                onChange={(e) => setExistingRecordId(e.target.value)}
                placeholder="Leave empty to create a new record"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
              />
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">Text field to store the id in</span>
              <select
                value={linkField}
                onChange={(e) => setLinkField(e.target.value)}
                disabled={!selectedEntity}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
              >
                {textFields.length === 0 && <option value="">No text fields on this entity</option>}
                {textFields.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.displayName || f.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500">
                Plays the role of receipt-prod's <code>FileProcessingStatus</code>: an id kept in a text column.
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={storeLowercase} onChange={(e) => setStoreLowercase(e.target.checked)} />
              Store the id lowercase (as written before DF S202)
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={mimicReceiptProd}
                onChange={(e) => setMimicReceiptProd(e.target.checked)}
              />
              Mimic receipt-prod: drop the record when the stored id is not found
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">File</span>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
              />
            </label>

            <button
              onClick={run}
              disabled={running || !selectedEntity || !fieldName || !linkField || !file}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg"
            >
              {running ? 'Running...' : 'Upload, query & download'}
            </button>
          </>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">2. Steps</h2>
        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.title} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{step.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[step.status]}`}>{step.status}</span>
              </div>
              <code className="block mt-1 text-[11px] text-gray-500 break-all">{step.call}</code>
              {step.detail && (
                <p className={`mt-1 text-xs ${step.status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{step.detail}</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {queriedRecord && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Queried record</h2>
          <pre className="text-xs bg-gray-50 rounded-md p-3 overflow-auto max-h-64">
            {JSON.stringify(queriedRecord, null, 2)}
          </pre>
        </section>
      )}

      {download && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Downloaded attachment</h2>
            <a
              href={download.url}
              download={file?.name ?? 'attachment'}
              className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md"
            >
              Save file
            </a>
          </div>
          {download.type.startsWith('image/') && (
            <img src={download.url} alt="Downloaded attachment" className="max-h-96 rounded-md border" />
          )}
          {download.type === 'application/pdf' && (
            <iframe src={download.url} title="Downloaded attachment" className="w-full h-96 rounded-md border" />
          )}
          {download.text !== undefined && (
            <pre className="text-xs bg-gray-50 rounded-md p-3 overflow-auto max-h-64">{download.text}</pre>
          )}
        </section>
      )}
    </div>
  );
};
