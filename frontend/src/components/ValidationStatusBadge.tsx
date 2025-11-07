import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export type ValidationStatus = 'approved' | 'flagged' | 'rejected';

interface ValidationStatusBadgeProps {
  status: ValidationStatus;
  violations?: string[];
  conflictResolution?: string;
  className?: string;
}

export const ValidationStatusBadge: React.FC<ValidationStatusBadgeProps> = ({
  status,
  violations = [],
  conflictResolution,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle,
          label: 'Approved',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          description: 'This recommendation aligns with RMU Athletics philosophy and non-negotiables.',
        };
      case 'flagged':
        return {
          icon: AlertTriangle,
          label: 'Flagged for Review',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300',
          textColor: 'text-yellow-900',
          iconColor: 'text-yellow-600',
          description: 'This recommendation has been flagged for potential conflicts with non-negotiables.',
        };
      case 'rejected':
        return {
          icon: XCircle,
          label: 'Rejected',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
          textColor: 'text-red-900',
          iconColor: 'text-red-600',
          description: 'This recommendation violates one or more non-negotiable constraints.',
        };
      default:
        return {
          icon: AlertTriangle,
          label: 'Unknown',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-900',
          iconColor: 'text-gray-600',
          description: 'Validation status unknown.',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`mt-3 p-4 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      {/* Status Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
        <span className={`font-semibold ${config.textColor}`}>{config.label}</span>
      </div>

      {/* Description */}
      <p className={`text-sm ${config.textColor} mb-2`}>{config.description}</p>

      {/* Violations */}
      {violations && violations.length > 0 && (
        <div className="mt-3">
          <span className={`text-sm font-medium ${config.textColor} block mb-1`}>
            Violated Constraints:
          </span>
          <ul className="space-y-1">
            {violations.map((violation, index) => (
              <li
                key={`violation-${index}`}
                className={`text-sm ${config.textColor} flex items-start gap-2`}
              >
                <span className="inline-block w-1 h-1 rounded-full bg-current mt-1.5 flex-shrink-0"></span>
                <span className="flex-1">{violation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conflict Resolution */}
      {conflictResolution && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <span className={`text-sm font-medium ${config.textColor} block mb-1`}>
            Recommended Resolution:
          </span>
          <p className={`text-sm ${config.textColor}`}>{conflictResolution}</p>
        </div>
      )}
    </div>
  );
};

export default ValidationStatusBadge;
