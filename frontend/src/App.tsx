import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import OGSMView from './pages/OGSMView';
import KPIs from './pages/KPIs';
import Reports from './pages/Reports';
import StrategicPlanning from './pages/StrategicPlanning';
import AIStrategyPage from './pages/AIStrategyPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<Documents />} />
          <Route path="ogsm" element={<OGSMView />} />
          <Route path="kpis" element={<KPIs />} />
          <Route path="ai-strategy" element={<AIStrategyPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="strategic-planning" element={<StrategicPlanning />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
