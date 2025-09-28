<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		Bold,
		Italic,
		Strikethrough,
		Code,
		Link,
		Heading1,
		Heading2,
		Heading3,
		Quote,
		List,
		ListOrdered,
		Minus,
		FileCode,
		CheckSquare,
		Table,
		Subscript,
		Superscript,
		Calculator,
		Highlighter,
		BookOpen,
		Hash,
		Grid3x3
	} from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	function handleAction(action: string) {
		dispatch('action', action);
	}

	const toolbarGroups = [
		{
			name: 'Format',
			items: [
				{ action: 'bold', icon: Bold, title: 'Bold (Ctrl+B)', shortcut: 'Ctrl+B' },
				{ action: 'italic', icon: Italic, title: 'Italic (Ctrl+I)', shortcut: 'Ctrl+I' },
				{ action: 'strikethrough', icon: Strikethrough, title: 'Strikethrough', shortcut: null },
				{ action: 'highlight', icon: Highlighter, title: 'Highlight Text', shortcut: null }
			]
		},
		{
			name: 'Headings',
			items: [
				{ action: 'heading1', icon: Heading1, title: 'Heading 1', shortcut: null },
				{ action: 'heading2', icon: Heading2, title: 'Heading 2', shortcut: null },
				{ action: 'heading3', icon: Heading3, title: 'Heading 3', shortcut: null }
			]
		},
		{
			name: 'Elements',
			items: [
				{ action: 'link', icon: Link, title: 'Insert Link (Ctrl+K)', shortcut: 'Ctrl+K' },
				{ action: 'code', icon: Code, title: 'Inline Code', shortcut: null },
				{ action: 'code-block', icon: FileCode, title: 'Code Block', shortcut: null }
			]
		},
		{
			name: 'Lists',
			items: [
				{ action: 'unordered-list', icon: List, title: 'Bullet List', shortcut: null },
				{ action: 'ordered-list', icon: ListOrdered, title: 'Numbered List', shortcut: null },
				{ action: 'task-list', icon: CheckSquare, title: 'Task List', shortcut: null },
				{ action: 'quote', icon: Quote, title: 'Quote', shortcut: null }
			]
		},
		{
			name: 'Advanced',
			items: [
				{ action: 'table', icon: Table, title: 'Insert Table', shortcut: null },
				{ action: 'footnote', icon: BookOpen, title: 'Insert Footnote', shortcut: null },
				{ action: 'math-inline', icon: Calculator, title: 'Inline Math', shortcut: null },
				{ action: 'math-block', icon: Calculator, title: 'Math Block', shortcut: null },
				{ action: 'matrix', icon: Grid3x3, title: 'Insert Matrix', shortcut: null }
			]
		},
		{
			name: 'Script',
			items: [
				{ action: 'subscript', icon: Subscript, title: 'Subscript', shortcut: null },
				{ action: 'superscript', icon: Superscript, title: 'Superscript', shortcut: null }
			]
		},
		{
			name: 'Divider',
			items: [{ action: 'horizontal-rule', icon: Minus, title: 'Horizontal Rule', shortcut: null }]
		}
	];
</script>

<div
	class="toolbar-scroll flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/50"
>
	{#each toolbarGroups as group, groupIndex}
		<div class="flex items-center gap-1">
			{#each group.items as item}
				<button
					on:click={() => handleAction(item.action)}
					class="group relative rounded-md p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
					title={item.title}
				>
					<svelte:component this={item.icon} class="h-4 w-4 text-gray-600 dark:text-gray-400" />

					<!-- Tooltip -->
					<div
						class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900"
					>
						{item.title}
					</div>
				</button>
			{/each}
		</div>

		{#if groupIndex < toolbarGroups.length - 1}
			<div class="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
		{/if}
	{/each}
</div>

<style>
	.toolbar-scroll {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.toolbar-scroll::-webkit-scrollbar {
		display: none;
	}
</style>
