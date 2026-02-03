/**
 * useUserSettings - Hook for user settings operations
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function useUserSettings() {
  const { userService, userSettings: usState, ui } = useConversationalAgentContext();
  const { userSettings, isLoading, userSettingsForm, setUserSettings, setIsLoading, setUserSettingsForm } = usState;
  const { setError, setSuccessMessage } = ui;

  const loadUserSettings = async () => {
    if (!userService) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await userService.getSettings();
      console.log('[User API] getSettings response:', response);

      setUserSettings(response);
      setUserSettingsForm({
        name: response.name || '',
        email: response.email || '',
        role: response.role || '',
        department: response.department || '',
        company: response.company || '',
        country: response.country || '',
        timezone: response.timezone || ''
      });
      setSuccessMessage('User settings loaded');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load user settings: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserSettings = async () => {
    if (!userService) return;
    setIsLoading(true);
    setError('');

    try {
      const updateInput: Record<string, string | null> = {};

      const fields = ['name', 'email', 'role', 'department', 'company', 'country', 'timezone'] as const;
      for (const field of fields) {
        const formValue = userSettingsForm[field];
        const currentValue = userSettings?.[field] || '';

        if (formValue !== currentValue) {
          updateInput[field] = formValue || null;
        }
      }

      if (Object.keys(updateInput).length === 0) {
        setSuccessMessage('No changes to save');
        setIsLoading(false);
        return;
      }

      const response = await userService.updateSettings(updateInput);
      console.log('[User API] updateSettings response:', response);

      setUserSettings(response);
      setSuccessMessage('User settings updated successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update user settings: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormField = (field: keyof typeof userSettingsForm, value: string) => {
    setUserSettingsForm(prev => ({ ...prev, [field]: value }));
  };

  return {
    userSettings,
    isLoading,
    userSettingsForm,
    loadUserSettings,
    updateUserSettings,
    updateFormField
  };
}
