import React from 'react';
import { Building2, Users, User } from 'lucide-react';

interface DecisionHierarchy {
  university: number;
  department: number;
  individual: number;
}

interface DecisionHierarchyChartProps {
  hierarchy: DecisionHierarchy;
  showLabels?: boolean;
  className?: string;
}

const DecisionHierarchyChart: React.FC<DecisionHierarchyChartProps> = ({
  hierarchy,
  showLabels = true,
  className = '',
}) => {
  const levels = [
    {
      key: 'university',
      label: 'University',
      value: hierarchy.university,
      icon: Building2,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      textColor: 'text-green-700',
      description: 'Institutional level alignment',
    },
    {
      key: 'department',
      label: 'Department',
      value: hierarchy.department,
      icon: Users,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      description: 'Athletics department alignment',
    },
    {
      key: 'individual',
      label: 'Individual',
      value: hierarchy.individual,
      icon: User,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      description: 'Personal/team level alignment',
    },
  ];

  const getAlignmentQuality = (value: number): string => {
    if (value >= 80) return 'Excellent';
    if (value >= 60) return 'Good';
    if (value >= 40) return 'Fair';
    return 'Low';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {levels.map((level) => {
        const Icon = level.icon;
        const quality = getAlignmentQuality(level.value);

        return (
          <div key={level.key} className="space-y-1.5">
            {/* Label and Percentage */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${level.textColor}`} />
                {showLabels && (
                  <span className="text-sm font-medium text-gray-700">{level.label}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${level.textColor}`}>{quality}</span>
                <span className="text-sm font-bold text-gray-900">{level.value}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${level.color} transition-all duration-500 ease-out rounded-full`}
                style={{ width: `${level.value}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
              </div>
            </div>

            {/* Optional description on hover or for screen readers */}
            {showLabels && (
              <span className="text-xs text-gray-500 sr-only">{level.description}</span>
            )}
          </div>
        );
      })}

      {/* Overall Alignment Summary */}
      <div className="pt-2 mt-2 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall Alignment</span>
          <span className="text-sm font-bold text-gray-900">
            {Math.round((hierarchy.university + hierarchy.department + hierarchy.individual) / 3)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default DecisionHierarchyChart;
