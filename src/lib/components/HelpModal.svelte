<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { shortcuts } from '$lib/keyboard-shortcuts';
	import { X } from 'lucide-svelte';

	export let visible = false;

	const dispatch = createEventDispatcher();

	function close() {
		visible = false;
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}

	function getKeyDisplay(shortcut: any) {
		const parts = [];
		if (shortcut.ctrlKey || shortcut.metaKey) {
			parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
		}
		if (shortcut.altKey) parts.push('Alt');
		if (shortcut.shiftKey) parts.push('Shift');
		
		let key = shortcut.key;
		if (key === 'ArrowLeft') key = '←';
		else if (key === 'ArrowRight') key = '→';
		else if (key === 'ArrowUp') key = '↑';
		else if (key === 'ArrowDown') key = '↓';
		else if (key === '\\') key = '\\';
		else key = key.toUpperCase();
		
		parts.push(key);
		return parts.join('+');
	}

	// Group shortcuts by category
	$: groupedShortcuts = {
		'File Operations': shortcuts.filter(s => ['new-note', 'new-folder', 'save', 'delete-note', 'rename-note'].includes(s.action)),
		'Navigation': shortcuts.filter(s => ['search', 'toggle-sidebar', 'previous-note', 'next-note'].includes(s.action)),
		'Text Formatting': shortcuts.filter(s => ['bold', 'italic', 'code', 'code-block', 'link'].includes(s.action)),
		'Headings': shortcuts.filter(s => s.action.startsWith('heading-')),
		'Lists': shortcuts.filter(s => ['unordered-list', 'ordered-list'].includes(s.action)),
		'View Modes': shortcuts.filter(s => s.action.startsWith('view-')),
		'Import/Export': shortcuts.filter(s => ['export-note', 'import-notes'].includes(s.action))
	};
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity"
		on:click={close}
		role="presentation"
	></div>

	<!-- Modal -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="help-title"
	>
		<div
			class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
				<h2 id="help-title" class="text-xl font-semibold text-gray-900 dark:text-gray-100">
					Keyboard Shortcuts & Help
				</h2>
				<button
					on:click={close}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Close help"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="p-6">
				<!-- About Section -->
				<div class="mb-8">
					<h3 class="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">About Filo</h3>
					<p class="text-gray-600 dark:text-gray-400">
						Filo is a powerful markdown note-taking application with real-time preview, 
						folder organization, and Firebase sync. Create, edit, and organize your notes 
						with ease using keyboard shortcuts and a clean interface.
					</p>
				</div>

				<!-- Shortcuts Section -->
				<div>
					<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h3>
					
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{#each Object.entries(groupedShortcuts) as [category, categoryShortcuts]}
							{#if categoryShortcuts.length > 0}
								<div>
									<h4 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
										{category}
									</h4>
									<div class="space-y-2">
										{#each categoryShortcuts as shortcut}
											<div class="flex items-center justify-between">
												<span class="text-sm text-gray-600 dark:text-gray-400">
													{shortcut.description}
												</span>
												<kbd class="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
													{getKeyDisplay(shortcut)}
												</kbd>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>

				<!-- Tips Section -->
				<div class="mt-8">
					<h3 class="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">Tips</h3>
					<ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						<li>• Use the sidebar resizer to adjust the sidebar width by dragging</li>
						<li>• In split view, drag the divider to resize editor and preview panes</li>
						<li>• Double-click note titles to rename them quickly</li>
						<li>• All notes are automatically saved as you type</li>
						<li>• Use Markdown syntax for rich formatting (headings, lists, links, etc.)</li>
						<li>• Press Escape on mobile to close the sidebar</li>
					</ul>
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 p-6 dark:border-gray-700">
				<div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
					<span>Press <kbd class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">Esc</kbd> to close</span>
					<span>Filo v1.0</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	kbd {
		font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
	}
</style>