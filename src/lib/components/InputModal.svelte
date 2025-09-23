<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { X } from 'lucide-svelte';
  
  export let visible: boolean = false;
  export let title: string = 'Enter Name';
  export let placeholder: string = 'Enter name...';
  export let value: string = '';
  export let confirmText: string = 'Save';
  export let cancelText: string = 'Cancel';
  
  const dispatch = createEventDispatcher();
  
  let inputElement: HTMLInputElement;
  
  function handleConfirm() {
    if (value.trim()) {
      dispatch('confirm', value.trim());
      visible = false;
      value = '';
    }
  }
  
  function handleCancel() {
    dispatch('cancel');
    visible = false;
    value = '';
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
      event.preventDefault();
      handleConfirm();
    }
  }
  
  $: if (visible) {
    tick().then(() => {
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    });
  }
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
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        
        <button
          on:click={handleCancel}
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        <input
          bind:this={inputElement}
          bind:value
          type="text"
          {placeholder}
          on:keydown={handleKeydown}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
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
          disabled={!value.trim()}
          class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}