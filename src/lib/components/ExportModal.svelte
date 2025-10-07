<script lang="ts">
	import { Upload, FileText, FolderOpen, Database, X } from 'lucide-svelte';
	import {
		exportNote,
		exportFolder,
		exportWorkspace,
		type ExportFormat
	} from '$lib/export-import-service';
	import type { Note, Folder } from '$lib/types';
	import { folders, notes } from '$lib/stores';

	export let visible = false;
	export let exportType: 'note' | 'folder' | 'workspace' = 'note';
	export let targetNote: Note | null = null;
	export let targetFolder: Folder | null = null;

	let selectedFormat: ExportFormat = 'markdown';
	let isExporting = false;
	let exportError = '';

	function close() {
		visible = false;
		exportError = '';
		isExporting = false;
	}

	async function handleExport() {
		if (isExporting) return;

		isExporting = true;
		exportError = '';

		try {
			if (exportType === 'note' && targetNote) {
				await exportNote(targetNote, selectedFormat);
			} else if (exportType === 'folder' && targetFolder) {
				await exportFolder(targetFolder, $notes, selectedFormat);
			} else if (exportType === 'workspace') {
				await exportWorkspace($folders, $notes, selectedFormat);
			}
			close();
		} catch (error) {
			exportError = error instanceof Error ? error.message : 'Export failed';
		} finally {
			isExporting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}

	$: title =
		exportType === 'note'
			? `Export Note: ${targetNote?.title || 'Unknown'}`
			: exportType === 'folder'
				? `Export Folder: ${targetFolder?.name || 'Unknown'}`
				: 'Export Workspace';

	$: description =
		exportType === 'note'
			? 'Export this note as markdown'
			: exportType === 'folder'
				? 'Export all notes in this folder as markdown files'
				: 'Export all notes and folders as markdown files in a ZIP archive';
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		aria-modal="true"
		aria-labelledby="export-title"
	>
		<div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
			<div class="mb-4 flex items-center justify-between">
				<h2 id="export-title" class="text-lg font-semibold text-gray-900 dark:text-white">
					{title}
				</h2>
				<button
					on:click={close}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					aria-label="Close"
				>
					<X size={20} />
				</button>
			</div>

			<p class="mb-6 text-gray-600 dark:text-gray-300">
				{description}
			</p>

			<div class="space-y-4">
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
				>
					<div class="flex items-start space-x-2">
						{#if exportType === 'folder'}
							<FolderOpen size={16} class="mt-0.5 text-blue-600 dark:text-blue-400" />
						{:else if exportType === 'workspace'}
							<Database size={16} class="mt-0.5 text-blue-600 dark:text-blue-400" />
						{:else}
							<FileText size={16} class="mt-0.5 text-blue-600 dark:text-blue-400" />
						{/if}
						<div class="text-sm text-blue-800 dark:text-blue-200">
							{#if exportType === 'note'}
								Note will be exported as raw markdown (.md) file.
							{:else if exportType === 'folder'}
								All notes in the folder will be exported as markdown files in a ZIP archive with folder structure preserved.
							{:else}
								All notes and folders will be exported as markdown files in a ZIP archive with complete folder hierarchy preserved.
							{/if}
						</div>
					</div>
				</div>

				{#if exportError}
					<div
						class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
					>
						<p class="text-sm text-red-800 dark:text-red-200">
							{exportError}
						</p>
					</div>
				{/if}
			</div>

			<div class="mt-6 flex justify-end space-x-3">
				<button
					on:click={close}
					class="rounded-md px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
					disabled={isExporting}
				>
					Cancel
				</button>
				<button
					on:click={handleExport}
					disabled={isExporting}
					class="flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isExporting}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
						></div>
						<span>Exporting...</span>
					{:else}
						<Upload size={16} />
						<span>Export</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
