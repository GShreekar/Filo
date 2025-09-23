<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Clock, FileText, Hash, ChevronRight, Folder } from 'lucide-svelte';
	import type {
		CombinedSearchResult,
		EnhancedSearchResult,
		FolderSearchResult
	} from '$lib/search-service';
	import { highlightText, formatTimeAgo } from '$lib/search-service';

	export let results: CombinedSearchResult[] = [];
	export let selectedIndex = -1;
	export let query = '';

	const dispatch = createEventDispatcher<{
		select: { result: EnhancedSearchResult; index: number };
		selectFolder: { folder: any; index: number };
	}>();

	$: groupedResults = groupResultsByType(results, query);

	function groupResultsByType(results: CombinedSearchResult[], query: string) {
		const folders = results.filter((r) => r.type === 'folder');
		const titleMatches = results.filter(
			(r) => r.type === 'note' && r.noteResult?.matchType === 'title'
		);
		const contentMatches = results.filter(
			(r) => r.type === 'note' && r.noteResult?.matchType === 'content'
		);
		const bothMatches = results.filter(
			(r) => r.type === 'note' && r.noteResult?.matchType === 'both'
		);
		const recentNotes = results.filter(
			(r) => r.type === 'note' && r.noteResult?.matchType === 'recent'
		);

		return {
			folders,
			titleMatches,
			contentMatches,
			bothMatches,
			recentNotes,
			hasQuery: query.trim().length > 0
		};
	}

	function selectResult(result: EnhancedSearchResult, index: number) {
		dispatch('select', { result, index });
	}

	function selectFolder(folderResult: FolderSearchResult, index: number) {
		dispatch('selectFolder', { folder: folderResult.folder, index });
	}

	function getMatchTypeIcon(matchType: string) {
		switch (matchType) {
			case 'title':
				return Hash;
			case 'content':
				return FileText;
			case 'both':
				return FileText;
			case 'recent':
				return Clock;
			case 'folder':
				return Folder;
			default:
				return FileText;
		}
	}

	function getMatchTypeLabel(matchType: string) {
		switch (matchType) {
			case 'title':
				return 'Title match';
			case 'content':
				return 'Content match';
			case 'both':
				return 'Title & content match';
			case 'recent':
				return 'Recent note';
			case 'folder':
				return 'Folder match';
			default:
				return '';
		}
	}

	function getMatchInfo(result: EnhancedSearchResult) {
		const titleCount = result.titleMatches.length;
		const contentCount = result.contentMatches.length;

		if (titleCount > 0 && contentCount > 0) {
			return `${titleCount} title, ${contentCount} content matches`;
		} else if (titleCount > 0) {
			return `${titleCount} title match${titleCount > 1 ? 'es' : ''}`;
		} else if (contentCount > 0) {
			return `${contentCount} content match${contentCount > 1 ? 'es' : ''}`;
		}
		return 'Recent note';
	}
</script>

<div class="border-t border-gray-200 dark:border-gray-700">
	{#if results.length === 0}
		<div class="p-4 text-center text-gray-500 dark:text-gray-400">
			{#if query.trim()}
				<FileText size={48} class="mx-auto mb-2 opacity-50" />
				<p class="text-sm">No notes found for "{query}"</p>
			{:else}
				<Clock size={48} class="mx-auto mb-2 opacity-50" />
				<p class="text-sm">Start typing to search notes</p>
			{/if}
		</div>
	{:else}
		<div class="max-h-96 overflow-y-auto">
			{#if !groupedResults.hasQuery}
				<div
					class="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
				>
					🕒 Recent Notes
				</div>
			{/if}

			<!-- Folders Section -->
			{#if groupedResults.folders.length > 0}
				{#if groupedResults.hasQuery}
					<div
						class="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
					>
						📁 Folders
					</div>
				{/if}
				{#each groupedResults.folders as result, index}
					{#if result.folderResult}
						<button
							class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
							class:bg-blue-50={selectedIndex === index}
							class:bg-blue-900={selectedIndex === index && true}
							on:click={() => result.folderResult && selectFolder(result.folderResult, index)}
						>
							<div class="flex items-start gap-3">
								<div class="mt-1 flex-shrink-0">
									<Folder size={16} class="text-blue-500 dark:text-blue-400" />
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium text-gray-900 dark:text-gray-100">
										{@html highlightText(
											result.folderResult.folder.name,
											result.folderResult.titleMatches
										)}
									</div>
									<div class="mt-2 flex items-center justify-between">
										<span class="text-xs text-gray-500 dark:text-gray-400"> Folder </span>
									</div>
								</div>
							</div>
						</button>
					{/if}
				{/each}
			{/if}

			<!-- Title & Content Matches -->
			{#if groupedResults.bothMatches.length > 0}
				{#if groupedResults.hasQuery}
					<div
						class="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
					>
						📄 Notes (Title & Content Matches)
					</div>
				{/if}
				{#each groupedResults.bothMatches as result, index}
					{#if result.noteResult}
						<button
							class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
							class:bg-blue-50={selectedIndex === index}
							class:bg-blue-900={selectedIndex === index && true}
							on:click={() => result.noteResult && selectResult(result.noteResult, index)}
						>
							<div class="flex items-start gap-3">
								<div class="mt-1 flex-shrink-0">
									<svelte:component
										this={getMatchTypeIcon(result.noteResult.matchType)}
										size={16}
										class="text-blue-500 dark:text-blue-400"
									/>
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium text-gray-900 dark:text-gray-100">
										{@html highlightText(
											result.noteResult.note.title,
											result.noteResult.titleMatches
										)}
									</div>
									{#if result.noteResult.folder?.name}
										<div
											class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
										>
											<span>{result.noteResult.folder.name}</span>
											<ChevronRight size={12} />
											<span class="truncate">{result.noteResult.note.title}</span>
										</div>
									{/if}
									{#if result.noteResult.excerpt && result.noteResult.contentMatches.length > 0}
										<div class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
											{@html highlightText(
												result.noteResult.excerpt,
												result.noteResult.contentMatches
											)}
										</div>
									{/if}
									<div class="mt-2 flex items-center justify-between">
										<span class="text-xs text-gray-500 dark:text-gray-400"
											>{getMatchInfo(result.noteResult)}</span
										>
										<span class="text-xs text-gray-500 dark:text-gray-400"
											>{formatTimeAgo(result.noteResult.lastModified)}</span
										>
									</div>
								</div>
							</div>
						</button>
					{/if}
				{/each}
			{/if}

			<!-- Title Matches -->
			{#if groupedResults.titleMatches.length > 0}
				{#if groupedResults.hasQuery}
					<div
						class="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
					>
						# Notes (Title Matches)
					</div>
				{/if}
				{#each groupedResults.titleMatches as result, index}
					{#if result.noteResult}
						<button
							class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
							class:bg-blue-50={selectedIndex === index}
							class:bg-blue-900={selectedIndex === index && true}
							on:click={() => result.noteResult && selectResult(result.noteResult, index)}
						>
							<div class="flex items-start gap-3">
								<div class="mt-1 flex-shrink-0">
									<svelte:component
										this={getMatchTypeIcon(result.noteResult.matchType)}
										size={16}
										class="text-blue-500 dark:text-blue-400"
									/>
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium text-gray-900 dark:text-gray-100">
										{@html highlightText(
											result.noteResult.note.title,
											result.noteResult.titleMatches
										)}
									</div>
									{#if result.noteResult.folder?.name}
										<div
											class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
										>
											<span>{result.noteResult.folder.name}</span>
											<ChevronRight size={12} />
											<span class="truncate">{result.noteResult.note.title}</span>
										</div>
									{/if}
									<div class="mt-2 flex items-center justify-between">
										<span class="text-xs text-gray-500 dark:text-gray-400"
											>{getMatchInfo(result.noteResult)}</span
										>
										<span class="text-xs text-gray-500 dark:text-gray-400"
											>{formatTimeAgo(result.noteResult.lastModified)}</span
										>
									</div>
								</div>
							</div>
						</button>
					{/if}
				{/each}
			{/if}

			<!-- Content Matches -->
			{#if groupedResults.contentMatches.length > 0}
				{#if groupedResults.hasQuery}
					<div
						class="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
					>
						📄 Notes (Content Matches)
					</div>
				{/if}
				{#each groupedResults.contentMatches as result, index}
					{#if result.noteResult}
						<button
							class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
							class:bg-blue-50={selectedIndex === index}
							class:bg-blue-900={selectedIndex === index && true}
							on:click={() => result.noteResult && selectResult(result.noteResult, index)}
						>
							<div class="flex items-start gap-3">
								<div class="mt-1 flex-shrink-0">
									<svelte:component
										this={getMatchTypeIcon(result.noteResult.matchType)}
										size={16}
										class="text-blue-500 dark:text-blue-400"
									/>
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium text-gray-900 dark:text-gray-100">
										{result.noteResult.note.title}
									</div>
									{#if result.noteResult.folder?.name}
										<div
											class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
										>
											<span>{result.noteResult.folder.name}</span>
											<ChevronRight size={12} />
											<span class="truncate">{result.noteResult.note.title}</span>
										</div>
									{/if}
									{#if result.noteResult.excerpt && result.noteResult.contentMatches.length > 0}
										<div class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
											{@html highlightText(
												result.noteResult.excerpt,
												result.noteResult.contentMatches
											)}
										</div>
									{/if}
									<div class="mt-2 flex items-center justify-between">
										<span class="text-xs text-gray-500 dark:text-gray-400"
											>{getMatchInfo(result.noteResult)}</span
										>
										<span class="text-xs text-gray-500 dark:text-gray-400"
											>{formatTimeAgo(result.noteResult.lastModified)}</span
										>
									</div>
								</div>
							</div>
						</button>
					{/if}
				{/each}
			{/if}

			<!-- Recent Notes -->
			{#each groupedResults.recentNotes as result, index}
				{#if result.noteResult}
					<button
						class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
						class:bg-blue-50={selectedIndex === index}
						class:bg-blue-900={selectedIndex === index && true}
						on:click={() => result.noteResult && selectResult(result.noteResult, index)}
					>
						<div class="flex items-start gap-3">
							<div class="mt-1 flex-shrink-0">
								<Clock size={16} class="text-gray-400" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="truncate font-medium text-gray-900 dark:text-gray-100">
									{result.noteResult.note.title}
								</div>
								{#if result.noteResult.folder?.name}
									<div
										class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
									>
										<span>{result.noteResult.folder.name}</span>
										<ChevronRight size={12} />
										<span class="truncate">{result.noteResult.note.title}</span>
									</div>
								{/if}
								<!-- Only show excerpt for recent notes if there's a search query and content matches -->
								{#if result.noteResult.excerpt && result.noteResult.contentMatches.length > 0 && query.trim()}
									<div class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
										{@html highlightText(
											result.noteResult.excerpt,
											result.noteResult.contentMatches
										)}
									</div>
								{/if}
								<div class="mt-2 flex items-center justify-between">
									<span class="text-xs text-gray-500 dark:text-gray-400">Recent note</span>
									<span class="text-xs text-gray-500 dark:text-gray-400"
										>{formatTimeAgo(result.noteResult.lastModified)}</span
									>
								</div>
							</div>
						</div>
					</button>
				{/if}
			{/each}
		</div>

		<!-- Search tips -->
		{#if results.length > 0}
			<div
				class="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
			>
				Use ↑↓ arrows to navigate, Enter to select
			</div>
		{/if}
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
