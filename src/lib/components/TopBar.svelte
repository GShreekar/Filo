<script lang="ts">
  import { Search, Menu, Plus, FolderPlus, X } from 'lucide-svelte';
  import { sidebarCollapsed, searchQuery, searchResults, selectedSearchIndex, showSearchResults, selectedNote, folders, notes, inputModal } from '$lib/stores';
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
    sidebarCollapsed.update(collapsed => !collapsed);
  }

  async function handleNewNote() {
    try {
      const noteId = await createNote(null, 'Untitled Note');
      
      const checkForNote = () => {
        const newNote = $notes.find(n => n.id === noteId);
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
        inputModal.update(modal => ({ ...modal, visible: false }));
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
      selectedSearchIndex.update(index => 
        index < $searchResults.length - 1 ? index + 1 : 0
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedSearchIndex.update(index => 
        index > 0 ? index - 1 : $searchResults.length - 1
      );
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

<div class="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-900">
  <div class="flex items-center gap-3">
    <button 
      on:click={toggleSidebar}
      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      title="Toggle Sidebar"
    >
      <Menu size={20} class="text-gray-600 dark:text-gray-400" />
    </button>

    <div class="relative" bind:this={searchContainer}>
      <div class="relative">
        <Search size={18} class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          bind:this={searchInput}
          type="text"
          placeholder="Search notes..."
          bind:value={$searchQuery}
          on:focus={handleSearchFocus}
          on:blur={handleSearchBlur}
          on:keydown={handleSearchKeydown}
          class="pl-10 pr-10 py-2 w-80 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100"
        />
        {#if $searchQuery}
          <button
            on:click={clearSearch}
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        {/if}
      </div>
      
      {#if $showSearchResults}
        <div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
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

  <div class="flex items-center gap-2">
    <button
      on:click={handleNewNote}
      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      title="New Note (Ctrl+N)"
    >
      <Plus size={20} class="text-gray-600 dark:text-gray-400" />
    </button>

    <button
      on:click={handleNewFolder}
      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
  on:cancel={() => inputModal.update(modal => ({ ...modal, visible: false }))}
/>
