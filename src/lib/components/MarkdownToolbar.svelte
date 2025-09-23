<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { 
    Bold, 
    Italic, 
    Strikethrough, 
    Code, 
    Link, 
    Heading1, 
    Heading2, 
    Heading3, 
    Quote, 
    List, 
    ListOrdered, 
    Minus,
    FileCode 
  } from 'lucide-svelte';
  
  const dispatch = createEventDispatcher();
  
  function handleAction(action: string) {
    dispatch('action', action);
  }
  
  const toolbarGroups = [
    {
      name: 'Format',
      items: [
        { action: 'bold', icon: Bold, title: 'Bold (Ctrl+B)', shortcut: 'Ctrl+B' },
        { action: 'italic', icon: Italic, title: 'Italic (Ctrl+I)', shortcut: 'Ctrl+I' },
        { action: 'strikethrough', icon: Strikethrough, title: 'Strikethrough', shortcut: null }
      ]
    },
    {
      name: 'Headings',
      items: [
        { action: 'heading1', icon: Heading1, title: 'Heading 1', shortcut: null },
        { action: 'heading2', icon: Heading2, title: 'Heading 2', shortcut: null },
        { action: 'heading3', icon: Heading3, title: 'Heading 3', shortcut: null }
      ]
    },
    {
      name: 'Elements',
      items: [
        { action: 'link', icon: Link, title: 'Insert Link (Ctrl+K)', shortcut: 'Ctrl+K' },
        { action: 'code', icon: Code, title: 'Inline Code', shortcut: null },
        { action: 'code-block', icon: FileCode, title: 'Code Block', shortcut: null }
      ]
    },
    {
      name: 'Lists',
      items: [
        { action: 'unordered-list', icon: List, title: 'Bullet List', shortcut: null },
        { action: 'ordered-list', icon: ListOrdered, title: 'Numbered List', shortcut: null },
        { action: 'quote', icon: Quote, title: 'Quote', shortcut: null }
      ]
    },
    {
      name: 'Divider',
      items: [
        { action: 'horizontal-rule', icon: Minus, title: 'Horizontal Rule', shortcut: null }
      ]
    }
  ];
</script>

<div class="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto toolbar-scroll">
  {#each toolbarGroups as group, groupIndex}
    <div class="flex items-center gap-1">
      {#each group.items as item}
        <button
          on:click={() => handleAction(item.action)}
          class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors group relative"
          title={item.title}
        >
          <svelte:component this={item.icon} class="w-4 h-4 text-gray-600 dark:text-gray-400" />
          
          <!-- Tooltip -->
          <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {item.title}
          </div>
        </button>
      {/each}
    </div>
    
    {#if groupIndex < toolbarGroups.length - 1}
      <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
    {/if}
  {/each}
</div>

<style>
  .toolbar-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .toolbar-scroll::-webkit-scrollbar {
    display: none;
  }
</style>