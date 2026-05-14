const originalFetch = window.fetch;
let refreshTokenPromise = null;

window.fetch = async (input, init = {}) => {
	const urlStr = typeof input === 'string' ? input : input.url;
	
	// Do not intercept auth endpoints to prevent loops
	const isAuthEndpoint = urlStr.includes('/auth/login') || 
						   urlStr.includes('/auth/refresh') || 
						   urlStr.includes('/auth/forgot-password') || 
						   urlStr.includes('/auth/reset-password');

	let response = await originalFetch(input, init);

	// If 401 Unauthorized and it's not an auth endpoint, attempt to refresh token
	if (response.status === 401 && !isAuthEndpoint) {
		const refreshToken = localStorage.getItem('refreshToken');
		
		if (refreshToken) {
			if (!refreshTokenPromise) {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				refreshTokenPromise = originalFetch(`${apiUrl}/auth/refresh`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken })
				}).then(async (refreshRes) => {
					if (refreshRes.ok) {
						const data = await refreshRes.json();
						
						// Update tokens in local storage
						localStorage.setItem('accessToken', data.accessToken);
						localStorage.setItem('refreshToken', data.refreshToken);
						if (data.user) {
							localStorage.setItem('user', JSON.stringify(data.user));
						}
						
						return data.accessToken;
					} else {
						// Refresh token is invalid/expired, log out user
						localStorage.removeItem('accessToken');
						localStorage.removeItem('refreshToken');
						localStorage.removeItem('user');
						window.location.href = '/';
						throw new Error('Refresh token invalid');
					}
				}).catch(err => {
					console.error('Failed to refresh token automatically', err);
					throw err;
				}).finally(() => {
					refreshTokenPromise = null;
				});
			}

			try {
				const newAccessToken = await refreshTokenPromise;
				
				// Clone init options to avoid mutating original
				const newInit = { ...init };
				newInit.headers = newInit.headers ? new Headers(newInit.headers) : new Headers();
				
				// Re-apply the new Authorization header
				if (newInit.headers instanceof Headers) {
					newInit.headers.set('Authorization', `Bearer ${newAccessToken}`);
				} else if (Array.isArray(newInit.headers)) {
					newInit.headers = newInit.headers.filter(h => h[0].toLowerCase() !== 'authorization');
					newInit.headers.push(['Authorization', `Bearer ${newAccessToken}`]);
				} else {
					newInit.headers['Authorization'] = `Bearer ${newAccessToken}`;
				}

				// Retry the original request with the new access token
				response = await originalFetch(input, newInit);
			} catch (err) {
				// Refresh failed, return original 401 response so the caller can handle it
				return response;
			}
		} else {
			// No refresh token found, log out user
			localStorage.removeItem('accessToken');
			localStorage.removeItem('refreshToken');
			localStorage.removeItem('user');
			window.location.href = '/';
		}
	}

	return response;
};
