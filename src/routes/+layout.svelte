<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { searchQuery, showSearchResults } from '$lib/stores';

	let { children } = $props();
	
	onMount(() => {
		document.documentElement.classList.add('dark');
		
		function handleGlobalKeydown(event: KeyboardEvent) {
			if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
				event.preventDefault();
				const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
				if (searchInput) {
					searchInput.focus();
					searchInput.select();
					showSearchResults.set(true);
				}
			}
		}
		
		document.addEventListener('keydown', handleGlobalKeydown);
		
		return () => {
			document.removeEventListener('keydown', handleGlobalKeydown);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
	{@render children?.()}
</div>
