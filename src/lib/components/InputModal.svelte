<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';
	import { X } from 'lucide-svelte';

	export let visible: boolean = false;
	export let title: string = 'Enter Name';
	export let placeholder: string = 'Enter name...';
	export let value: string = '';
	export let confirmText: string = 'Save';
	export let cancelText: string = 'Cancel';

	const dispatch = createEventDispatcher();

	let inputElement: HTMLInputElement;

	function handleConfirm() {
		if (value.trim()) {
			dispatch('confirm', value.trim());
			visible = false;
			value = '';
		}
	}

	function handleCancel() {
		dispatch('cancel');
		visible = false;
		value = '';
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			handleConfirm();
		}
	}

	$: if (visible) {
		tick().then(() => {
			if (inputElement) {
				inputElement.focus();
				inputElement.select();
			}
		});
	}
</script>

{#if visible}
	<!-- Backdrop -->
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
		on:click={handleBackdropClick}
		on:keydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- Modal -->
		<div class="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
			>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
					{title}
				</h3>

				<button
					on:click={handleCancel}
					class="rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
				>
					<X class="h-5 w-5 text-gray-500 dark:text-gray-400" />
				</button>
			</div>

			<!-- Content -->
			<div class="p-6">
				<input
					bind:this={inputElement}
					bind:value
					type="text"
					{placeholder}
					on:keydown={handleKeydown}
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
				/>
			</div>

			<!-- Actions -->
			<div
				class="flex items-center justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700"
			>
				<button
					on:click={handleCancel}
					class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
				>
					{cancelText}
				</button>

				<button
					on:click={handleConfirm}
					disabled={!value.trim()}
					class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
