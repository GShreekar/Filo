<script lang="ts">
	import { errors, clearError } from '$lib/error-store';
	import { X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-svelte';
	import type { AppError } from '$lib/error-store';

	$: currentErrors = $errors;

	function getIcon(type: AppError['type']) {
		switch (type) {
			case 'success':
				return CheckCircle;
			case 'warning':
				return AlertTriangle;
			default:
				return AlertCircle;
		}
	}

	function getColorClasses(type: AppError['type']) {
		switch (type) {
			case 'success':
				return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
			case 'warning':
				return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
			default:
				return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
		}
	}
</script>

<div class="fixed top-4 right-4 z-50 space-y-2">
	{#each currentErrors as error (error.id)}
		<div
			class="flex max-w-md items-center gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 {getColorClasses(
				error.type
			)}"
		>
			<svelte:component this={getIcon(error.type)} class="h-5 w-5 flex-shrink-0" />

			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium break-words">
					{error.message}
				</p>
				<p class="mt-1 text-xs opacity-75">
					{error.timestamp.toLocaleTimeString()}
				</p>
			</div>

			<button
				on:click={() => clearError(error.id)}
				class="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
				aria-label="Dismiss"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	{/each}
</div>
