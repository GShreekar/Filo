export interface KeyboardShortcut {
	key: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	action: string;
	description: string;
}

export const shortcuts: KeyboardShortcut[] = [
	{ key: 'n', altKey: true, action: 'new-note', description: 'Create new note' },
	{
		key: 'n',
		altKey: true,
		shiftKey: true,
		action: 'new-folder',
		description: 'Create new folder'
	},
	{ key: 's', ctrlKey: true, action: 'save', description: 'Save note' },

	{ key: 'k', ctrlKey: true, action: 'search', description: 'Focus search' },
	{
		key: 'p',
		ctrlKey: true,
		shiftKey: true,
		action: 'command-palette',
		description: 'Open command palette'
	},

	{ key: 'b', ctrlKey: true, action: 'bold', description: 'Bold text' },
	{ key: 'i', ctrlKey: true, action: 'italic', description: 'Italic text' },
	{ key: 'e', ctrlKey: true, action: 'code', description: 'Inline code' },
	{ key: 'e', ctrlKey: true, shiftKey: true, action: 'code-block', description: 'Code block' },
	{ key: 'l', ctrlKey: true, action: 'link', description: 'Insert link' },

	{ key: '1', ctrlKey: true, action: 'heading-1', description: 'Heading 1' },
	{ key: '2', ctrlKey: true, action: 'heading-2', description: 'Heading 2' },
	{ key: '3', ctrlKey: true, action: 'heading-3', description: 'Heading 3' },
	{ key: '4', ctrlKey: true, action: 'heading-4', description: 'Heading 4' },
	{ key: '5', ctrlKey: true, action: 'heading-5', description: 'Heading 5' },
	{ key: '6', ctrlKey: true, action: 'heading-6', description: 'Heading 6' },

	{ key: '8', ctrlKey: true, shiftKey: true, action: 'unordered-list', description: 'Bullet list' },
	{ key: '7', ctrlKey: true, shiftKey: true, action: 'ordered-list', description: 'Numbered list' },

	{ key: '1', ctrlKey: true, altKey: true, action: 'view-editor', description: 'Editor only' },
	{ key: '2', ctrlKey: true, altKey: true, action: 'view-split', description: 'Split view' },
	{ key: '3', ctrlKey: true, altKey: true, action: 'view-preview', description: 'Preview only' },

	{ key: '\\', ctrlKey: true, action: 'toggle-sidebar', description: 'Toggle sidebar' },

	{ key: 'ArrowLeft', altKey: true, action: 'previous-note', description: 'Previous note' },
	{ key: 'ArrowRight', altKey: true, action: 'next-note', description: 'Next note' },

	{ key: 'Delete', altKey: true, action: 'delete-note', description: 'Delete note' },
	{ key: 'r', altKey: true, action: 'rename-note', description: 'Rename note' },
	{ key: 'e', altKey: true, action: 'export-note', description: 'Export note' },
	{ key: 'i', altKey: true, action: 'import-notes', description: 'Import notes' },
	{ key: 'h', altKey: true, action: 'show-help', description: 'Show help' }
];

// Every shortcut is authored with ctrlKey — treated here as "the platform's
// primary modifier": Ctrl on Windows/Linux, Cmd (metaKey) on Mac. Without this,
// Cmd+anything never matched on Mac, since event.metaKey and event.ctrlKey are
// genuinely different keys there — despite the help modal correctly showing
// "⌘" for these shortcuts, pressing it did nothing. Checked fresh each call,
// same as getShortcutDisplay() below, rather than cached — navigator.platform
// can't change mid-session, so this costs nothing.
function isMacPlatform(): boolean {
	return typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
}

export function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
	const primaryModifierPressed = isMacPlatform() ? event.metaKey : event.ctrlKey;
	const primaryModifierExpected = !!shortcut.ctrlKey;

	return (
		event.key.toLowerCase() === shortcut.key.toLowerCase() &&
		primaryModifierPressed === primaryModifierExpected &&
		!!event.shiftKey === !!shortcut.shiftKey &&
		!!event.altKey === !!shortcut.altKey
	);
}

// Shared by HelpModal and CommandPalette so the two don't drift — used to
// have its own near-identical copy in each.
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
	const parts = [];
	if (shortcut.ctrlKey || shortcut.metaKey) {
		parts.push(isMacPlatform() ? '⌘' : 'Ctrl');
	}
	if (shortcut.altKey) parts.push('Alt');
	if (shortcut.shiftKey) parts.push('Shift');

	let key = shortcut.key;
	if (key === 'ArrowLeft') key = '←';
	else if (key === 'ArrowRight') key = '→';
	else if (key === 'ArrowUp') key = '↑';
	else if (key === 'ArrowDown') key = '↓';
	else if (key !== '\\') key = key.toUpperCase();

	parts.push(key);
	return parts.join('+');
}
