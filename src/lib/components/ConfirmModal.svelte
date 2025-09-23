<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { AlertTriangle, X } from 'lucide-svelte';
  
  export let visible: boolean = false;
  export let title: string = 'Confirm Action';
  export let message: string = 'Are you sure you want to proceed?';
  export let confirmText: string = 'Confirm';
  export let cancelText: string = 'Cancel';
  export let type: 'danger' | 'warning' | 'info' = 'info';
  
  const dispatch = createEventDispatcher();
  
  function handleConfirm() {
    dispatch('confirm');
    visible = false;
  }
  
  function handleCancel() {
    dispatch('cancel');
    visible = false;
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter') {
      handleConfirm();
    }
  }
  
  $: buttonClasses = type === 'danger' 
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : type === 'warning'
    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
</script>

{#if visible}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- Modal -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          {#if type === 'danger' || type === 'warning'}
            <AlertTriangle class="w-6 h-6 text-{type === 'danger' ? 'red' : 'yellow'}-600" />
          {/if}
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
        
        <button
          on:click={handleCancel}
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        <p class="text-gray-700 dark:text-gray-300">
          {message}
        </p>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
        <button
          on:click={handleCancel}
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          {cancelText}
        </button>
        
        <button
          on:click={handleConfirm}
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {buttonClasses}"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}