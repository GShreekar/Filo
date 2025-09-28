<script lang="ts">
	import { Search, Menu, Plus, FolderPlus, X } from 'lucide-svelte';
	import {
		sidebarCollapsed,
		searchQuery,
		searchResults,
		selectedSearchIndex,
		showSearchResults,
		selectedNote,
		folders,
		notes,
		inputModal
	} from '$lib/stores';
	import { createNote, createFolder } from '$lib/firebase-service';
	import { searchAll } from '$lib/search-service';
	import SearchResults from './SearchResults.svelte';
	import InputModal from './InputModal.svelte';

	export let searchInput: HTMLInputElement | undefined = undefined;

	let searchContainer: HTMLDivElement;
	let searchFocused = false;
	let searchTimeout: NodeJS.Timeout;

	let inputModalVisible = false;
	$: inputModalVisible = $inputModal.visible;

	$: if ($searchQuery !== undefined) {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			updateSearchResults($searchQuery);
		}, 200);
	}

	function updateSearchResults(query: string) {
		const results = searchAll(query);
		searchResults.set(results);
		selectedSearchIndex.set(-1);
		showSearchResults.set(searchFocused && (query.trim().length > 0 || results.length > 0));
	}

	function toggleSidebar() {
		sidebarCollapsed.update((collapsed) => !collapsed);
	}

	async function handleNewNote() {
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
	}

	async function handleNewFolder() {
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

	function handleSearchFocus() {
		searchFocused = true;
		showSearchResults.set(true);
		updateSearchResults($searchQuery);
	}

	function handleSearchBlur() {
		setTimeout(() => {
			searchFocused = false;
			if ($searchQuery.trim() === '') {
				showSearchResults.set(false);
			}
		}, 200);
	}

	function clearSearch() {
		searchQuery.set('');
		searchInput?.focus();
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			searchInput?.blur();
			showSearchResults.set(false);
			return;
		}

		if (!$showSearchResults || $searchResults.length === 0) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedSearchIndex.update((index) => (index < $searchResults.length - 1 ? index + 1 : 0));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedSearchIndex.update((index) => (index > 0 ? index - 1 : $searchResults.length - 1));
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if ($selectedSearchIndex >= 0 && $selectedSearchIndex < $searchResults.length) {
				selectSearchResult($searchResults[$selectedSearchIndex], $selectedSearchIndex);
			}
		}
	}

	function selectSearchResult(result: any, index: number) {
		if (result.type === 'note' && result.noteResult) {
			selectedNote.set(result.noteResult.note);
			if (typeof window !== 'undefined' && window.innerWidth < 768) {
				sidebarCollapsed.set(true);
			}
		} else if (result.type === 'folder' && result.folderResult) {
			console.log('Selected folder:', result.folderResult.folder.name);
		}
		showSearchResults.set(false);
		searchInput?.blur();
	}

	function selectFolder(folder: any, index: number) {
		console.log('Selected folder:', folder.name);
		showSearchResults.set(false);
		searchInput?.blur();
	}

	function handleClickOutside(event: MouseEvent) {
		if (searchContainer && !searchContainer.contains(event.target as Node)) {
			showSearchResults.set(false);
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div
	class="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-2 sm:px-4 dark:border-gray-700 dark:bg-gray-900"
>
	<div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
		<button
			on:click={toggleSidebar}
			class="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
			title="Toggle Sidebar"
		>
			<Menu size={20} class="text-gray-600 dark:text-gray-400" />
		</button>

		<div class="relative min-w-0 flex-1 sm:flex-none" bind:this={searchContainer}>
			<div class="relative">
				<Search
					size={18}
					class="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
				/>
				<input
					bind:this={searchInput}
					type="text"
					placeholder="Search notes..."
					bind:value={$searchQuery}
					on:focus={handleSearchFocus}
					on:blur={handleSearchBlur}
					on:keydown={handleSearchKeydown}
					class="w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 py-2 pr-10 pl-10 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:w-80 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400"
				/>
				{#if $searchQuery}
					<button
						on:click={clearSearch}
						class="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
					>
						<X size={16} />
					</button>
				{/if}
			</div>

			{#if $showSearchResults}
				<div
					class="absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
				>
					<SearchResults
						results={$searchResults}
						selectedIndex={$selectedSearchIndex}
						query={$searchQuery}
						on:select={(e) => selectSearchResult(e.detail.result, e.detail.index)}
						on:selectFolder={(e) => selectFolder(e.detail.folder, e.detail.index)}
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex flex-shrink-0 items-center gap-1 sm:gap-2">
		<button
			on:click={handleNewNote}
			class="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
			title="New Note (Ctrl+N)"
		>
			<Plus size={18} class="text-gray-600 sm:size-5 dark:text-gray-400" />
		</button>

		<button
			on:click={handleNewFolder}
			class="hidden rounded-lg p-2 transition-colors hover:bg-gray-100 sm:block dark:hover:bg-gray-800"
			title="New Folder (Ctrl+Shift+N)"
		>
			<FolderPlus size={20} class="text-gray-600 dark:text-gray-400" />
		</button>
	</div>
</div>

<!-- Input Modal -->
<InputModal
	bind:visible={inputModalVisible}
	title={$inputModal.title}
	bind:value={$inputModal.value}
	placeholder={$inputModal.placeholder}
	on:confirm={(e) => $inputModal.onConfirm?.(e.detail)}
	on:cancel={() => inputModal.update((modal) => ({ ...modal, visible: false }))}
/>
