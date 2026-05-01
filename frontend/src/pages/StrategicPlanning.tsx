import { useState, useEffect } from 'react';
import {
  risksApi, initiativesApi, scenariosApi,
  budgetsApi, resourcesApi, dependenciesApi,
} from '../lib/api';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';

type TabType = 'risks' | 'initiatives' | 'scenarios' | 'budgets' | 'resources' | 'dependencies';

const emptyForm = { name: '', title: '', description: '', category: '', likelihood: 'medium', impact: 'medium', status: 'active', priority: 'medium', owner_email: '', budget_name: '', budget_type: 'operational', allocated_amount: '', fiscal_year: '', resource_name: '', resource_type: 'human', department: '', scenario_type: 'custom', probability: '', source_type: '', target_type: '', dependency_type: 'depends_on', strength: 'medium', cost_per_hour: '', start_date: '', target_end_date: '' };

export default function StrategicPlanning() {
  const [activeTab, setActiveTab] = useState<TabType>('risks');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const tabs = [
    { id: 'risks' as TabType, label: 'Risk Register' },
    { id: 'initiatives' as TabType, label: 'Initiatives' },
    { id: 'scenarios' as TabType, label: 'Scenarios' },
    { id: 'budgets' as TabType, label: 'Budgets' },
    { id: 'resources' as TabType, label: 'Resources' },
    { id: 'dependencies' as TabType, label: 'Dependencies' },
  ];

  useEffect(() => { loadData(); }, [activeTab]);

  async function loadData() {
    setLoading(true); setError(null);
    try {
      let res, statsRes;
      switch (activeTab) {
        case 'risks':
          [res, statsRes] = await Promise.all([risksApi.getAll({ sort_by: 'risk_score', sort_order: 'desc' }), risksApi.getStats()]);
          setData(res.data); setStats(statsRes.data);
          break;
        case 'initiatives':
          [res, statsRes] = await Promise.all([initiativesApi.getAll({ sort_by: 'created_at', sort_order: 'desc' }), initiativesApi.getStats()]);
          setData(res.data); setStats(statsRes.data);
          break;
        case 'scenarios':
          res = await scenariosApi.getAll();
          setData(res.data); setStats(null);
          break;
        case 'budgets':
          [res, statsRes] = await Promise.all([budgetsApi.getAll({ sort_by: 'created_at', sort_order: 'desc' }), budgetsApi.getStats()]);
          setData(res.data); setStats(statsRes.data);
          break;
        case 'resources':
          [res, statsRes] = await Promise.all([resourcesApi.getAll({ sort_by: 'resource_name', sort_order: 'asc' }), resourcesApi.getStats()]);
          setData(res.data); setStats(statsRes.data);
          break;
        case 'dependencies':
          [res, statsRes] = await Promise.all([dependenciesApi.getAll(), dependenciesApi.getStats()]);
          setData(res.data); setStats(statsRes.data);
          break;
      }
    } catch (err: any) { setError(err.message || 'Failed to load data'); }
    finally { setLoading(false); }
  }

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setShowForm(true); }

  function openEdit(item: any) {
    setEditing(item);
    setForm({
      ...emptyForm,
      title: item.title || item.name || item.budget_name || item.resource_name || '',
      description: item.description || '',
      category: item.category || '',
      status: item.status || 'active',
      priority: item.priority || 'medium',
      owner_email: item.owner_email || '',
      likelihood: item.likelihood || 'medium',
      impact: item.impact || 'medium',
      budget_name: item.budget_name || '',
      budget_type: item.budget_type || 'operational',
      allocated_amount: item.allocated_amount?.toString() || '',
      fiscal_year: item.fiscal_year?.toString() || '',
      resource_name: item.resource_name || '',
      resource_type: item.resource_type || 'human',
      department: item.department || '',
      scenario_type: item.scenario_type || 'custom',
      probability: item.probability?.toString() || '',
      source_type: item.source_type || '',
      target_type: item.target_type || '',
      dependency_type: item.dependency_type || 'depends_on',
      strength: item.strength || 'medium',
      cost_per_hour: item.cost_per_hour?.toString() || '',
      start_date: item.start_date || '',
      target_end_date: item.target_end_date || '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      const payload: any = { ...form };
      if (payload.allocated_amount) payload.allocated_amount = parseFloat(payload.allocated_amount);
      if (payload.cost_per_hour) payload.cost_per_hour = parseFloat(payload.cost_per_hour);
      if (payload.fiscal_year) payload.fiscal_year = parseInt(payload.fiscal_year);
      if (payload.probability) payload.probability = parseFloat(payload.probability);
      if (!payload.title && payload.name) payload.title = payload.name;
      if (!payload.name && payload.title) payload.name = payload.title;
      if (!payload.budget_name && payload.title) payload.budget_name = payload.title;
      if (!payload.resource_name && payload.title) payload.resource_name = payload.title;

      const apiMap: Record<string, any> = {
        risks: { create: risksApi.create, update: risksApi.update },
        initiatives: { create: initiativesApi.create, update: initiativesApi.update },
        scenarios: { create: scenariosApi.create, update: scenariosApi.update },
        budgets: { create: budgetsApi.create, update: budgetsApi.update },
        resources: { create: resourcesApi.create, update: resourcesApi.update },
        dependencies: { create: dependenciesApi.create, update: dependenciesApi.update },
      };
      if (editing) await apiMap[activeTab].update(editing.id, payload);
      else await apiMap[activeTab].create(payload);
      setShowForm(false);
      loadData();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to save'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const deleteMap: Record<string, any> = {
        risks: risksApi.delete, initiatives: initiativesApi.delete,
        scenarios: scenariosApi.delete, budgets: budgetsApi.delete,
        resources: resourcesApi.delete, dependencies: dependenciesApi.delete,
      };
      await deleteMap[activeTab](id);
      loadData();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to delete'); }
  }

  const sc = (s: string) => `bg-${s === 'critical' || s === 'high' ? 'red' : s === 'medium' || s === 'at_risk' ? 'yellow' : s === 'low' || s === 'on_track' ? 'green' : 'blue'}-100 text-${s === 'critical' || s === 'high' ? 'red' : s === 'medium' || s === 'at_risk' ? 'yellow' : s === 'low' || s === 'on_track' ? 'green' : 'blue'}-800`;

  const label = tabs.find(t => t.id === activeTab)?.label || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Strategic Planning Tools</h1>
          <p className="text-gray-600 mt-1">Manage risks, initiatives, scenarios, budgets, resources, and dependencies</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" /> Add {label}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>}

      {/* Stats Cards */}
      {stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats.summary || stats).slice(0, 4).map(([k, v]: any) => (
          <div key={k} className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500 capitalize">{k.replace(/_/g, ' ')}</div>
            <div className="text-2xl font-bold mt-1">{typeof v === 'number' ? v.toLocaleString() : v}</div>
          </div>
        ))}
      </div>}

      {/* Data Table */}
      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {activeTab === 'risks' && <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th></>}
                {activeTab === 'initiatives' && <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></>}
                {activeTab === 'scenarios' && <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probability</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></>}
                {activeTab === 'budgets' && <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spent</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></>}
                {activeTab === 'resources' && <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dept</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocation</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></>}
                {activeTab === 'dependencies' && <><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strength</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></>}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {activeTab === 'risks' && <><td className="px-6 py-4"><div className="text-sm font-medium">{item.title}</div></td><td className="px-6 py-4 text-sm">{item.category || '-'}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded ${sc(item.risk_score >= 16 ? 'critical' : item.risk_score >= 9 ? 'high' : item.risk_score >= 4 ? 'medium' : 'low')}`}>{item.risk_score}</span></td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded ${sc(item.status)}`}>{item.status}</span></td><td className="px-6 py-4 text-sm text-gray-500">{item.owner_email || '-'}</td></>}
                  {activeTab === 'initiatives' && <><td className="px-6 py-4"><div className="text-sm font-medium">{item.title}</div>{item.description && <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded capitalize ${sc(item.priority)}`}>{item.priority}</span></td><td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-24 bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(parseFloat(item.completion_percentage || '0'), 100)}%` }} /></div><span className="text-xs">{parseFloat(item.completion_percentage || '0').toFixed(0)}%</span></div></td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded ${sc(item.status)}`}>{item.status}</span></td></>}
                  {activeTab === 'scenarios' && <><td className="px-6 py-4"><div className="text-sm font-medium">{item.name}</div></td><td className="px-6 py-4 text-sm capitalize">{item.scenario_type?.replace('_', ' ')}</td><td className="px-6 py-4 text-sm">{item.probability ? `${(item.probability * 100).toFixed(0)}%` : '-'}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded ${sc(item.status)}`}>{item.status}</span></td></>}
                  {activeTab === 'budgets' && <><td className="px-6 py-4"><div className="text-sm font-medium">{item.budget_name}</div></td><td className="px-6 py-4 text-sm capitalize">{item.budget_type}</td><td className="px-6 py-4 text-sm font-medium">${parseFloat(item.allocated_amount || '0').toLocaleString()}</td><td className="px-6 py-4 text-sm">${parseFloat(item.spent_amount || '0').toLocaleString()}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded ${sc(item.status)}`}>{item.status}</span></td></>}
                  {activeTab === 'resources' && <><td className="px-6 py-4"><div className="text-sm font-medium">{item.resource_name}</div></td><td className="px-6 py-4 text-sm capitalize">{item.resource_type}</td><td className="px-6 py-4 text-sm">{item.department || '-'}</td><td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-16 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${(item.total_allocation_percentage || 0) >= 100 ? 'bg-red-600' : 'bg-green-600'}`} style={{ width: `${Math.min(item.total_allocation_percentage || 0, 100)}%` }} /></div><span className="text-xs">{parseFloat(item.total_allocation_percentage || '0').toFixed(0)}%</span></div></td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded ${sc(item.availability_status)}`}>{item.availability_status?.replace('_', ' ')}</span></td></>}
                  {activeTab === 'dependencies' && <><td className="px-6 py-4"><div className="text-sm font-medium capitalize">{item.source_type}</div></td><td className="px-6 py-4"><div className="text-sm font-medium capitalize">{item.target_type}</div></td><td className="px-6 py-4 text-sm capitalize">{item.dependency_type?.replace('_', ' ')}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded ${sc(item.strength)}`}>{item.strength || 'medium'}</span></td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded ${sc(item.status)}`}>{item.status}</span></td></>}
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors ml-1" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <div className="text-center py-12 text-gray-500">No {label.toLowerCase()} found. Click "Add {label}" to create one.</div>}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Edit' : 'New'} {label}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {activeTab !== 'budgets' && activeTab !== 'resources' && activeTab !== 'scenarios' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input w-full" required />
                </div>
              )}
              {activeTab === 'budgets' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name</label>
                  <input value={form.budget_name} onChange={e => setForm({...form, budget_name: e.target.value})} className="input w-full" required />
                </div>
              )}
              {activeTab === 'resources' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource Name</label>
                  <input value={form.resource_name} onChange={e => setForm({...form, resource_name: e.target.value})} className="input w-full" required />
                </div>
              )}
              {activeTab === 'scenarios' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input w-full" required />
                </div>
              )}
              {activeTab !== 'dependencies' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input w-full" rows={3} />
                </div>
              )}
              {activeTab === 'risks' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input w-full" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Likelihood</label><select value={form.likelihood} onChange={e => setForm({...form, likelihood: e.target.value})} className="input w-full">{['very_low','low','medium','high','very_high'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Impact</label><select value={form.impact} onChange={e => setForm({...form, impact: e.target.value})} className="input w-full">{['very_low','low','medium','high','very_high'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label><input type="email" value={form.owner_email} onChange={e => setForm({...form, owner_email: e.target.value})} className="input w-full" /></div>
                </div>
              )}
              {activeTab === 'initiatives' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="input w-full">{['low','medium','high','critical'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input w-full">{['planning','in_progress','completed','on_hold'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}</select></div>
                </div>
              )}
              {activeTab === 'budgets' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.budget_type} onChange={e => setForm({...form, budget_type: e.target.value})} className="input w-full">{['operational','capital','discretionary','project'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount</label><input type="number" value={form.allocated_amount} onChange={e => setForm({...form, allocated_amount: e.target.value})} className="input w-full" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year</label><input type="number" value={form.fiscal_year} onChange={e => setForm({...form, fiscal_year: e.target.value})} className="input w-full" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label><input type="email" value={form.owner_email} onChange={e => setForm({...form, owner_email: e.target.value})} className="input w-full" /></div>
                </div>
              )}
              {activeTab === 'resources' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.resource_type} onChange={e => setForm({...form, resource_type: e.target.value})} className="input w-full">{['human','facility','equipment','software','budget'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="input w-full" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Cost/Hour</label><input type="number" value={form.cost_per_hour} onChange={e => setForm({...form, cost_per_hour: e.target.value})} className="input w-full" /></div>
                </div>
              )}
              {activeTab === 'scenarios' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.scenario_type} onChange={e => setForm({...form, scenario_type: e.target.value})} className="input w-full">{['best_case','worst_case','most_likely','custom'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Probability</label><input type="number" step="0.01" min="0" max="1" value={form.probability} onChange={e => setForm({...form, probability: e.target.value})} className="input w-full" /></div>
                </div>
              )}
              {activeTab === 'dependencies' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label><select value={form.source_type} onChange={e => setForm({...form, source_type: e.target.value})} className="input w-full">{['initiative','risk','kpi','ogsm_component','budget','resource'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label><select value={form.target_type} onChange={e => setForm({...form, target_type: e.target.value})} className="input w-full">{['initiative','risk','kpi','ogsm_component','budget','resource'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.dependency_type} onChange={e => setForm({...form, dependency_type: e.target.value})} className="input w-full">{['depends_on','blocks','related_to','triggers'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Strength</label><select value={form.strength} onChange={e => setForm({...form, strength: e.target.value})} className="input w-full">{['weak','medium','strong','critical'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                </div>
              )}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input w-full">
                  {activeTab === 'risks' && ['identified','assessing','mitigating','monitoring','closed'].map(o => <option key={o} value={o}>{o}</option>)}
                  {activeTab === 'initiatives' && ['planning','in_progress','completed','on_hold'].map(o => <option key={o} value={o}>{o}</option>)}
                  {activeTab === 'scenarios' && ['draft','active','archived'].map(o => <option key={o} value={o}>{o}</option>)}
                  {activeTab === 'budgets' && ['active','pending','closed'].map(o => <option key={o} value={o}>{o}</option>)}
                  {activeTab === 'resources' && ['available','partially_allocated','fully_allocated','unavailable'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                  {activeTab === 'dependencies' && ['active','resolved','broken'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
