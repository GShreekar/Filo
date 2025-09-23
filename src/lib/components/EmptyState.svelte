<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let icon: any = null;
	export let title: string = '';
	export let description: string = '';
	export let actionText: string = '';
	export let actionIcon: any = null;
	export let secondaryActionText: string = '';
	export let secondaryActionIcon: any = null;
	export let showKeyboardHint: boolean = false;
	export let keyboardHint: string = '';

	const dispatch = createEventDispatcher();

	function handleAction() {
		dispatch('action');
	}

	function handleSecondaryAction() {
		dispatch('secondaryAction');
	}
</script>

<div class="flex flex-col items-center justify-center p-8 text-center">
	{#if icon}
		<svelte:component this={icon} class="mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />
	{/if}

	{#if title}
		<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
			{title}
		</h3>
	{/if}

	{#if description}
		<p class="mb-6 max-w-md text-gray-600 dark:text-gray-400">
			{description}
		</p>
	{/if}

	<div class="flex flex-col gap-3 sm:flex-row">
		{#if actionText}
			<button
				on:click={handleAction}
				class="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
			>
				{#if actionIcon}
					<svelte:component this={actionIcon} class="h-4 w-4" />
				{/if}
				{actionText}
			</button>
		{/if}

		{#if secondaryActionText}
			<button
				on:click={handleSecondaryAction}
				class="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				{#if secondaryActionIcon}
					<svelte:component this={secondaryActionIcon} class="h-4 w-4" />
				{/if}
				{secondaryActionText}
			</button>
		{/if}
	</div>

	{#if showKeyboardHint && keyboardHint}
		<div class="mt-4 text-sm text-gray-500 dark:text-gray-400">
			<kbd
				class="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
			>
				{keyboardHint}
			</kbd>
		</div>
	{/if}
</div>
