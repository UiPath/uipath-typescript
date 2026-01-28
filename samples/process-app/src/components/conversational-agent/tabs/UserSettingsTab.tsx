/**
 * User Settings Tab - View and update user profile settings
 */

import { useUserSettings } from '../hooks';

export function UserSettingsTab() {
  const {
    userSettings,
    isLoading,
    userSettingsForm,
    loadUserSettings,
    updateUserSettings,
    updateFormField
  } = useUserSettings();

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4 p-4">
      <h3 className="font-semibold mb-4">User Settings</h3>

      <div className="flex gap-3 mb-4">
        <button
          onClick={loadUserSettings}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load Settings'}
        </button>
        <button
          onClick={updateUserSettings}
          disabled={isLoading || !userSettings}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Save Changes
        </button>
      </div>

      {userSettings && (
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded text-sm mb-4">
            <p><strong>User ID:</strong> {userSettings.userId}</p>
            <p><strong>Created:</strong> {new Date(userSettings.createdTime).toLocaleString()}</p>
            <p><strong>Updated:</strong> {new Date(userSettings.updatedTime).toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={userSettingsForm.name}
                onChange={(e) => updateFormField('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={userSettingsForm.email}
                onChange={(e) => updateFormField('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={userSettingsForm.role}
                onChange={(e) => updateFormField('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter role"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={userSettingsForm.department}
                onChange={(e) => updateFormField('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter department"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={userSettingsForm.company}
                onChange={(e) => updateFormField('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter company"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={userSettingsForm.country}
                onChange={(e) => updateFormField('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter country"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <input
                type="text"
                value={userSettingsForm.timezone}
                onChange={(e) => updateFormField('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="e.g., America/New_York, Europe/London"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Clear any field and save to remove it. These settings are passed to the agent for all conversations.
          </p>
        </div>
      )}

      {!userSettings && (
        <p className="text-gray-500 text-center py-8">
          Click "Load Settings" to view and edit your user profile.
        </p>
      )}
    </div>
  );
}
