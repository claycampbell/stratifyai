import React from 'react';
import { Shield } from 'lucide-react';
import DecisionHierarchyChart from './DecisionHierarchyChart';

interface PhilosophyAlignment {
  core_values: string[];
  cited_principles: string[];
  decision_hierarchy: {
    university: number;
    department: number;
    individual: number;
  };
}

interface PhilosophyAlignmentCardProps {
  alignment: PhilosophyAlignment;
  className?: string;
}

const VALUE_COLORS: Record<string, string> = {
  'Excellence': 'bg-blue-100 text-blue-800 border-blue-200',
  'Integrity': 'bg-green-100 text-green-800 border-green-200',
  'Accountability': 'bg-purple-100 text-purple-800 border-purple-200',
  'Respect': 'bg-orange-100 text-orange-800 border-orange-200',
  'Teamwork': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Innovation': 'bg-pink-100 text-pink-800 border-pink-200',
  'Service': 'bg-teal-100 text-teal-800 border-teal-200',
  'Diversity': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'default': 'bg-gray-100 text-gray-800 border-gray-200',
};

const getValueColor = (value: string): string => {
  return VALUE_COLORS[value] || VALUE_COLORS['default'];
};

export const PhilosophyAlignmentCard: React.FC<PhilosophyAlignmentCardProps> = ({
  alignment,
  className = '',
}) => {
  return (
    <div className={`mt-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-blue-900 text-lg">Philosophy Alignment</h4>
      </div>

      {/* Core Values Section */}
      {alignment.core_values && alignment.core_values.length > 0 && (
        <div className="mb-4">
          <span className="font-medium text-gray-700 text-sm block mb-2">Core Values Cited:</span>
          <div className="flex flex-wrap gap-2">
            {alignment.core_values.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getValueColor(value)}`}
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Decision Hierarchy Section */}
      {alignment.decision_hierarchy && (
        <div className="mb-4">
          <span className="font-medium text-gray-700 text-sm block mb-3">Decision Hierarchy Alignment:</span>
          <DecisionHierarchyChart hierarchy={alignment.decision_hierarchy} />
        </div>
      )}

      {/* Cited Principles Section */}
      {alignment.cited_principles && alignment.cited_principles.length > 0 && (
        <div>
          <span className="font-medium text-gray-700 text-sm block mb-2">Cited Principles:</span>
          <ul className="space-y-1.5">
            {alignment.cited_principles.map((principle, index) => (
              <li
                key={`${principle}-${index}`}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                <span className="flex-1">{principle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty State */}
      {(!alignment.core_values || alignment.core_values.length === 0) &&
       (!alignment.cited_principles || alignment.cited_principles.length === 0) &&
       !alignment.decision_hierarchy && (
        <p className="text-sm text-gray-500 italic">No philosophy alignment data available</p>
      )}
    </div>
  );
};

export default PhilosophyAlignmentCard;
