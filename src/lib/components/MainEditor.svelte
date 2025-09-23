<script lang="ts">
  import { selectedNote, notes } from '$lib/stores';
  import { scheduleContentSave, scheduleTitleSave, clearAutoSaveState, autoSaveState, saveCurrentNote, setInitialNoteState, saveCurrentNoteIfDirty } from '$lib/auto-save';
  import { updateNote } from '$lib/firebase-service';
  import { showError } from '$lib/error-store';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import MarkdownPreview from './MarkdownPreview.svelte';
  import EmptyState from './EmptyState.svelte';
  import { FileText, Eye, Edit, Clock, Smartphone, Monitor, Tablet } from 'lucide-svelte';
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
      saveCurrentNoteIfDirty(previousNoteId, previousContent).catch(error => {
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
      saveCurrentNoteIfDirty(previousNoteId, previousContent).catch(error => {
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
      
      const duplicateNote = $notes.find(note => 
        note.id !== $selectedNote.id && 
        note.title === newTitle && 
        note.folderId === $selectedNote.folderId
      );
      
      if (duplicateNote) {
        console.log('Duplicate title found in same folder');
        showError('This title already exists in this folder. Please choose a different name.', 'warning');
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
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-full flex flex-col bg-white dark:bg-gray-800">
  {#if $selectedNote}
    <!-- View Mode Toggle -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <FileText class="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
        
        {#if isEditingTitle}
          <input
            bind:this={titleInputElement}
            bind:value={editingTitle}
            on:input={handleTitleInput}
            on:keydown={handleTitleKeydown}
            on:blur={handleTitleBlur}
            class="title-input text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            type="text"
            placeholder="Enter note title..."
          />
        {:else}
          <span
            on:dblclick={() => {
              console.log('Title double-clicked!');
              startEditingTitle();
            }}
            class="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
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
          <div class="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 flex-shrink-0 ml-2 mr-2">
            <Clock class="w-3 h-3" />
            Saving...
          </div>
        {:else if ($autoSaveState.contentDirty || $autoSaveState.titleDirty) && $autoSaveState.noteId === $selectedNote.id}
          <div class="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2 mr-2">
            <Clock class="w-3 h-3" />
            Unsaved changes
          </div>
        {:else if $autoSaveState.lastSaved && $autoSaveState.noteId === $selectedNote.id}
          <div class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 flex-shrink-0 ml-2 mr-2">
            <Clock class="w-3 h-3" />
            Saved {$autoSaveState.lastSaved.toLocaleTimeString()}
          </div>
        {/if}
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Device type indicator -->
        <div class="hidden sm:flex items-center text-xs text-gray-500 dark:text-gray-400 mr-2">
          {#if isMobile}
            <Smartphone class="w-3 h-3 mr-1" />
            Mobile
          {:else if isTablet}
            <Tablet class="w-3 h-3 mr-1" />
            Tablet
          {:else}
            <Monitor class="w-3 h-3 mr-1" />
            Desktop
          {/if}
        </div>
        
        <!-- View mode toggle -->
        <div class="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            on:click={() => setViewMode('editor')}
            class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors"
            class:bg-white={viewMode === 'editor'}
            class:dark:bg-gray-600={viewMode === 'editor'}
            class:text-gray-900={viewMode === 'editor'}
            class:dark:text-gray-100={viewMode === 'editor'}
            class:text-gray-600={viewMode !== 'editor'}
            class:dark:text-gray-400={viewMode !== 'editor'}
            title="Editor Only (Ctrl+1)"
          >
            <Edit class="w-4 h-4" />
            <span class="hidden sm:inline">Editor</span>
          </button>
          
          {#if !isMobile}
            <button
              on:click={() => setViewMode('split')}
              class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors"
              class:bg-white={viewMode === 'split'}
              class:dark:bg-gray-600={viewMode === 'split'}
              class:text-gray-900={viewMode === 'split'}
              class:dark:text-gray-100={viewMode === 'split'}
              class:text-gray-600={viewMode !== 'split'}
              class:dark:text-gray-400={viewMode !== 'split'}
              title="Split View (Ctrl+2)"
            >
              <FileText class="w-4 h-4" />
              <span class="hidden sm:inline">Split</span>
            </button>
          {/if}
          
          <button
            on:click={() => setViewMode('preview')}
            class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors"
            class:bg-white={viewMode === 'preview'}
            class:dark:bg-gray-600={viewMode === 'preview'}
            class:text-gray-900={viewMode === 'preview'}
            class:dark:text-gray-100={viewMode === 'preview'}
            class:text-gray-600={viewMode !== 'preview'}
            class:dark:text-gray-400={viewMode !== 'preview'}
            title="Preview Only (Ctrl+3)"
          >
            <Eye class="w-4 h-4" />
            <span class="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Editor Content -->
    <div class="flex-1 overflow-hidden">
      {#if viewMode === 'split' && !isMobile}
        <div class="flex h-full min-w-0">
          <div class="flex-1 border-r border-gray-200 dark:border-gray-700 min-w-0 overflow-hidden">
            <MarkdownEditor {content} onContentChange={handleContentChange} />
          </div>
          <div class="flex-1 min-w-0 overflow-hidden">
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
      <div class="flex border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <button
          on:click={() => setViewMode('editor')}
          class="flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors"
          class:bg-blue-50={viewMode === 'editor'}
          class:dark:bg-blue-900={viewMode === 'editor'}
          class:text-blue-600={viewMode === 'editor'}
          class:dark:text-blue-400={viewMode === 'editor'}
          class:text-gray-600={viewMode !== 'editor'}
          class:dark:text-gray-400={viewMode !== 'editor'}
        >
          <Edit class="w-4 h-4" />
          Write
        </button>
        
        <button
          on:click={() => setViewMode('preview')}
          class="flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors"
          class:bg-blue-50={viewMode === 'preview'}
          class:dark:bg-blue-900={viewMode === 'preview'}
          class:text-blue-600={viewMode === 'preview'}
          class:dark:text-blue-400={viewMode === 'preview'}
          class:text-gray-600={viewMode !== 'preview'}
          class:dark:text-gray-400={viewMode !== 'preview'}
        >
          <Eye class="w-4 h-4" />
          Preview
        </button>
      </div>
    {/if}
  {:else}
    <!-- Welcome Screen -->
    <div class="flex-1 flex items-center justify-center">
      <EmptyState
        icon={FileText}
        title="Welcome to Filo"
        description="Select a note from the sidebar to start editing, or create a new folder and note to get started."
        actionText=""
      />
    </div>
  {/if}
</div>