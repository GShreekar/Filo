import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { matchesShortcut, type KeyboardShortcut } from '../src/lib/keyboard-shortcuts';

const bold: KeyboardShortcut = { key: 'b', ctrlKey: true, action: 'bold', description: 'Bold' };
const codeBlock: KeyboardShortcut = {
	key: 'e',
	ctrlKey: true,
	shiftKey: true,
	action: 'code-block',
	description: 'Code block'
};

function keyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
	return {
		key: 'b',
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		altKey: false,
		...overrides
	} as KeyboardEvent;
}

function setPlatform(platform: string) {
	Object.defineProperty(navigator, 'platform', { value: platform, configurable: true });
}

describe('matchesShortcut on Windows/Linux', () => {
	beforeEach(() => setPlatform('Win32'));

	test('Ctrl+B matches a ctrlKey shortcut', () => {
		expect(matchesShortcut(keyEvent({ key: 'b', ctrlKey: true }), bold)).toBe(true);
	});

	test('Cmd+B (metaKey) does not match', () => {
		expect(matchesShortcut(keyEvent({ key: 'b', metaKey: true }), bold)).toBe(false);
	});

	test('modifiers must match exactly (shift required for code-block)', () => {
		expect(matchesShortcut(keyEvent({ key: 'e', ctrlKey: true }), codeBlock)).toBe(false);
		expect(matchesShortcut(keyEvent({ key: 'e', ctrlKey: true, shiftKey: true }), codeBlock)).toBe(
			true
		);
	});
});

describe('matchesShortcut on Mac', () => {
	beforeEach(() => setPlatform('MacIntel'));
	afterEach(() => setPlatform('Win32'));

	test('Cmd+B matches a ctrlKey shortcut (the primary-modifier mapping)', () => {
		expect(matchesShortcut(keyEvent({ key: 'b', metaKey: true }), bold)).toBe(true);
	});

	test('Ctrl+B does not match on Mac (Ctrl and Cmd are different keys there)', () => {
		expect(matchesShortcut(keyEvent({ key: 'b', ctrlKey: true }), bold)).toBe(false);
	});

	test('Cmd+Shift+E matches the code-block shortcut', () => {
		expect(matchesShortcut(keyEvent({ key: 'e', metaKey: true, shiftKey: true }), codeBlock)).toBe(
			true
		);
	});
});
