import { useState } from 'react';
import { usePreferences, usePreference } from '../contexts/UserPreferencesContext';

export default function UserPreferencesDebug() {
  const { preferences, loading, updatePreference, resetPreferences } = usePreferences();
  const [kpiDashboardView, setKpiDashboardView] = usePreference('kpi_dashboard_view');
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm"
      >
        Show Preferences Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-6 max-w-md z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">User Preferences Debug</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading preferences...</p>
      ) : (
        <div className="space-y-4">
          {/* KPI Dashboard View Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              KPI Dashboard View
            </label>
            <div className="flex gap-2">
              {(['boxes', 'list', 'compact'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setKpiDashboardView(view)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    kpiDashboardView === view
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: {kpiDashboardView || 'boxes'}
            </p>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updatePreference('theme', theme)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    preferences.theme === theme
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: {preferences.theme || 'light'}
            </p>
          </div>

          {/* Items Per Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items Per Page
            </label>
            <select
              value={preferences.items_per_page || 20}
              onChange={(e) => updatePreference('items_per_page', parseInt(e.target.value))}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* All Preferences JSON */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              All Preferences (JSON)
            </label>
            <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-200 overflow-auto max-h-40">
              {JSON.stringify(preferences, null, 2)}
            </pre>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => resetPreferences()}
            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}
