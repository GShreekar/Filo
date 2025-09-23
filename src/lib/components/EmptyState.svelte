<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let icon: any = null;
  export let title: string = '';
  export let description: string = '';
  export let actionText: string = '';
  export let actionIcon: any = null;
  export let secondaryActionText: string = '';
  export let secondaryActionIcon: any = null;
  export let showKeyboardHint: boolean = false;
  export let keyboardHint: string = '';
  
  const dispatch = createEventDispatcher();
  
  function handleAction() {
    dispatch('action');
  }
  
  function handleSecondaryAction() {
    dispatch('secondaryAction');
  }
</script>

<div class="flex flex-col items-center justify-center p-8 text-center">
  {#if icon}
    <svelte:component this={icon} class="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
  {/if}
  
  {#if title}
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
      {title}
    </h3>
  {/if}
  
  {#if description}
    <p class="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
      {description}
    </p>
  {/if}
  
  <div class="flex flex-col sm:flex-row gap-3">
    {#if actionText}
      <button
        on:click={handleAction}
        class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        {#if actionIcon}
          <svelte:component this={actionIcon} class="w-4 h-4" />
        {/if}
        {actionText}
      </button>
    {/if}
    
    {#if secondaryActionText}
      <button
        on:click={handleSecondaryAction}
        class="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
      >
        {#if secondaryActionIcon}
          <svelte:component this={secondaryActionIcon} class="w-4 h-4" />
        {/if}
        {secondaryActionText}
      </button>
    {/if}
  </div>
  
  {#if showKeyboardHint && keyboardHint}
    <div class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      <kbd class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
        {keyboardHint}
      </kbd>
    </div>
  {/if}
</div>