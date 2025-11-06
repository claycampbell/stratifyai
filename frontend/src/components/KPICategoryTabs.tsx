import { useQuery } from '@tanstack/react-query';
import { kpiCategoriesApi } from '@/lib/api';
import { KPICategory } from '@/types';
import { Folder } from 'lucide-react';

interface KPICategoryTabsProps {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  kpis: any[];
}

export default function KPICategoryTabs({
  selectedCategoryId,
  onSelectCategory,
  kpis,
}: KPICategoryTabsProps) {
  const { data: categories } = useQuery<KPICategory[]>({
    queryKey: ['kpi-categories'],
    queryFn: () => kpiCategoriesApi.getAll().then((res) => res.data),
  });

  if (!categories || categories.length === 0) {
    return null;
  }

  // Count KPIs per category
  const getCategoryKPICount = (categoryId: string) => {
    return kpis.filter((kpi) => kpi.category_id === categoryId).length;
  };

  // Count uncategorized KPIs
  const uncategorizedCount = kpis.filter((kpi) => !kpi.category_id).length;

  // Total KPIs count
  const totalCount = kpis.length;

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <nav className="flex space-x-1 px-4" aria-label="Category tabs">
          {/* All KPIs Tab */}
          <button
            onClick={() => onSelectCategory(null)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${
                selectedCategoryId === null
                  ? 'border-primary-600 text-primary-700 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Folder className="h-4 w-4" />
            <span>All KPIs</span>
            <span
              className={`
                ml-1 rounded-full px-2 py-0.5 text-xs font-medium
                ${
                  selectedCategoryId === null
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              {totalCount}
            </span>
          </button>

          {/* Category Tabs */}
          {categories.map((category) => {
            const count = getCategoryKPICount(category.id);
            const isSelected = selectedCategoryId === category.id;

            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${
                    isSelected
                      ? `border-[${category.color}] text-gray-900`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                style={{
                  borderBottomColor: isSelected ? category.color || '#3B82F6' : 'transparent',
                  backgroundColor: isSelected
                    ? `${category.color}15` || '#3B82F615'
                    : 'transparent',
                }}
              >
                {/* Category Icon (if available) */}
                {category.icon && (
                  <span className="h-4 w-4" style={{ color: category.color || '#6B7280' }}>
                    {/* Dynamically render icon - in production would use proper icon library */}
                    <Folder className="h-4 w-4" />
                  </span>
                )}

                <span>{category.name}</span>

                {/* KPI Count Badge */}
                <span
                  className={`
                    ml-1 rounded-full px-2 py-0.5 text-xs font-medium
                  `}
                  style={{
                    backgroundColor: isSelected
                      ? `${category.color}30` || '#3B82F630'
                      : '#F3F4F6',
                    color: isSelected ? category.color || '#1F2937' : '#4B5563',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Show uncategorized count if any exist */}
      {uncategorizedCount > 0 && selectedCategoryId === null && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100">
          <p className="text-xs text-yellow-800">
            <span className="font-medium">{uncategorizedCount}</span> KPI{uncategorizedCount !== 1 ? 's' : ''} without a category
          </p>
        </div>
      )}
    </div>
  );
}
