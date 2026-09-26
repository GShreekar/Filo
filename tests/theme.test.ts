// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { theme, initTheme, toggleTheme } from '../src/lib/theme';

function mockMatchMedia(prefersDark: boolean) {
	const listeners: Array<(e: MediaQueryListEvent) => void> = [];
	window.matchMedia = ((query: string) => ({
		matches: query.includes('dark') ? prefersDark : false,
		media: query,
		addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
		onchange: null
	})) as unknown as typeof window.matchMedia;
	return {
		fireChange: (matches: boolean) =>
			listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent))
	};
}

describe('theme resolution', () => {
	let stop: (() => void) | undefined;

	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove('dark');
	});

	afterEach(() => {
		stop?.();
		document.documentElement.classList.remove('dark');
	});

	test('first visit with no stored preference follows the OS: dark', () => {
		mockMatchMedia(true);
		stop = initTheme();
		expect(get(theme)).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	test('first visit with no stored preference follows the OS: light', () => {
		mockMatchMedia(false);
		stop = initTheme();
		expect(get(theme)).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	test('a stored preference overrides the OS default', () => {
		mockMatchMedia(true); // OS says dark
		localStorage.setItem('filo-theme', 'light'); // user explicitly chose light
		stop = initTheme();
		expect(get(theme)).toBe('light');
	});

	test('toggleTheme flips the theme, persists it, and updates the DOM class', () => {
		mockMatchMedia(false);
		stop = initTheme();
		expect(get(theme)).toBe('light');

		toggleTheme();
		expect(get(theme)).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(localStorage.getItem('filo-theme')).toBe('dark');
	});

	test('an explicit user choice is not overridden by a later OS change', () => {
		const { fireChange } = mockMatchMedia(false);
		stop = initTheme();

		toggleTheme(); // user explicitly picks dark
		expect(get(theme)).toBe('dark');

		fireChange(false); // OS reports light — should be ignored, a choice was made
		expect(get(theme)).toBe('dark');
	});

	test('without a stored choice, the app follows a live OS change', () => {
		const { fireChange } = mockMatchMedia(false);
		stop = initTheme();
		expect(get(theme)).toBe('light');

		fireChange(true); // OS switches to dark, no explicit choice on record
		expect(get(theme)).toBe('dark');
	});
});
