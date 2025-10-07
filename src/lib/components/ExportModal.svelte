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
	let exportProgress = { completed: 0, total: 0, currentItem: '' };

	$: if (exportType === 'workspace') {
		selectedFormat = 'markdown';
	}

	$: availableFormats = exportType === 'workspace' 
		? ['markdown'] as const
		: ['markdown', 'pdf'] as const;

	function close() {
		visible = false;
		exportError = '';
		isExporting = false;
		selectedFormat = 'markdown';
		exportProgress = { completed: 0, total: 0, currentItem: '' };
	}

	async function handleExport() {
		if (isExporting) return;

		isExporting = true;
		exportError = '';
		exportProgress = { completed: 0, total: 0, currentItem: '' };

		try {
			if (exportType === 'note' && targetNote) {
				await exportNote(targetNote, selectedFormat);
			} else if (exportType === 'folder' && targetFolder) {
				await exportFolder(
					targetFolder, 
					$notes, 
					selectedFormat,
					(completed, total, currentItem) => {
						exportProgress = { completed, total, currentItem };
					}
				);
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
			? 'Choose format to export this note'
			: exportType === 'folder'
				? 'Choose format to export all notes in this folder'
				: 'Export all notes and folders as markdown files in a ZIP archive';

	$: formatDescription = {
		markdown: exportType === 'note' 
			? 'Export as raw markdown (.md) file'
			: exportType === 'folder'
				? 'Export all notes as markdown files in a ZIP archive'
				: 'Export all notes and folders as markdown files in a ZIP archive with complete folder hierarchy preserved',
		pdf: exportType === 'note'
			? 'Export as formatted PDF file'
			: 'Export all notes as PDF files in a ZIP archive'
	};
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
				<!-- Format Selection -->
				{#if exportType !== 'workspace'}
					<fieldset>
						<legend class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
							Export Format
						</legend>
						<div class="space-y-2">
							{#each availableFormats as format}
								<label class="flex items-center space-x-3 cursor-pointer">
									<input
										type="radio"
										bind:group={selectedFormat}
										value={format}
										disabled={isExporting}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
									/>
									<div class="flex-1">
										<div class="text-sm font-medium text-gray-900 dark:text-white">
											{format === 'markdown' ? 'Markdown' : 'PDF'}
										</div>
										<div class="text-xs text-gray-600 dark:text-gray-400">
											{formatDescription[format]}
										</div>
									</div>
								</label>
							{/each}
						</div>
					</fieldset>
				{/if}

				<!-- Export Info -->
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
							{formatDescription[selectedFormat]}
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

				<!-- Progress Indicator -->
				{#if isExporting && exportProgress.total > 0}
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-blue-800 dark:text-blue-200">
									{selectedFormat === 'pdf' ? 'Generating PDFs...' : 'Processing files...'}
								</span>
								<span class="text-sm text-blue-600 dark:text-blue-300">
									{exportProgress.completed}/{exportProgress.total}
								</span>
							</div>
							
							<!-- Progress Bar -->
							<div class="w-full bg-blue-200 rounded-full h-2 dark:bg-blue-800">
								<div 
									class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
									style="width: {(exportProgress.completed / exportProgress.total) * 100}%"
								></div>
							</div>
							
							{#if exportProgress.currentItem}
								<p class="text-xs text-blue-700 dark:text-blue-300 truncate">
									Current: {exportProgress.currentItem}
								</p>
							{/if}
						</div>
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
