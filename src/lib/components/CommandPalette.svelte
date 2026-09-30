<script context="module" lang="ts">
	import type { KeyboardShortcut } from '$lib/keyboard-shortcuts';

	export interface PaletteCommand {
		action: string;
		description: string;
		shortcut?: KeyboardShortcut;
	}
</script>

<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';
	import { Search } from 'lucide-svelte';
	import { trapFocus } from '$lib/focus-trap';
	import { getShortcutDisplay } from '$lib/keyboard-shortcuts';

	export let visible = false;
	export let commands: PaletteCommand[] = [];

	const dispatch = createEventDispatcher<{ execute: string; close: void }>();

	let query = '';
	let selectedIndex = 0;
	let inputElement: HTMLInputElement;

	$: filtered = query.trim()
		? commands.filter((c) => c.description.toLowerCase().includes(query.trim().toLowerCase()))
		: commands;

	// Keep the selection in range as filtering shrinks/grows the list, rather
	// than pointing at an index that no longer exists (or freezing on 0 forever).
	$: if (selectedIndex >= filtered.length) {
		selectedIndex = Math.max(0, filtered.length - 1);
	}

	$: if (visible) {
		query = '';
		selectedIndex = 0;
		tick().then(() => inputElement?.focus());
	}

	function close() {
		visible = false;
		dispatch('close');
	}

	function execute(command: PaletteCommand) {
		dispatch('execute', command.action);
		close();
	}

	function handleKeydown(event: KeyboardEvent) {
		// This listener is always attached (see <svelte:window> below), so it
		// must not act — and must not preventDefault() — while the palette
		// itself isn't the thing on screen, or arrow-key/Enter navigation
		// elsewhere in the app (e.g. the search results dropdown) would be
		// fighting an invisible, irrelevant handler.
		if (!visible) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (filtered.length > 0) {
				selectedIndex = (selectedIndex + 1) % filtered.length;
			}
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (filtered.length > 0) {
				selectedIndex = selectedIndex <= 0 ? filtered.length - 1 : selectedIndex - 1;
			}
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (filtered[selectedIndex]) {
				execute(filtered[selectedIndex]);
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/50 transition-opacity"
		on:click={close}
		role="presentation"
	></div>

	<!-- Palette -->
	<div
		class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
		role="dialog"
		aria-modal="true"
		aria-label="Command palette"
		tabindex="-1"
		use:trapFocus
	>
		<div class="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
			<div class="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
				<Search class="h-4 w-4 flex-shrink-0 text-gray-400" />
				<input
					bind:this={inputElement}
					bind:value={query}
					data-autofocus
					type="text"
					placeholder="Type a command..."
					aria-label="Search commands"
					aria-controls="command-palette-list"
					aria-activedescendant={filtered[selectedIndex]
						? `command-${filtered[selectedIndex].action}`
						: undefined}
					role="combobox"
					aria-expanded="true"
					autocomplete="off"
					class="w-full border-none bg-transparent text-sm text-gray-900 outline-none dark:text-gray-100"
				/>
			</div>

			<div id="command-palette-list" role="listbox" class="max-h-80 overflow-y-auto py-2">
				{#if filtered.length === 0}
					<div class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
						No matching commands
					</div>
				{:else}
					{#each filtered as command, index (command.action)}
						<button
							id={`command-${command.action}`}
							role="option"
							aria-selected={index === selectedIndex}
							on:click={() => execute(command)}
							on:mouseenter={() => (selectedIndex = index)}
							class="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors"
							class:bg-blue-50={index === selectedIndex}
							class:dark:bg-blue-900={index === selectedIndex}
							class:text-gray-700={index !== selectedIndex}
							class:dark:text-gray-300={index !== selectedIndex}
							class:text-blue-700={index === selectedIndex}
							class:dark:text-blue-200={index === selectedIndex}
						>
							<span>{command.description}</span>
							{#if command.shortcut}
								<kbd
									class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400"
								>
									{getShortcutDisplay(command.shortcut)}
								</kbd>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
