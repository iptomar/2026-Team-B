import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { LanguageProvider } from './contexts/LanguageContext';
import './styles/global.css';

function App() {
	return (
		<LanguageProvider>
			<Router>
				<Routes>
					<Route path="/" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/template-builder" element={<FormBuilder />} />
					<Route path="/manage-users" element={<Users />} />
					<Route path="/settings" element={<Settings />} />
					<Route path="/forgot-password" element={<ForgotPassword />} />
					<Route path="/reset-password" element={<ChangePassword />} />
					<Route path="/fill-form/:templateId" element={<FillForm />} />
					<Route path="/my-submissions" element={<MySubmissions />} />
					<Route path="/submission/:submissionId" element={<SubmissionView />} />
					<Route path="/pending-reviews" element={<PendingReviews />} />
					<Route path="/report-bug" element={<BugReport />} />
					<Route path="/admin/bug-reports" element={<AdminBugReports />} />
					<Route path="/admin/bug-reports/:id" element={<AdminBugReportDetail />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Router>
		</LanguageProvider>
	);
}

export default App;
