import React from 'react';
import { Navigate } from 'react-router-dom';
import { getStorageItem } from '../utils/storage';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
	const token = getStorageItem('accessToken');
	const userStr = getStorageItem('user');

	if (!token || !userStr) {
		return <Navigate to="/" replace />;
	}

	let user;
	try {
		user = JSON.parse(userStr);
	} catch (e) {
		return <Navigate to="/" replace />;
	}

	const isAdmin = user?.roles?.some(r => r.name?.toLowerCase() === 'admin');

	if (requireAdmin && !isAdmin) {
		return <Navigate to="/dashboard" replace />;
	}

	return children;
};

export default ProtectedRoute;
