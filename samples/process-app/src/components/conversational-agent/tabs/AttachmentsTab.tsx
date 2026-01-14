/**
 * Attachments Tab - File upload and attachment testing
 */

import { useRef } from 'react';
import { useAttachments } from '../hooks';

export function AttachmentsTab() {
  const {
    selectedFile,
    uploadedAttachments,
    isUploading,
    selectFile,
    uploadAttachment,
    initializeFile
  } = useAttachments();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    selectFile(file || null);
  };

  const handleUpload = async () => {
    await uploadAttachment();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4 p-4">
      <h3 className="font-semibold mb-4">File Attachments</h3>

      <div className="flex gap-3 mb-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="flex-1 text-sm"
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {selectedFile && (
        <p className="text-sm text-gray-600 mb-4">
          Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
        </p>
      )}

      {uploadedAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploaded Files:</h4>
          {uploadedAttachments.map((att, idx) => (
            <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
              <p><strong>Name:</strong> {att.name}</p>
              <p><strong>URI:</strong> {att.uri}</p>
              <p><strong>MIME:</strong> {att.mimeType}</p>
            </div>
          ))}
        </div>
      )}

      {uploadedAttachments.length === 0 && !selectedFile && (
        <p className="text-gray-500 text-center py-8">
          No files uploaded. Select a file and click Upload.
        </p>
      )}

      {/* Initialize File Test */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-medium mb-2 text-sm text-gray-600">API Test: Initialize File</h4>
        <button
          onClick={() => initializeFile('test-document.pdf')}
          className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
        >
          Test Initialize File
        </button>
        <p className="text-xs text-gray-500 mt-1">
          Tests attachments.initialize() - returns upload URL without uploading
        </p>
      </div>
    </div>
  );
}
