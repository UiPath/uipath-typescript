import { ChangeEvent, useState } from 'react';
import { MessageSeverity } from '@uipath/coded-action-app';
import uipath from '../uipath';
import './Uploader.css';

/** Shape Action Center uses for a `file` field. Only `ID` is required; the rest is for display. */
export interface SupportingDocument {
  ID: string;
  FullName: string;
  MimeType: string;
}

interface UploaderProps {
  folderId: number | undefined;
  jobKey: string | null;
  isReadOnly: boolean;
  initialDocument: SupportingDocument | null;
  onChange: (document: SupportingDocument | null) => void;
  onView: (preview: { url: string; name: string }) => void;
}

/** The heading the file is filed under on the job. */
const ATTACHMENT_CATEGORY = 'Reviewer upload';

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

const Uploader = ({
  folderId,
  jobKey,
  isReadOnly,
  initialDocument,
  onChange,
  onView,
}: UploaderProps) => {
  const [attached, setAttached] = useState(initialDocument);
  const [isUploading, setIsUploading] = useState(false);

  const handlePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still raises a change event.
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      // `jobKey` binds the attachment to the job in the same call that creates it.
      const attachment = await uipath.attachmentService.create(file.name, file, {
        folderId,
        jobKey: jobKey ?? undefined,
        category: jobKey ? ATTACHMENT_CATEGORY : undefined,
      });

      const document: SupportingDocument = {
        ID: attachment.id,
        FullName: file.name,
        MimeType: file.type || 'application/octet-stream',
      };
      setAttached(document);
      onChange(document);
    } catch (err: unknown) {
      uipath.codedActionAppsService.showMessage(
        errorMessage(err, 'The upload failed.'),
        MessageSeverity.Error,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const view = async (document: SupportingDocument) => {
    try {
      const { blobFileAccess } = await uipath.attachmentService.getById(document.ID);
      onView({ url: blobFileAccess.uri, name: document.FullName });
    } catch (err: unknown) {
      uipath.codedActionAppsService.showMessage(
        errorMessage(err, 'Could not read the attachment.'),
        MessageSeverity.Error,
      );
    }
  };

  // Drops the file from the action output. The attachment stays on the job.
  const remove = () => {
    setAttached(null);
    onChange(null);
  };

  return (
    <section className="uploader">
      <h2 className="uploader__title">Supporting document</h2>
      <p className="uploader__subtitle">
        {jobKey
          ? 'Attached to the job behind this action, so it stays visible to anyone who can see that job.'
          : 'The attachment is created but not linked to a job, due to a missing job key.'}
      </p>

      {attached ? (
        <div className="uploader__file">
          <span className="uploader__name" title={attached.FullName}>
            {attached.FullName}
          </span>
          <button
            type="button"
            className="pdf-btn pdf-btn--download"
            onClick={() => view(attached)}
            title="Show in the viewer below"
          >
            View
          </button>
          {!isReadOnly && (
            <button type="button" className="pdf-btn" onClick={remove} title="Remove">
              ✕
            </button>
          )}
        </div>
      ) : isReadOnly ? (
        <p className="uploader__empty">No supporting document attached.</p>
      ) : (
        <div className="uploader__file">
          <input type="file" onChange={handlePick} disabled={isUploading} />
          {isUploading && <span className="uploader__empty">Uploading…</span>}
        </div>
      )}
    </section>
  );
};

export default Uploader;
