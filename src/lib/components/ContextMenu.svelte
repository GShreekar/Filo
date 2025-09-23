<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { Edit2, Trash2, Plus, FolderPlus } from 'lucide-svelte';
  
  export let x: number = 0;
  export let y: number = 0;
  export let visible: boolean = false;
  export let type: 'folder' | 'note' = 'folder';
  
  const dispatch = createEventDispatcher();
  
  let contextMenu: HTMLDivElement;
  
  $: if (visible && contextMenu) {
    const rect = contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;
    
    if (x + rect.width > viewportWidth) {
      adjustedX = x - rect.width;
    }
    
    if (y + rect.height > viewportHeight) {
      adjustedY = y - rect.height;
    }
    
    contextMenu.style.left = `${adjustedX}px`;
    contextMenu.style.top = `${adjustedY}px`;
  }
  
  function handleClickOutside(event: MouseEvent) {
    if (contextMenu && !contextMenu.contains(event.target as Node)) {
      visible = false;
    }
  }
  
  function handleAction(action: string) {
    dispatch('action', action);
    visible = false;
  }
  
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  });
</script>

{#if visible}
  <div
    bind:this={contextMenu}
    class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
    style="left: {x}px; top: {y}px;"
  >
    {#if type === 'folder'}
      <button
        on:click={() => handleAction('newNote')}
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Plus class="w-4 h-4" />
        New Note
      </button>
      
      <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
      
      <button
        on:click={() => handleAction('rename')}
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Edit2 class="w-4 h-4" />
        Rename Folder
      </button>
      
      <button
        on:click={() => handleAction('delete')}
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 class="w-4 h-4" />
        Delete Folder
      </button>
    {:else}
      <button
        on:click={() => handleAction('rename')}
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Edit2 class="w-4 h-4" />
        Rename Note
      </button>
      
      <button
        on:click={() => handleAction('delete')}
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 class="w-4 h-4" />
        Delete Note
      </button>
    {/if}
  </div>
{/if}