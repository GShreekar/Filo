<script lang="ts">
	import {
		sidebarCollapsed,
		folders,
		notes,
		selectedNote,
		selectedFolder,
		contextMenu,
		confirmModal,
		inputModal,
		searchQuery,
		searchResults,
		showSearchResults,
		selectedSearchIndex
	} from '$lib/stores';
	import {
		createFolder,
		createNote,
		deleteFolder,
		deleteNote,
		updateFolder,
		updateNote
	} from '$lib/firebase-service';
	import { searchAll, highlightText, formatTimeAgo } from '$lib/search-service';
	import { showError } from '$lib/error-store';
	import { tick } from 'svelte';
	import { Folder, FolderOpen, FileText, Plus, Search } from 'lucide-svelte';
	import ContextMenu from './ContextMenu.svelte';
	import ConfirmModal from './ConfirmModal.svelte';
	import InputModal from './InputModal.svelte';
	import EmptyState from './EmptyState.svelte';
	import type { Note, Folder as FolderType } from '$lib/types';

	$: {
		const results = searchAll($searchQuery);
		searchResults.set(results);
	}
	$: isSearching = $searchQuery.trim().length > 0;

	$: {
		if (isSearching) {
			selectedSearchIndex.set(-1);
		}
	}

	let expandedFolders = new Set<string>();

	let editingNoteId: string | null = null;
	let editingTitle = '';
	let titleInputElement: HTMLInputElement;

	let contextMenuVisible = false;

	$: contextMenuVisible = $contextMenu.visible;
	$: if (contextMenuVisible !== $contextMenu.visible) {
		contextMenu.update((menu) => ({ ...menu, visible: contextMenuVisible }));
	}

	let confirmModalVisible = false;
	let inputModalVisible = false;

	$: confirmModalVisible = $confirmModal.visible;
	$: inputModalVisible = $inputModal.visible;

	function toggleFolder(folderId: string) {
		if (expandedFolders.has(folderId)) {
			expandedFolders.delete(folderId);
		} else {
			expandedFolders.add(folderId);
		}
		expandedFolders = expandedFolders;
	}

	function selectNote(note: Note) {
		selectedNote.set(note);
		const folder = $folders.find((f) => f.id === note.folderId);
		selectedFolder.set(folder?.id || null);
	}

	async function startEditingNoteTitle(noteId: string, currentTitle: string) {
		editingNoteId = noteId;
		editingTitle = currentTitle;

		await tick();
		setTimeout(() => {
			if (titleInputElement) {
				titleInputElement.focus();
				titleInputElement.select();
			}
		}, 50);
	}

	function cancelEditingTitle() {
		editingNoteId = null;
		editingTitle = '';
	}

	async function saveNoteTitle() {
		if (!editingNoteId || !editingTitle.trim()) {
			cancelEditingTitle();
			return;
		}

		const note = $notes.find((n) => n.id === editingNoteId);
		if (!note) {
			cancelEditingTitle();
			return;
		}

		const newTitle = editingTitle.trim();

		const duplicateNote = $notes.find(
			(n) => n.id !== editingNoteId && n.title === newTitle && n.folderId === note.folderId
		);

		if (duplicateNote) {
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

		if (newTitle !== note.title) {
			try {
				await updateNote(editingNoteId, { title: newTitle });
				cancelEditingTitle();
			} catch (error) {
				console.error('Failed to update note title:', error);
				showError('Failed to update note title. Please try again.', 'error');
			}
		} else {
			cancelEditingTitle();
		}
	}

	function handleTitleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveNoteTitle();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEditingTitle();
		}
	}

	function showContextMenu(event: MouseEvent, type: 'folder' | 'note', id: string, name: string) {
		event.preventDefault();
		event.stopPropagation();

		let target;
		if (type === 'folder') {
			target = $folders.find((f) => f.id === id);
		} else {
			target = $notes.find((n) => n.id === id);
		}

		contextMenu.set({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			type,
			target
		});
	}

	function handleContextAction(event: CustomEvent<string>) {
		const action = event.detail;
		const { type, target } = $contextMenu;

		if (!target) return;

		switch (action) {
			case 'newNote':
				handleCreateNote(target.id);
				break;
			case 'rename':
				if (type === 'folder') {
					showRenameModal('renameFolder', target.id, (target as FolderType).name);
				} else {
					showRenameModal('renameNote', target.id, (target as Note).title);
				}
				break;
			case 'delete':
				if (type === 'folder') {
					showDeleteConfirm('deleteFolder', target.id, (target as FolderType).name);
				} else {
					showDeleteConfirm('deleteNote', target.id, (target as Note).title);
				}
				break;
		}
	}

	function showDeleteConfirm(action: 'deleteFolder' | 'deleteNote', id: string, name: string) {
		confirmModal.set({
			visible: true,
			title: action === 'deleteFolder' ? 'Delete Folder' : 'Delete Note',
			message:
				action === 'deleteFolder'
					? `Are you sure you want to delete "${name}" and all its notes? This action cannot be undone.`
					: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
			onConfirm: () => {
				if (action === 'deleteFolder') {
					deleteFolder(id);
				} else {
					deleteNote(id);
				}
			}
		});
	}

	function showRenameModal(action: 'renameFolder' | 'renameNote', id: string, currentName: string) {
		inputModal.set({
			visible: true,
			title: action === 'renameFolder' ? 'Rename Folder' : 'Rename Note',
			placeholder: action === 'renameFolder' ? 'Folder name' : 'Note title',
			value: currentName,
			onConfirm: (newName: string) => {
				if (action === 'renameFolder') {
					updateFolder(id, newName);
				} else {
					updateNote(id, { title: newName });
				}
				inputModal.update((modal) => ({ ...modal, visible: false }));
			}
		});
	}

	function showNewFolderModal() {
		inputModal.set({
			visible: true,
			title: 'New Folder',
			placeholder: 'Folder name',
			value: '',
			onConfirm: (name: string) => {
				createFolder(name);
				inputModal.update((modal) => ({ ...modal, visible: false }));
			}
		});
	}

	async function handleCreateNote(folderId: string) {
		try {
			const noteId = await createNote(folderId, 'Untitled Note');

			const checkForNote = () => {
				const newNote = $notes.find((n) => n.id === noteId);
				if (newNote) {
					selectedNote.set(newNote);
					expandedFolders.add(folderId);
					expandedFolders = expandedFolders;
				} else {
					setTimeout(checkForNote, 100);
				}
			};

			checkForNote();
		} catch (error) {
			console.error('Failed to create note:', error);
		}
	}

	async function handleCreateStandaloneNote() {
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
			console.error('Failed to create standalone note:', error);
		}
	}

	function getNotesInFolder(folderId: string): Note[] {
		return $notes.filter((note) => note.folderId === folderId);
	}

	function getStandaloneNotes(): Note[] {
		return $notes.filter((note) => note.folderId === null);
	}

	$: standaloneNotes = $notes.filter((note) => note.folderId === null);

	function handleSearchKeydown(event: KeyboardEvent) {
		if (!isSearching || $searchResults.length === 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedSearchIndex.update((index) => (index < $searchResults.length - 1 ? index + 1 : 0));
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedSearchIndex.update((index) => (index > 0 ? index - 1 : $searchResults.length - 1));
				break;
			case 'Enter':
				event.preventDefault();
				if ($selectedSearchIndex >= 0 && $selectedSearchIndex < $searchResults.length) {
					const result = $searchResults[$selectedSearchIndex];
					if (result.type === 'note' && result.noteResult) {
						selectNote(result.noteResult.note);
					}
				}
				break;
			case 'Escape':
				event.preventDefault();
				searchQuery.set('');
				selectedSearchIndex.set(-1);
				break;
		}
	}
</script>

<div
	class="flex h-full flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
>
	<!-- Header -->
	<div class="border-b border-gray-200 p-4 dark:border-gray-700">
		<!-- Search -->
		<div class="relative mb-3">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
			<input
				type="text"
				placeholder="Search notes..."
				bind:value={$searchQuery}
				on:keydown={handleSearchKeydown}
				class="w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
			/>
			{#if isSearching}
				<div
					class="absolute top-1/2 right-3 -translate-y-1/2 transform text-xs text-gray-500 dark:text-gray-400"
				>
					{$searchResults.length} found
				</div>
			{/if}
		</div>

		<!-- New Folder and New Note Buttons -->
		<div class="flex gap-2">
			<button
				on:click={handleCreateStandaloneNote}
				class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700"
			>
				<Plus class="h-4 w-4" />
				New Note
			</button>

			<button
				on:click={showNewFolderModal}
				class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
			>
				<Plus class="h-4 w-4" />
				New Folder
			</button>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if isSearching}
			<!-- Search Results -->
			<div class="p-2">
				<h3 class="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
					Search Results ({$searchResults.length})
				</h3>
				{#each $searchResults as result, index}
					{#if result.type === 'note' && result.noteResult}
						<button
							on:click={() => result.noteResult && selectNote(result.noteResult.note)}
							class="group w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
							class:bg-blue-50={$selectedNote?.id === result.noteResult.note.id}
							class:dark:bg-blue-900={$selectedNote?.id === result.noteResult.note.id}
							class:ring-2={$selectedSearchIndex === index}
							class:ring-blue-500={$selectedSearchIndex === index}
						>
							<div class="mb-1 flex items-center gap-2">
								<FileText class="h-4 w-4 text-gray-400" />
								<span class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
									{@html highlightText(
										result.noteResult.note.title,
										result.noteResult.titleMatches
									)}
								</span>
								{#if result.noteResult.matchType === 'recent'}
									<span
										class="rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
										>Recent</span
									>
								{/if}
							</div>
							{#if result.noteResult.folder}
								<div class="truncate text-xs text-gray-500 dark:text-gray-400">
									in {result.noteResult.folder.name}
								</div>
							{/if}
							{#if result.noteResult.excerpt && result.noteResult.contentMatches.length > 0}
								<div class="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
									{@html highlightText(result.noteResult.excerpt, result.noteResult.contentMatches)}
								</div>
							{/if}
							{#if result.noteResult.lastModified}
								<div class="mt-1 text-xs text-gray-400 dark:text-gray-500">
									{formatTimeAgo(result.noteResult.lastModified)}
								</div>
							{/if}
						</button>
					{:else if result.type === 'folder' && result.folderResult}
						<button
							on:click={() => result.folderResult && toggleFolder(result.folderResult.folder.id)}
							class="group w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
							class:ring-2={$selectedSearchIndex === index}
							class:ring-blue-500={$selectedSearchIndex === index}
						>
							<div class="mb-1 flex items-center gap-2">
								<Folder class="h-4 w-4 text-blue-600" />
								<span class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
									{@html highlightText(
										result.folderResult.folder.name,
										result.folderResult.titleMatches
									)}
								</span>
								<span
									class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
									>Folder</span
								>
							</div>
							<div class="truncate text-xs text-gray-500 dark:text-gray-400">
								{getNotesInFolder(result.folderResult.folder.id).length} notes
							</div>
						</button>
					{/if}
				{/each}

				{#if $searchResults.length === 0}
					<div class="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
						No results found
					</div>
				{/if}
			</div>
		{:else}
			<!-- Folder Tree -->
			<div class="p-2">
				<!-- Standalone Notes -->
				{#if standaloneNotes.length > 0}
					<div class="mb-4">
						<h3 class="mb-2 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Notes</h3>
						{#each standaloneNotes as note}
							<div
								class="group flex items-center justify-between"
								role="menuitem"
								tabindex="-1"
								on:contextmenu={(e) => showContextMenu(e, 'note', note.id, note.title)}
							>
								<button
									on:click={() => selectNote(note)}
									class="flex flex-1 items-center gap-2 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
									class:bg-blue-50={$selectedNote?.id === note.id}
									class:dark:bg-blue-900={$selectedNote?.id === note.id}
								>
									<FileText class="h-4 w-4 text-gray-400" />
									{#if editingNoteId === note.id}
										<input
											bind:this={titleInputElement}
											bind:value={editingTitle}
											on:keydown={handleTitleKeydown}
											on:blur={saveNoteTitle}
											class="w-full rounded border border-gray-300 bg-white px-1 py-0.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
											type="text"
											placeholder="Enter note title..."
										/>
									{:else}
										<span
											class="cursor-pointer truncate text-sm text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
											on:dblclick={() => startEditingNoteTitle(note.id, note.title)}
											title="Double-click to edit title"
											role="button"
											tabindex="0"
											on:keydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													startEditingNoteTitle(note.id, note.title);
												}
											}}
										>
											{note.title}
										</span>
									{/if}
								</button>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Folders -->
				{#if $folders.length > 0}
					<div class="mb-2">
						<h3 class="mb-2 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Folders</h3>
					</div>
				{/if}

				{#each $folders as folder}
					<div class="mb-2">
						<!-- Folder Header -->
						<div
							class="group flex items-center justify-between"
							role="menuitem"
							tabindex="-1"
							on:contextmenu={(e) => showContextMenu(e, 'folder', folder.id, folder.name)}
						>
							<button
								on:click={() => toggleFolder(folder.id)}
								class="flex flex-1 items-center gap-2 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
							>
								{#if expandedFolders.has(folder.id)}
									<FolderOpen class="h-4 w-4 text-blue-600" />
								{:else}
									<Folder class="h-4 w-4 text-blue-600" />
								{/if}

								<span class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
									{folder.name}
								</span>
							</button>
						</div>

						<!-- Notes in Folder -->
						{#if expandedFolders.has(folder.id)}
							<div class="mt-1 ml-6">
								{#each getNotesInFolder(folder.id) as note}
									<div
										class="group flex items-center justify-between"
										role="menuitem"
										tabindex="-1"
										on:contextmenu={(e) => showContextMenu(e, 'note', note.id, note.title)}
									>
										<button
											on:click={() => selectNote(note)}
											class="flex flex-1 items-center gap-2 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
											class:bg-blue-50={$selectedNote?.id === note.id}
											class:dark:bg-blue-900={$selectedNote?.id === note.id}
										>
											<FileText class="h-4 w-4 text-gray-400" />
											{#if editingNoteId === note.id}
												<input
													bind:this={titleInputElement}
													bind:value={editingTitle}
													on:keydown={handleTitleKeydown}
													on:blur={saveNoteTitle}
													class="w-full rounded border border-gray-300 bg-white px-1 py-0.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
													type="text"
													placeholder="Enter note title..."
												/>
											{:else}
												<span
													class="cursor-pointer truncate text-sm text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
													on:dblclick={() => startEditingNoteTitle(note.id, note.title)}
													title="Double-click to edit title"
													role="button"
													tabindex="0"
													on:keydown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															startEditingNoteTitle(note.id, note.title);
														}
													}}
												>
													{note.title}
												</span>
											{/if}
										</button>
									</div>
								{/each}

								{#if getNotesInFolder(folder.id).length === 0}
									<div class="p-2 text-xs text-gray-500 italic dark:text-gray-400">
										No notes yet
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}

				{#if $folders.length === 0 && $notes.length === 0}
					<EmptyState
						icon={Folder}
						title="No notes yet"
						description="Create your first note or folder to organize your content and get started with Filo."
						actionText="Create Folder"
						actionIcon={Plus}
						on:action={showNewFolderModal}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Context Menu -->
<ContextMenu
	bind:visible={contextMenuVisible}
	x={$contextMenu.x}
	y={$contextMenu.y}
	type={$contextMenu.type}
	on:action={handleContextAction}
/>

<!-- Confirm Modal -->
<ConfirmModal
	bind:visible={confirmModalVisible}
	title={$confirmModal.title}
	message={$confirmModal.message}
	confirmText="Delete"
	type="danger"
	on:confirm={(e) => $confirmModal.onConfirm?.()}
/>

<!-- Input Modal -->
<InputModal
	bind:visible={inputModalVisible}
	title={$inputModal.title}
	bind:value={$inputModal.value}
	placeholder={$inputModal.placeholder}
	on:confirm={(e) => $inputModal.onConfirm?.(e.detail)}
	on:cancel={() => inputModal.update((modal) => ({ ...modal, visible: false }))}
/>
