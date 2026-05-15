import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import FormBuilder from './components/FormBuilder';
import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import FillForm from './pages/FillForm';
import MySubmissions from './pages/MySubmissions';
import SubmissionView from './pages/SubmissionView';
import PendingReviews from './pages/PendingReviews';
import BugReport from './pages/BugReport';
import AdminBugReports from './pages/AdminBugReports';
import AdminBugReportDetail from './pages/AdminBugReportDetail';
import AdminFormManagement from './pages/AdminFormManagement';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/global.css';

function App() {
	return (
		<ThemeProvider>
			<LanguageProvider>
				<Router>
					<Routes>
						<Route path="/" element={<Login />} />
						<Route path="/register" element={<Register />} />
						<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
						<Route path="/template-builder" element={<ProtectedRoute requireAdmin={true}><FormBuilder /></ProtectedRoute>} />
						<Route path="/manage-users" element={<ProtectedRoute requireAdmin={true}><Users /></ProtectedRoute>} />
						<Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
						<Route path="/forgot-password" element={<ForgotPassword />} />
						<Route path="/reset-password" element={<ChangePassword />} />
						<Route path="/fill-form/:templateId" element={<ProtectedRoute><FillForm /></ProtectedRoute>} />
						<Route path="/my-submissions" element={<ProtectedRoute><MySubmissions /></ProtectedRoute>} />
						<Route path="/submission/:submissionId" element={<ProtectedRoute><SubmissionView /></ProtectedRoute>} />
						<Route path="/pending-reviews" element={<ProtectedRoute><PendingReviews /></ProtectedRoute>} />
						<Route path="/report-bug" element={<ProtectedRoute><BugReport /></ProtectedRoute>} />
						<Route path="/admin/bug-reports" element={<ProtectedRoute requireAdmin={true}><AdminBugReports /></ProtectedRoute>} />
						<Route path="/admin/bug-reports/:id" element={<ProtectedRoute requireAdmin={true}><AdminBugReportDetail /></ProtectedRoute>} />
						<Route path="/admin/form-management" element={<ProtectedRoute requireAdmin={true}><AdminFormManagement /></ProtectedRoute>} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</Router>
			</LanguageProvider>
		</ThemeProvider>
	);
}

export default App;
