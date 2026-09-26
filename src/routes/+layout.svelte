<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { showSearchResults } from '$lib/stores';
	import { theme, initTheme } from '$lib/theme';
	// Imported as raw CSS text (Vite's ?inline), not applied as a stylesheet
	// on their own — the markdown preview's syntax-highlighted code blocks
	// need whichever one matches the app's current theme, swapped below,
	// rather than one theme permanently baked in regardless of light/dark.
	import darkHljsCss from 'highlight.js/styles/github-dark.css?inline';
	import lightHljsCss from 'highlight.js/styles/github.css?inline';

	let { children } = $props();

	$effect(() => {
		const styleEl = document.getElementById('hljs-theme');
		if (styleEl) styleEl.textContent = $theme === 'dark' ? darkHljsCss : lightHljsCss;
	});

	onMount(() => {
		const stopWatchingSystemTheme = initTheme();

		function handleGlobalKeydown(event: KeyboardEvent) {
			if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
				event.preventDefault();
				const searchInput = document.querySelector(
					'input[placeholder*="Search"]'
				) as HTMLInputElement;
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
			stopWatchingSystemTheme();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<style id="hljs-theme"></style>
</svelte:head>

<div
	class="h-screen w-screen overflow-hidden bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
>
	{@render children?.()}
</div>
