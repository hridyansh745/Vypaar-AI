import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RegisterLayout } from './pages/register/RegisterLayout';
import {
  BusinessStepPage,
  DocumentsStepPage,
  LocationStepPage,
  OwnerStepPage,
  ReviewStepPage,
} from './pages/register/StepPages';
import { ApplicationStatusPage } from './pages/ApplicationStatusPage';
import { ActivateAccountPage } from './pages/ActivateAccountPage';
import { DashboardPage } from './pages/DashboardPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { CompanySuppliersPage } from './pages/dashboard/CompanySuppliersPage';
import { SalesDemandPage } from './pages/dashboard/SalesDemandPage';
import { OffersPage } from './pages/dashboard/OffersPage';
import { OrdersPage } from './pages/dashboard/OrdersPage';
import { AssistantPage } from './pages/dashboard/AssistantPage';
import { SettingsPage, HelpPage } from './pages/dashboard/SettingsHelpPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/register" element={<RegisterLayout />}>
        <Route index element={<Navigate to="/register/owner" replace />} />
        <Route path="owner" element={<OwnerStepPage />} />
        <Route path="business" element={<BusinessStepPage />} />
        <Route path="documents" element={<DocumentsStepPage />} />
        <Route path="location" element={<LocationStepPage />} />
        <Route path="review" element={<ReviewStepPage />} />
      </Route>

      <Route path="/application-status/:id" element={<ApplicationStatusPage />} />
      <Route path="/activate-account" element={<ActivateAccountPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="company" element={<CompanySuppliersPage />} />
        <Route path="sales" element={<SalesDemandPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
