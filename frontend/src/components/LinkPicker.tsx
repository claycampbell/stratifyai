import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Link as LinkIcon, TrendingUp, Target, Layers } from 'lucide-react';
import { kpisApi, ogsmApi, initiativesApi } from '@/lib/api';

type LinkType = 'kpi' | 'strategy' | 'initiative' | 'objective' | 'goal' | 'measure';

interface LinkableEntity {
  id: string;
  type: LinkType;
  title: string;
  description?: string;
  status?: string;
  metric_value?: number;
  target_value?: number;
}

interface LinkPickerProps {
  onSelect: (entity: LinkableEntity) => void;
  onClose: () => void;
  excludeIds?: string[];
  allowedTypes?: LinkType[];
}

export default function LinkPicker({ onSelect, onClose, excludeIds = [], allowedTypes }: LinkPickerProps) {
  const [selectedTab, setSelectedTab] = useState<LinkType>('kpi');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch KPIs
  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpisApi.getAll().then((res) => res.data),
    enabled: !allowedTypes || allowedTypes.includes('kpi'),
  });

  // Fetch OGSM components
  const { data: ogsmComponents } = useQuery({
    queryKey: ['ogsm-components'],
    queryFn: () => ogsmApi.getAll().then((res) => res.data),
    enabled: !allowedTypes || allowedTypes.some(t => ['strategy', 'objective', 'goal', 'measure'].includes(t)),
  });

  // Fetch initiatives
  const { data: initiatives } = useQuery({
    queryKey: ['initiatives'],
    queryFn: () => initiativesApi.getAll().then((res) => res.data),
    enabled: !allowedTypes || allowedTypes.includes('initiative'),
  });

  // Transform data into linkable entities
  const entities: LinkableEntity[] = [];

  // Add KPIs
  if (kpis && (!allowedTypes || allowedTypes.includes('kpi'))) {
    kpis.forEach((kpi: any) => {
      entities.push({
        id: kpi.id,
        type: 'kpi',
        title: kpi.name,
        description: kpi.description,
        status: kpi.status,
        metric_value: kpi.current_value,
        target_value: kpi.target_value,
      });
    });
  }

  // Add OGSM components
  if (ogsmComponents) {
    ogsmComponents.forEach((comp: any) => {
      if (!allowedTypes || allowedTypes.includes(comp.component_type as LinkType)) {
        entities.push({
          id: comp.id,
          type: comp.component_type as LinkType,
          title: comp.title,
          description: comp.description,
          status: comp.status,
        });
      }
    });
  }

  // Add initiatives
  if (initiatives && (!allowedTypes || allowedTypes.includes('initiative'))) {
    initiatives.forEach((init: any) => {
      entities.push({
        id: init.id,
        type: 'initiative',
        title: init.title,
        description: init.description,
        status: init.status,
      });
    });
  }

  // Filter by search query and selected tab
  const filteredEntities = entities.filter((entity) => {
    const matchesTab = entity.type === selectedTab;
    const matchesSearch = !searchQuery ||
      entity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const notExcluded = !excludeIds.includes(entity.id);
    return matchesTab && matchesSearch && notExcluded;
  });

  // Available tabs based on allowedTypes
  const allTabs: Array<{ key: LinkType; label: string; icon: any }> = [
    { key: 'kpi' as LinkType, label: 'KPIs', icon: TrendingUp },
    { key: 'strategy' as LinkType, label: 'Strategies', icon: Target },
    { key: 'objective' as LinkType, label: 'Objectives', icon: Target },
    { key: 'goal' as LinkType, label: 'Goals', icon: Target },
    { key: 'measure' as LinkType, label: 'Measures', icon: TrendingUp },
    { key: 'initiative' as LinkType, label: 'Initiatives', icon: Layers },
  ];
  const availableTabs = allTabs.filter(tab => !allowedTypes || allowedTypes.includes(tab.key));

  // Set initial tab to first available
  useEffect(() => {
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(selectedTab)) {
      setSelectedTab(allowedTypes[0]);
    }
  }, [allowedTypes, selectedTab]);

  const getTypeIcon = (type: LinkType) => {
    switch (type) {
      case 'kpi':
      case 'measure':
        return <TrendingUp className="h-4 w-4" />;
      case 'strategy':
      case 'objective':
      case 'goal':
        return <Target className="h-4 w-4" />;
      case 'initiative':
        return <Layers className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: LinkType) => {
    switch (type) {
      case 'kpi':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'strategy':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'objective':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'goal':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'measure':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'initiative':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold">Link Strategic Entity</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6 space-x-4 overflow-x-auto">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    selectedTab === tab.key
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  <span className="text-xs text-gray-400">
                    ({entities.filter(e => e.type === tab.key && !excludeIds.includes(e.id)).length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Entity List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredEntities.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchQuery ? 'No matching items found' : `No ${selectedTab}s available`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntities.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => onSelect(entity)}
                  className="w-full text-left border rounded-lg p-4 hover:bg-gray-50 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getTypeColor(entity.type)}`}>
                          {getTypeIcon(entity.type)}
                          {entity.type}
                        </span>
                        {entity.status && (
                          <span className="text-xs text-gray-500 capitalize">
                            {entity.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{entity.title}</h3>
                      {entity.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{entity.description}</p>
                      )}
                      {entity.type === 'kpi' && entity.metric_value !== undefined && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                          <span>Current: {entity.metric_value}</span>
                          <span>→</span>
                          <span>Target: {entity.target_value}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-primary-600">
                      <LinkIcon className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
