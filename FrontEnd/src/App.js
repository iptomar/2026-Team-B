import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FormBuilder from './components/FormBuilder';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import './styles/global.css';

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Login />} />
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/template-builder" element={<FormBuilder />} />
				<Route path="/manage-users" element={<Users />} />
				{/* Note: want to redirect to profile/dashboard page in the future */}
				<Route path="/change-password" element={<ChangePassword />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</Router>
	);
}

export default App;
