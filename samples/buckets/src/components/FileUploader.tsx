import { useState, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Buckets } from '@uipath/uipath-typescript/buckets';
import { UiPathError } from '@uipath/uipath-typescript/core';

export default function FileUploader() {
  const { sdk } = useAuth();
  const buckets = useMemo(() => (sdk ? new Buckets(sdk) : null), [sdk]);

  const [bucketId, setBucketId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buckets || !file) return;

    setUploading(true);
    setStatus(null);

    try {
      const result = await buckets.uploadFile({
        bucketId: Number(bucketId),
        folderId: Number(folderId),
        path: file.name,
        content: file,
      });

      if (result.success) {
        setStatus({ success: true, message: `"${file.name}" uploaded successfully!` });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setStatus({ success: false, message: `Upload failed (status: ${result.statusCode})` });
      }
    } catch (err) {
      setStatus({
        success: false,
        message: err instanceof UiPathError ? err.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-4">Upload File to Bucket</h2>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="bucketId" className="block text-sm font-medium text-gray-700 mb-1">
              Bucket ID
            </label>
            <input
              id="bucketId"
              type="number"
              required
              placeholder="e.g. 123"
              value={bucketId}
              onChange={(e) => setBucketId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="folderId" className="block text-sm font-medium text-gray-700 mb-1">
              Folder ID
            </label>
            <input
              id="folderId"
              type="number"
              required
              placeholder="e.g. 456"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
            File
          </label>
          <input
            id="file"
            ref={fileInputRef}
            type="file"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
          />
        </div>

        {status && (
          <div
            className={`text-sm p-3 rounded-md ${
              status.success ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
            }`}
          >
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
