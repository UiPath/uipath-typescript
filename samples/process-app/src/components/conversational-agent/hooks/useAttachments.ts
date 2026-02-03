/**
 * useAttachments - Hook for attachment operations
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function useAttachments() {
  const { attachmentService, conversation: convState, attachment, ui } = useConversationalAgentContext();
  const { conversation } = convState;
  const { selectedFile, uploadedAttachments, isUploading, setSelectedFile, setUploadedAttachments, setIsUploading } = attachment;
  const { setError, setSuccessMessage } = ui;

  const selectFile = (file: File | null) => {
    setSelectedFile(file);
  };

  const uploadAttachment = async () => {
    if (!attachmentService || !conversation || !selectedFile) return;
    setIsUploading(true);
    setError('');

    try {
      const response = await attachmentService.upload(
        conversation.id,
        selectedFile
      );

      console.log('[Attachment API] upload response:', response);

      setUploadedAttachments(prev => [...prev, {
        ...response,
        fileName: selectedFile.name,
        fileSize: selectedFile.size
      }]);

      setSelectedFile(null);
      setSuccessMessage(`File "${selectedFile.name}" uploaded successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload file: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const initializeFile = async (fileName: string) => {
    if (!attachmentService || !conversation) return;
    setError('');

    try {
      const response = await attachmentService.create(
        conversation.id,
        fileName
      );

      console.log('[Attachment API] initialize response:', response);
      console.log('File upload URL:', response.fileUploadAccess.url);
      console.log('File upload method:', response.fileUploadAccess.verb);
      console.log('File URI:', response.uri);

      setSuccessMessage(`File "${fileName}" initialized - check console for upload details`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to initialize file: ${message}`);
    }
  };

  return {
    selectedFile,
    uploadedAttachments,
    isUploading,
    selectFile,
    uploadAttachment,
    initializeFile
  };
}
