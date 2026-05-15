import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';

const ThemeContext = createContext();

const MODES = ['light', 'dark', 'auto'];

// ── helpers ──────────────────────────────────────────────────────────────────

function resolveDark(mode, sunTimes, locationFailed) {
	if (mode === 'dark') return true;
	if (mode === 'light') return false;

	// auto — use dynamic sunset/sunrise if available
	if (sunTimes && !locationFailed) {
		const now = new Date();
		return now < sunTimes.sunrise || now >= sunTimes.sunset;
	}

	// fallback — static time window
	const hour = new Date().getHours();
	return hour >= 19 || hour < 7;
}

async function fetchSunTimes(lat, lng) {
	const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`;
	const res = await fetch(url);
	if (!res.ok) throw new Error('API error');
	const data = await res.json();
	if (data.status !== 'OK' || !data.results?.sunrise || !data.results?.sunset) {
		throw new Error('Invalid response');
	}
	return {
		sunrise: new Date(data.results.sunrise),
		sunset: new Date(data.results.sunset),
		date: new Date().toDateString(),
	};
}

// ── Provider ─────────────────────────────────────────────────────────────────

export const ThemeProvider = ({ children }) => {
	const [mode, setMode] = useState('light');
	const [sunTimes, setSunTimes] = useState(null);       // { sunrise, sunset, date }
	const [locationFailed, setLocationFailed] = useState(false);

	// refs so the interval always reads the latest values without re-creating itself
	const modeRef = useRef(mode);
	const sunTimesRef = useRef(sunTimes);
	const locationFailedRef = useRef(locationFailed);

	useEffect(() => { modeRef.current = mode; }, [mode]);
	useEffect(() => { sunTimesRef.current = sunTimes; }, [sunTimes]);
	useEffect(() => { locationFailedRef.current = locationFailed; }, [locationFailed]);

	// hydrate from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem('theme');
		if (stored && MODES.includes(stored)) {
			setMode(stored);
		}
	}, []);

	// ── resolve + apply ──────────────────────────────────────────────────

	const isDark = resolveDark(mode, sunTimes, locationFailed);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
		localStorage.setItem('theme', mode);
	}, [mode, isDark]);

	// ── auto-mode: fetch sunrise/sunset via geolocation + api ─────────────

	useEffect(() => {
		if (mode !== 'auto') return;

		const today = new Date().toDateString();
		if (sunTimes?.date === today) return; // already cached for today

		if (!navigator.geolocation) {
			setLocationFailed(true);
			return;
		}

		let cancelled = false;

		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				if (cancelled) return;
				try {
					const times = await fetchSunTimes(pos.coords.latitude, pos.coords.longitude);
					if (!cancelled) {
						setSunTimes(times);
						setLocationFailed(false);
					}
				} catch {
					if (!cancelled) setLocationFailed(true);
				}
			},
			() => { if (!cancelled) setLocationFailed(true); },
			{ timeout: 10_000, maximumAge: 3_600_000 }
		);

		return () => { cancelled = true; };
	}, [mode, sunTimes?.date]);

	// ── periodic re-check (60 s) so theme flips at the boundary ──────────

	useEffect(() => {
		if (mode !== 'auto') return;

		const id = setInterval(() => {
			// If the day changed, clear the cache so the fetch effect re-runs
			const today = new Date().toDateString();
			if (sunTimesRef.current?.date !== today) {
				setSunTimes(null);
			}
			// Apply current time decision
			const nowDark = resolveDark(modeRef.current, sunTimesRef.current, locationFailedRef.current);
			document.documentElement.setAttribute('data-theme', nowDark ? 'dark' : 'light');
		}, 60_000);

		return () => clearInterval(id);
	}, [mode]);

	// ── cycle light → dark → auto → light ────────────────────────────────

	const cycleTheme = useCallback(() => {
		setMode(prev => {
			const idx = MODES.indexOf(prev);
			return MODES[(idx + 1) % MODES.length];
		});
	}, []);

	return (
		<ThemeContext.Provider value={{ themeMode: mode, isDark, cycleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	return useContext(ThemeContext);
};
