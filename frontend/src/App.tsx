import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import OGSMView from './pages/OGSMView';
import KPIs from './pages/KPIs';
import Reports from './pages/Reports';
import StrategicPlanning from './pages/StrategicPlanning';
import AIStrategyPage from './pages/AIStrategyPage';
import AdminDashboard from './pages/AdminDashboard';
import StaffPlans from './pages/StaffPlans';
import StaffPlanDetail from './pages/StaffPlanDetail';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserPreferencesProvider>
          <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="documents" element={<Documents />} />
              <Route path="ogsm" element={<OGSMView />} />
              <Route path="kpis" element={<KPIs />} />
              <Route path="ai-strategy" element={<AIStrategyPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="strategic-planning" element={<StrategicPlanning />} />
              <Route path="staff-plans" element={<StaffPlans />} />
              <Route path="staff-plans/:id" element={<StaffPlanDetail />} />
              <Route
                path="admin"
                element={
                  <ProtectedRoute requiredPermissions={['*', 'manage_users']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
          </Router>
        </UserPreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
