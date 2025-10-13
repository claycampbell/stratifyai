import { useState, useEffect } from 'react';
import { X, Bell, TrendingUp, Calendar, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KPIUpdateNotificationProps {
  checkInterval?: number; // in days, default 7 (weekly)
  onTrigger?: (callback: () => void) => void;
}

export default function KPIUpdateNotification({ checkInterval = 7, onTrigger }: KPIUpdateNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [kpiCount, setKpiCount] = useState(0);
  const [reminderInterval, setReminderInterval] = useState(checkInterval);

  useEffect(() => {
    // Load saved interval preference
    const savedInterval = localStorage.getItem('kpi_reminder_interval');
    if (savedInterval) {
      setReminderInterval(parseInt(savedInterval));
    }
    checkIfShouldShow();

    // Register manual trigger callback
    if (onTrigger) {
      onTrigger(() => {
        setKpiCount(Math.floor(Math.random() * 5) + 3);
        setShowNotification(true);
      });
    }
  }, [onTrigger]);

  const checkIfShouldShow = () => {
    const lastShownStr = localStorage.getItem('kpi_notification_last_shown');
    const dismissedStr = localStorage.getItem('kpi_notification_dismissed');
    const savedInterval = localStorage.getItem('kpi_reminder_interval');
    const intervalToUse = savedInterval ? parseInt(savedInterval) : checkInterval;
    const now = new Date();

    // Check if notification was dismissed in the last 24 hours
    if (dismissedStr) {
      const dismissed = new Date(dismissedStr);
      const hoursSinceDismissed = (now.getTime() - dismissed.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return; // Don't show if dismissed recently
      }
    }

    // Check if enough time has passed since last shown
    if (lastShownStr) {
      const lastShown = new Date(lastShownStr);
      const daysSinceLastShown = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastShown >= intervalToUse) {
        // Simulate fetching KPI count (in real app, this would be an API call)
        setKpiCount(Math.floor(Math.random() * 5) + 3); // Random 3-7 KPIs
        setShowNotification(true);
        localStorage.setItem('kpi_notification_last_shown', now.toISOString());
      }
    } else {
      // First time - show notification
      setKpiCount(Math.floor(Math.random() * 5) + 3);
      setShowNotification(true);
      localStorage.setItem('kpi_notification_last_shown', now.toISOString());
    }
  };

  const handleIntervalChange = (days: number) => {
    setReminderInterval(days);
    localStorage.setItem('kpi_reminder_interval', days.toString());
  };

  const handleDisableNotifications = () => {
    // Set a far future date to effectively disable
    localStorage.setItem('kpi_notification_dismissed', new Date('2099-12-31').toISOString());
    setShowNotification(false);
    setShowSettings(false);
  };

  const handleDismiss = () => {
    setShowNotification(false);
    localStorage.setItem('kpi_notification_dismissed', new Date().toISOString());
  };

  const handleGoToKPIs = () => {
    setShowNotification(false);
    // Navigation will be handled by Link component
  };

  if (!showNotification && !showSettings) {
    return null;
  }

  // Settings view
  if (showSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
          <div className="bg-primary-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-white" />
              <h3 className="text-white font-semibold text-lg">Notification Settings</h3>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="text-white hover:text-primary-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <h4 className="font-medium text-gray-900 mb-4">Reminder Frequency</h4>
            <div className="space-y-3">
              {[
                { label: 'Daily', days: 1 },
                { label: 'Every 3 days', days: 3 },
                { label: 'Weekly', days: 7 },
                { label: 'Bi-weekly', days: 14 },
                { label: 'Monthly', days: 30 },
              ].map((option) => (
                <label
                  key={option.days}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="interval"
                    value={option.days}
                    checked={reminderInterval === option.days}
                    onChange={() => handleIntervalChange(option.days)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleDisableNotifications}
                className="w-full px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Disable Notifications
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                You can re-enable by clearing your browser storage
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main notification view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full p-2">
              <Bell className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">KPI Update Reminder</h3>
              <p className="text-primary-100 text-sm">From: Chief Strategy Officer</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white hover:text-primary-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 mb-3">
              Hello! Hope you're having a great week. 👋
            </p>
            <p className="text-gray-700 mb-3">
              I wanted to check in on your progress. It's been a week since our last update,
              and I'd love to see how things are tracking.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 mb-1">
                    You have {kpiCount} KPI{kpiCount !== 1 ? 's' : ''} to review
                  </p>
                  <p className="text-sm text-blue-700">
                    Keeping our metrics up to date helps us stay aligned with our strategic goals.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              Could you take a few minutes to update your KPI values? It would really help
              the team understand where we stand.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Next reminder: {reminderInterval} days from now</span>
              </div>
              <button
                onClick={() => {
                  setShowNotification(false);
                  setShowSettings(true);
                }}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Settings className="h-3.5 w-3.5" />
                Adjust
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Remind me later
            </button>
            <Link
              to="/kpis"
              onClick={handleGoToKPIs}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-center"
            >
              Update KPIs
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            This is an automated reminder to help maintain strategic alignment
          </p>
        </div>
      </div>
    </div>
  );
}
