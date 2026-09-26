import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'filo-theme';

function applyThemeClass(value: Theme): void {
	document.documentElement.classList.toggle('dark', value === 'dark');
}

function systemPrefersDark(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Placeholder until initTheme() runs on mount — this module can be imported
// where window/localStorage aren't available (SSR, tests), so the real
// value is only ever read after initTheme() has resolved it.
export const theme = writable<Theme>('dark');

// Was hardcoded to dark unconditionally on every load — this instead
// honours a previously-saved choice, falling back to the OS-level light/dark
// preference for a first visit, and keeps following the OS preference on
// later visits unless the user has explicitly picked a theme via
// toggleTheme().
export function initTheme(): () => void {
	const stored = localStorage.getItem(STORAGE_KEY);
	const initial: Theme =
		stored === 'light' || stored === 'dark' ? stored : systemPrefersDark() ? 'dark' : 'light';

	theme.set(initial);
	applyThemeClass(initial);

	const media = window.matchMedia('(prefers-color-scheme: dark)');
	function handleSystemChange(event: MediaQueryListEvent) {
		if (localStorage.getItem(STORAGE_KEY)) return; // an explicit choice wins over the OS
		const next: Theme = event.matches ? 'dark' : 'light';
		theme.set(next);
		applyThemeClass(next);
	}
	media.addEventListener('change', handleSystemChange);

	return () => media.removeEventListener('change', handleSystemChange);
}

export function toggleTheme(): void {
	theme.update((current) => {
		const next: Theme = current === 'dark' ? 'light' : 'dark';
		localStorage.setItem(STORAGE_KEY, next);
		applyThemeClass(next);
		return next;
	});
}
