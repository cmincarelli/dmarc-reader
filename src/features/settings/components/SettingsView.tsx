/**
 * Settings View Component
 *
 * Application settings and configuration.
 */

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Palette, Info, Save } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

// ============================================================================
// Component
// ============================================================================

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [autoImport, setAutoImport] = useState(false);
  const [autoImportFolder, setAutoImportFolder] = useState<string>('');
  const [autoImportAction, setAutoImportAction] = useState<'keep' | 'delete' | 'archive'>('archive');
  const [notifications, setNotifications] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dbStats, setDbStats] = useState<{ size: string; location: string }>({
    size: '0 MB',
    location: '~/Library/Application Support/dmarc-reader/',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        // Theme is handled by useTheme hook
        setAutoImport(settings.autoImport || false);
        setAutoImportFolder(settings.autoImportFolder || '');
        setAutoImportAction(settings.autoImportAction || 'archive');
        setNotifications(settings.notifications !== undefined ? settings.notifications : true);

        const stats = await window.electronAPI.getDatabaseStats();
        setDbStats({
          size: stats.sizeFormatted,
          location: stats.location,
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSelectFolder = async () => {
    try {
      const result = await window.electronAPI.selectFolder();
      if (!result.canceled && result.path) {
        setAutoImportFolder(result.path);
        // Auto-save the folder selection
        await window.electronAPI.updateSettings({
          autoImportFolder: result.path,
        });
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // Theme is auto-saved by useTheme hook, only save other settings
      const result = await window.electronAPI.updateSettings({
        autoImport,
        autoImportFolder,
        autoImportAction,
        notifications,
      });

      if (result.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        console.error('Failed to save settings:', result.error);
        setSaveStatus('idle');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('idle');
    }
  };

  const handleClearData = async () => {
    if (
      !confirm(
        'Are you sure you want to delete all imported reports and analysis data? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const result = await window.electronAPI.clearAllData();
      if (result.success) {
        alert('All data cleared successfully');
        // Refresh database stats
        const stats = await window.electronAPI.getDatabaseStats();
        setDbStats({
          size: stats.sizeFormatted,
          location: stats.location,
        });
      } else {
        alert(`Failed to clear data: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Manage your application preferences and configuration</p>
      </div>

      <div className="space-y-6">
        {/* Appearance Settings */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div className="flex gap-3">
                {(['light', 'dark', 'system'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setTheme(option)}
                    className={`
                      px-4 py-2 rounded-lg border-2 transition-all
                      ${
                        theme === option
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Choose how DMARC Reader looks. System matches your OS preference.
              </p>
            </div>
          </div>
        </div>

        {/* Data & Storage */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Data & Storage</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Database Location</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-all">{dbStats.location}</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Database Size</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Currently using {dbStats.size}</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Clear Data</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Remove all imported reports and analysis data
                </p>
              </div>
              <button
                onClick={handleClearData}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Import Settings */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Import Settings</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Auto-import from folder</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically import reports from a watched folder
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoImport}
                  onChange={(e) => setAutoImport(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">Folder location</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {autoImportFolder ? (
                    <span className="break-all">{autoImportFolder}</span>
                  ) : (
                    'No folder selected'
                  )}
                </p>
              </div>
              <button
                onClick={handleSelectFolder}
                className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                Choose Folder
              </button>
            </div>

            <div className="py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="mb-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">After import</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  What to do with files after successful import
                </p>
              </div>
              <div className="flex gap-3">
                {[
                  { value: 'archive', label: 'Archive', description: 'Move to "imported" subfolder' },
                  { value: 'delete', label: 'Delete', description: 'Permanently delete files' },
                  { value: 'keep', label: 'Keep', description: 'Leave files in place' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAutoImportAction(option.value as 'keep' | 'delete' | 'archive')}
                    className={`
                      flex-1 px-4 py-3 rounded-lg border-2 transition-all text-left
                      ${
                        autoImportAction === option.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }
                    `}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Show notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Get notified when imports complete or issues are detected
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">About</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">Version</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">0.1.0</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">Electron</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">28.1.3</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">License</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">MIT</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              Check for updates
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all
              ${
                saveStatus === 'saved'
                  ? 'bg-green-600 dark:bg-green-700 text-white'
                  : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Save className="w-5 h-5" />
            {saveStatus === 'saving'
              ? 'Saving...'
              : saveStatus === 'saved'
                ? 'Saved!'
                : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
