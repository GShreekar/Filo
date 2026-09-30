<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { Edit2, Trash2, Plus, Upload, Pin, PinOff } from 'lucide-svelte';

	export let x: number = 0;
	export let y: number = 0;
	export let visible: boolean = false;
	export let type: 'folder' | 'note' = 'folder';
	export let isPinned: boolean = false;

	const dispatch = createEventDispatcher();

	let contextMenu: HTMLDivElement;

	// Positioned entirely through these two reactive values, applied once in
	// the template below. The previous version also wrote contextMenu.style
	// directly from this same block — since the template's own
	// `style="left:{x}px..."` binding re-applies on every re-render too, the
	// two writers raced and the declarative one routinely undid the clamp.
	let adjustedX = x;
	let adjustedY = y;

	$: if (visible && contextMenu) {
		const rect = contextMenu.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		adjustedX = x + rect.width > viewportWidth ? Math.max(0, x - rect.width) : x;
		adjustedY = y + rect.height > viewportHeight ? Math.max(0, y - rect.height) : y;
	} else {
		adjustedX = x;
		adjustedY = y;
	}

	function handleClickOutside(event: MouseEvent) {
		if (contextMenu && !contextMenu.contains(event.target as Node)) {
			visible = false;
			dispatch('close');
		}
	}

	function handleAction(action: string) {
		dispatch('action', action);
		visible = false;
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('contextmenu', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('contextmenu', handleClickOutside);
		};
	});
</script>

{#if visible}
	<div
		bind:this={contextMenu}
		class="pointer-events-auto fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
		style="left: {adjustedX}px; top: {adjustedY}px;"
	>
		{#if type === 'folder'}
			<button
				on:click={() => handleAction('newNote')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				<Plus class="h-4 w-4" />
				New Note
			</button>

			<button
				on:click={() => handleAction('newSubfolder')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				<Plus class="h-4 w-4" />
				New Subfolder
			</button>

			<div class="my-1 border-t border-gray-200 dark:border-gray-600"></div>

			<button
				on:click={() => handleAction('rename')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				<Edit2 class="h-4 w-4" />
				Rename Folder
			</button>

			<button
				on:click={() => handleAction('pin')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				{#if isPinned}
					<PinOff class="h-4 w-4" />
					Unpin Folder
				{:else}
					<Pin class="h-4 w-4" />
					Pin Folder
				{/if}
			</button>

			<button
				on:click={() => handleAction('export')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				<Upload class="h-4 w-4" />
				Export Folder
			</button>

			<button
				on:click={() => handleAction('delete')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
			>
				<Trash2 class="h-4 w-4" />
				Delete Folder
			</button>
		{:else}
			<button
				on:click={() => handleAction('rename')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				<Edit2 class="h-4 w-4" />
				Rename Note
			</button>

			<button
				on:click={() => handleAction('pin')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				{#if isPinned}
					<PinOff class="h-4 w-4" />
					Unpin Note
				{:else}
					<Pin class="h-4 w-4" />
					Pin Note
				{/if}
			</button>

			<button
				on:click={() => handleAction('export')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				<Upload class="h-4 w-4" />
				Export Note
			</button>

			<button
				on:click={() => handleAction('delete')}
				class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
			>
				<Trash2 class="h-4 w-4" />
				Delete Note
			</button>
		{/if}
	</div>
{/if}
