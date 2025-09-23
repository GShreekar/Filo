<script lang="ts">
	import { isLoading, isSaving } from '$lib/error-store';
	import { Loader2, Save } from 'lucide-svelte';

	$: loading = $isLoading;
	$: saving = $isSaving;
</script>

{#if loading || saving}
	<div class="fixed top-4 left-1/2 z-50 -translate-x-1/2 transform">
		<div
			class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
		>
			{#if saving}
				<Save class="h-4 w-4 animate-pulse text-blue-600" />
				<span class="text-sm text-gray-700 dark:text-gray-300">Saving...</span>
			{:else}
				<Loader2 class="h-4 w-4 animate-spin text-blue-600" />
				<span class="text-sm text-gray-700 dark:text-gray-300">Loading...</span>
			{/if}
		</div>
	</div>
{/if}

<!-- Overlay for major loading operations -->
{#if loading}
	<div class="bg-opacity-20 fixed inset-0 z-40 flex items-center justify-center bg-black">
		<div class="flex items-center gap-3 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
			<Loader2 class="h-6 w-6 animate-spin text-blue-600" />
			<span class="text-gray-700 dark:text-gray-300">Loading...</span>
		</div>
	</div>
{/if}
