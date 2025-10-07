<script lang="ts">
	import { showError } from '$lib/error-store';
	import { importMarkdownFiles } from '$lib/export-import-service';
	import type { ImportResult } from '$lib/export-import-service';
	import { createNote } from '$lib/firebase-service';
	import { Download, FileText, Archive, X, CheckCircle, AlertCircle } from 'lucide-svelte';

	export let visible = false;

	let fileInput: HTMLInputElement;
	let isImporting = false;
	let importResult: ImportResult | null = null;
	let dragOver = false;

	function close() {
		visible = false;
		importResult = null;
		isImporting = false;
		dragOver = false;
	}

	function openFileDialog() {
		fileInput.click();
	}

	async function handleFiles(files: FileList) {
		if (!files || files.length === 0 || isImporting) return;

		isImporting = true;
		importResult = null;

		try {
			const result = await importMarkdownFiles(files, null, createNote);
			importResult = result;
		} catch (error) {
			importResult = {
				success: 0,
				failed: 1,
				errors: [error instanceof Error ? error.message : 'Import failed']
			};
		} finally {
			isImporting = false;
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			handleFiles(target.files);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;

		if (event.dataTransfer?.files) {
			handleFiles(event.dataTransfer.files);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		// Only set dragOver to false if we're leaving the drop zone entirely
		const target = event.currentTarget as HTMLElement;
		if (!event.relatedTarget || !target?.contains(event.relatedTarget as Node)) {
			dragOver = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		aria-modal="true"
		aria-labelledby="import-title"
	>
		<div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
			<div class="mb-4 flex items-center justify-between">
				<h2 id="import-title" class="text-lg font-semibold text-gray-900 dark:text-white">
					Import Notes
				</h2>
				<button
					on:click={close}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					aria-label="Close"
				>
					<X size={20} />
				</button>
			</div>

			{#if !importResult}
				<p class="mb-6 text-gray-600 dark:text-gray-300">
					Import markdown files or ZIP archives containing notes
				</p>

				<div
					class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
						? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
						: 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}"
					role="button"
					tabindex="0"
					on:drop={handleDrop}
					on:dragover={handleDragOver}
					on:dragleave={handleDragLeave}
					on:click={openFileDialog}
					on:keydown={(e) => e.key === 'Enter' && openFileDialog()}
				>
					{#if isImporting}
						<div class="flex flex-col items-center space-y-3">
							<div
								class="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
							></div>
							<p class="text-gray-600 dark:text-gray-300">Importing files...</p>
						</div>
					{:else}
						<Download size={32} class="mx-auto mb-3 text-gray-400" />
						<p class="mb-2 text-gray-600 dark:text-gray-300">Drag and drop files here, or</p>
						<button
							on:click={openFileDialog}
							class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							disabled={isImporting}
						>
							Browse Files
						</button>
					{/if}
				</div>

				<div class="mt-4 text-sm text-gray-500 dark:text-gray-400">
					<div class="mb-1 flex items-center space-x-2">
						<FileText size={14} />
						<span>Supported: .md files</span>
					</div>
					<div class="flex items-center space-x-2">
						<Archive size={14} />
						<span>Supported: .zip archives (folder structure preserved)</span>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
			{#if importResult.success > 0}
				<div class="flex items-center space-x-2 text-green-600 dark:text-green-400">
					<CheckCircle size={20} />
					<span class="font-medium">Import completed successfully!</span>
				</div>
			{:else}
				<div class="flex items-center space-x-2 text-red-600 dark:text-red-400">
					<AlertCircle size={20} />
					<span class="font-medium">Import completed with errors</span>
				</div>
			{/if}					<div class="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
						<div class="flex justify-between text-sm">
							<span class="text-gray-600 dark:text-gray-300">Notes imported:</span>
							<span class="font-medium text-gray-900 dark:text-white"
								>{importResult.success}</span
							>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-600 dark:text-gray-300">Failed imports:</span>
							<span class="font-medium text-gray-900 dark:text-white"
								>{importResult.failed}</span
							>
						</div>
						{#if importResult.errors.length > 0}
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-300">Errors:</span>
								<span class="font-medium text-red-600 dark:text-red-400"
									>{importResult.errors.length}</span
								>
							</div>
						{/if}
					</div>

					{#if importResult.errors.length > 0}
						<div
							class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
						>
							<h4 class="mb-2 text-sm font-medium text-red-800 dark:text-red-200">Errors:</h4>
							<ul class="space-y-1 text-xs text-red-700 dark:text-red-300">
								{#each importResult.errors as error}
									<li>• {error}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				<div class="mt-6 flex justify-end space-x-3">
					<button
						on:click={close}
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						Done
					</button>
				</div>
			{/if}

			{#if !importResult}
				<div class="mt-6 flex justify-end space-x-3">
					<button
						on:click={close}
						class="rounded-md px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
						disabled={isImporting}
					>
						Cancel
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		multiple
		accept=".md,.zip"
		on:change={handleFileSelect}
		class="hidden"
		aria-label="Select files to import"
	/>
{/if}
