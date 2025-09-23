<script lang="ts">
  import { isLoading, isSaving } from '$lib/error-store';
  import { Loader2, Save } from 'lucide-svelte';
  
  $: loading = $isLoading;
  $: saving = $isSaving;
</script>

{#if loading || saving}
  <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
    <div class="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-2">
      {#if saving}
        <Save class="w-4 h-4 text-blue-600 animate-pulse" />
        <span class="text-sm text-gray-700 dark:text-gray-300">Saving...</span>
      {:else}
        <Loader2 class="w-4 h-4 text-blue-600 animate-spin" />
        <span class="text-sm text-gray-700 dark:text-gray-300">Loading...</span>
      {/if}
    </div>
  </div>
{/if}

<!-- Overlay for major loading operations -->
{#if loading}
  <div class="fixed inset-0 bg-black bg-opacity-20 z-40 flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 flex items-center gap-3">
      <Loader2 class="w-6 h-6 text-blue-600 animate-spin" />
      <span class="text-gray-700 dark:text-gray-300">Loading...</span>
    </div>
  </div>
{/if}