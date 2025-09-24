<script lang="ts">
	import { selectedNote, notes } from '$lib/stores';
	import {
		scheduleContentSave,
		scheduleTitleSave,
		clearAutoSaveState,
		autoSaveState,
		saveCurrentNote,
		setInitialNoteState,
		saveCurrentNoteIfDirty
	} from '$lib/auto-save';
	import { updateNote, createNote } from '$lib/firebase-service';
	import { showError } from '$lib/error-store';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import MarkdownPreview from './MarkdownPreview.svelte';
	import EmptyState from './EmptyState.svelte';
	import { FileText, Eye, Edit, Clock, Smartphone, Monitor, Tablet, X, Plus } from 'lucide-svelte';
	import type { Note } from '$lib/types';
	import { onMount, tick } from 'svelte';

	let content = '';
	let viewMode: 'split' | 'editor' | 'preview' = 'split';
	let isMobile = false;
	let isTablet = false;

	let isEditingTitle = false;
	let editingTitle = '';
	let titleInputElement: HTMLInputElement;
	let currentNoteId: string | null = null;

	let previousNoteId: string | null = null;
	let previousContent = '';

	onMount(() => {
		const checkDeviceType = () => {
			isMobile = window.innerWidth < 768;
			isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

			if (isMobile) {
				viewMode = 'editor';
			} else if (isTablet) {
				viewMode = 'split';
			} else {
				viewMode = 'split';
			}
		};

		checkDeviceType();
		window.addEventListener('resize', checkDeviceType);

		return () => {
			window.removeEventListener('resize', checkDeviceType);
		};
	});

	$: if ($selectedNote) {
		if (currentNoteId !== $selectedNote.id && previousNoteId) {
			saveCurrentNoteIfDirty(previousNoteId, previousContent).catch((error) => {
				console.error('Failed to save previous note:', error);
				showError('Failed to save previous note');
			});
		}

		content = $selectedNote.content;

		if (currentNoteId !== $selectedNote.id) {
			setInitialNoteState($selectedNote.id, $selectedNote.content, $selectedNote.title);
			if (isEditingTitle) {
				cancelEditingTitle();
			}
			previousNoteId = currentNoteId;
			previousContent = content;
			currentNoteId = $selectedNote.id;
		}
	} else {
		if (previousNoteId) {
			saveCurrentNoteIfDirty(previousNoteId, previousContent).catch((error) => {
				console.error('Failed to save note on clear:', error);
			});
		}

		content = '';
		clearAutoSaveState();
		if (isEditingTitle) {
			cancelEditingTitle();
		}
		previousNoteId = currentNoteId;
		previousContent = content;
		currentNoteId = null;
	}

	function handleContentChange(newContent: string) {
		content = newContent;
		previousContent = newContent;

		if ($selectedNote) {
			scheduleContentSave($selectedNote.id, newContent);
		}
	}

	function setViewMode(mode: 'split' | 'editor' | 'preview') {
		viewMode = mode;
	}

	async function startEditingTitle() {
		console.log('startEditingTitle called', { selectedNote: $selectedNote, isEditingTitle });
		if ($selectedNote) {
			console.log('Setting editing mode for note:', $selectedNote.title);
			isEditingTitle = true;
			editingTitle = $selectedNote.title;
			console.log('State after setting:', { isEditingTitle, editingTitle });

			await tick();
			setTimeout(() => {
				if (titleInputElement) {
					titleInputElement.focus();
					titleInputElement.select();
					console.log('Input focused successfully');
				} else {
					console.log('titleInputElement is null');
				}
			}, 50);
		}
	}

	function cancelEditingTitle() {
		isEditingTitle = false;
		editingTitle = '';
	}

	async function saveTitle() {
		console.log('Saving title:', editingTitle, 'Original:', $selectedNote?.title);
		if ($selectedNote && editingTitle.trim() && editingTitle.trim() !== $selectedNote.title) {
			const newTitle = editingTitle.trim();

			const duplicateNote = $notes.find(
				(note) =>
					note.id !== $selectedNote.id &&
					note.title === newTitle &&
					note.folderId === $selectedNote.folderId
			);

			if (duplicateNote) {
				console.log('Duplicate title found in same folder');
				showError(
					'This title already exists in this folder. Please choose a different name.',
					'warning'
				);
				setTimeout(() => {
					if (titleInputElement) {
						titleInputElement.focus();
						titleInputElement.select();
					}
				}, 10);
				return;
			}

			try {
				scheduleTitleSave($selectedNote.id, newTitle);
				await saveCurrentNote($selectedNote.id, content);
				isEditingTitle = false;
				editingTitle = '';
				console.log('Title saved successfully');
			} catch (error) {
				console.error('Failed to update note title:', error);
			}
		} else {
			console.log('No changes, canceling edit');
			cancelEditingTitle();
		}
	}

	function handleTitleInput() {
		if ($selectedNote && editingTitle.trim()) {
			scheduleTitleSave($selectedNote.id, editingTitle.trim());
		}
	}

	function handleTitleBlur() {
		setTimeout(() => {
			if (isEditingTitle) {
				saveTitle();
			}
		}, 100);
	}

	function handleTitleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveTitle();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEditingTitle();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.ctrlKey || event.metaKey) {
			switch (event.key) {
				case '1':
					event.preventDefault();
					setViewMode('editor');
					break;
				case '2':
					event.preventDefault();
					setViewMode('split');
					break;
				case '3':
					event.preventDefault();
					setViewMode('preview');
					break;
			}
		}
	}

	function closeNote() {
		selectedNote.set(null);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex h-full flex-col bg-white dark:bg-gray-800">
	{#if $selectedNote}
		<!-- Header with title and controls -->
		<div
			class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700"
		>
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<FileText class="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />

				{#if isEditingTitle}
					<input
						bind:this={titleInputElement}
						bind:value={editingTitle}
						on:input={handleTitleInput}
						on:keydown={handleTitleKeydown}
						on:blur={handleTitleBlur}
						class="title-input w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
						type="text"
						placeholder="Enter note title..."
					/>
				{:else}
					<span
						on:dblclick={() => {
							console.log('Title double-clicked!');
							startEditingTitle();
						}}
						class="cursor-pointer truncate rounded px-1 py-0.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-100 dark:hover:bg-gray-700 dark:hover:text-blue-400"
						title="Double-click to edit title"
						role="button"
						tabindex="0"
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								startEditingTitle();
							}
						}}
					>
						{$selectedNote.title}
					</span>
				{/if}

				<!-- Save/Saving indicator - right after title -->
				{#if $autoSaveState.isSaving && $autoSaveState.noteId === $selectedNote.id}
					<div
						class="mr-2 ml-2 flex flex-shrink-0 items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
					>
						<Clock class="h-3 w-3" />
						Saving...
					</div>
				{:else if ($autoSaveState.contentDirty || $autoSaveState.titleDirty) && $autoSaveState.noteId === $selectedNote.id}
					<div
						class="mr-2 ml-2 flex flex-shrink-0 items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
					>
						<Clock class="h-3 w-3" />
						Unsaved changes
					</div>
				{:else if $autoSaveState.lastSaved && $autoSaveState.noteId === $selectedNote.id}
					<div
						class="mr-2 ml-2 flex flex-shrink-0 items-center gap-1 text-xs text-green-600 dark:text-green-400"
					>
						<Clock class="h-3 w-3" />
						Saved {$autoSaveState.lastSaved.toLocaleTimeString()}
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<!-- Device type indicator -->
				<div class="mr-2 hidden items-center text-xs text-gray-500 sm:flex dark:text-gray-400">
					{#if isMobile}
						<Smartphone class="mr-1 h-3 w-3" />
						Mobile
					{:else if isTablet}
						<Tablet class="mr-1 h-3 w-3" />
						Tablet
					{:else}
						<Monitor class="mr-1 h-3 w-3" />
						Desktop
					{/if}
				</div>

				<!-- Close button -->
				<button
					on:click={closeNote}
					class="rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
					title="Close note"
				>
					<X class="h-4 w-4 text-gray-500 dark:text-gray-400" />
				</button>

				<!-- View mode toggle -->
				<div class="flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
					<button
						on:click={() => setViewMode('editor')}
						class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
						class:bg-white={viewMode === 'editor'}
						class:dark:bg-gray-600={viewMode === 'editor'}
						class:text-gray-900={viewMode === 'editor'}
						class:dark:text-gray-100={viewMode === 'editor'}
						class:text-gray-600={viewMode !== 'editor'}
						class:dark:text-gray-400={viewMode !== 'editor'}
						title="Editor Only (Ctrl+1)"
					>
						<Edit class="h-4 w-4" />
						<span class="hidden sm:inline">Editor</span>
					</button>

					{#if !isMobile}
						<button
							on:click={() => setViewMode('split')}
							class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
							class:bg-white={viewMode === 'split'}
							class:dark:bg-gray-600={viewMode === 'split'}
							class:text-gray-900={viewMode === 'split'}
							class:dark:text-gray-100={viewMode === 'split'}
							class:text-gray-600={viewMode !== 'split'}
							class:dark:text-gray-400={viewMode !== 'split'}
							title="Split View (Ctrl+2)"
						>
							<FileText class="h-4 w-4" />
							<span class="hidden sm:inline">Split</span>
						</button>
					{/if}

					<button
						on:click={() => setViewMode('preview')}
						class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
						class:bg-white={viewMode === 'preview'}
						class:dark:bg-gray-600={viewMode === 'preview'}
						class:text-gray-900={viewMode === 'preview'}
						class:dark:text-gray-100={viewMode === 'preview'}
						class:text-gray-600={viewMode !== 'preview'}
						class:dark:text-gray-400={viewMode !== 'preview'}
						title="Preview Only (Ctrl+3)"
					>
						<Eye class="h-4 w-4" />
						<span class="hidden sm:inline">Preview</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Editor Content -->
		<div class="flex-1 overflow-hidden">
			{#if viewMode === 'split' && !isMobile}
				<div class="flex h-full min-w-0">
					<div class="min-w-0 flex-1 overflow-hidden border-r border-gray-200 dark:border-gray-700">
						<MarkdownEditor {content} onContentChange={handleContentChange} />
					</div>
					<div class="min-w-0 flex-1 overflow-hidden">
						<MarkdownPreview {content} />
					</div>
				</div>
			{:else if viewMode === 'editor'}
				<MarkdownEditor {content} onContentChange={handleContentChange} />
			{:else}
				<MarkdownPreview {content} />
			{/if}
		</div>

		<!-- Mobile view mode tabs -->
		{#if isMobile}
			<div class="flex border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
				<button
					on:click={() => setViewMode('editor')}
					class="flex flex-1 items-center justify-center gap-2 py-3 text-sm transition-colors"
					class:bg-blue-50={viewMode === 'editor'}
					class:dark:bg-blue-900={viewMode === 'editor'}
					class:text-blue-600={viewMode === 'editor'}
					class:dark:text-blue-400={viewMode === 'editor'}
					class:text-gray-600={viewMode !== 'editor'}
					class:dark:text-gray-400={viewMode !== 'editor'}
				>
					<Edit class="h-4 w-4" />
					Write
				</button>

				<button
					on:click={() => setViewMode('preview')}
					class="flex flex-1 items-center justify-center gap-2 py-3 text-sm transition-colors"
					class:bg-blue-50={viewMode === 'preview'}
					class:dark:bg-blue-900={viewMode === 'preview'}
					class:text-blue-600={viewMode === 'preview'}
					class:dark:text-blue-400={viewMode === 'preview'}
					class:text-gray-600={viewMode !== 'preview'}
					class:dark:text-gray-400={viewMode !== 'preview'}
				>
					<Eye class="h-4 w-4" />
					Preview
				</button>
			</div>
		{/if}
	{:else}
		<!-- Welcome Screen -->
		<div class="flex flex-1 items-center justify-center p-8">
			<div class="max-w-md text-center">
				<FileText class="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />
				<h2 class="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
					Welcome to Filo
				</h2>
				<p class="mb-6 text-gray-600 dark:text-gray-400">
					Select a note from the sidebar to start editing, or create a new note to begin your
					writing journey.
				</p>
				<div class="flex flex-col justify-center gap-3 sm:flex-row">
					<button
						on:click={async () => {
							try {
								const noteId = await createNote(null, 'Untitled Note');
								const checkForNote = () => {
									const newNote = $notes.find((n) => n.id === noteId);
									if (newNote) {
										selectedNote.set(newNote);
									} else {
										setTimeout(checkForNote, 100);
									}
								};
								checkForNote();
							} catch (error) {
								console.error('Failed to create note:', error);
							}
						}}
						class="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						<Plus class="h-4 w-4" />
						Create New Note
					</button>
					<button
						on:click={() => {
							const searchInput = document.querySelector(
								'input[placeholder*="Search"]'
							) as HTMLInputElement;
							if (searchInput) {
								searchInput.focus();
							}
						}}
						class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Search Notes
					</button>
				</div>
				<div class="mt-8 text-xs text-gray-500 dark:text-gray-400">
					<p>Keyboard shortcuts:</p>
					<div class="mt-2 space-y-1">
						<div>
							<kbd class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">Ctrl+N</kbd> New
							note
						</div>
						<div>
							<kbd class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">Ctrl+K</kbd> Search
						</div>
						<div>
							<kbd class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">Ctrl+B</kbd> Toggle
							sidebar
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
