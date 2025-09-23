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
	{ key: 'n', ctrlKey: true, action: 'new-note', description: 'Create new note' },
	{
		key: 'n',
		ctrlKey: true,
		shiftKey: true,
		action: 'new-folder',
		description: 'Create new folder'
	},
	{ key: 's', ctrlKey: true, action: 'save', description: 'Save note' },

	{ key: 'k', ctrlKey: true, action: 'search', description: 'Focus search' },
	{ key: 'f', ctrlKey: true, action: 'search', description: 'Focus search (alternative)' },

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

	{ key: 'u', ctrlKey: true, action: 'unordered-list', description: 'Bullet list' },
	{ key: 'o', ctrlKey: true, action: 'ordered-list', description: 'Numbered list' },

	{ key: '1', ctrlKey: true, altKey: true, action: 'view-editor', description: 'Editor only' },
	{ key: '2', ctrlKey: true, altKey: true, action: 'view-split', description: 'Split view' },
	{ key: '3', ctrlKey: true, altKey: true, action: 'view-preview', description: 'Preview only' },

	{ key: '\\', ctrlKey: true, action: 'toggle-sidebar', description: 'Toggle sidebar' }
];

export function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
	const ctrlOrMeta = (event.ctrlKey && !!shortcut.ctrlKey) || (event.metaKey && !!shortcut.metaKey);

	return (
		event.key.toLowerCase() === shortcut.key.toLowerCase() &&
		ctrlOrMeta &&
		!!event.shiftKey === !!shortcut.shiftKey &&
		!!event.altKey === !!shortcut.altKey
	);
}

export function getShortcutDescription(action: string): string {
	const shortcut = shortcuts.find((s) => s.action === action);
	if (!shortcut) return '';

	const parts = [];
	if (shortcut.ctrlKey || shortcut.metaKey) {
		parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
	}
	if (shortcut.shiftKey) parts.push('Shift');
	if (shortcut.altKey) parts.push('Alt');
	parts.push(shortcut.key.toUpperCase());

	return parts.join('+');
}
