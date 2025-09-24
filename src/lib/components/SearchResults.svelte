<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Clock, FileText, Hash, ChevronRight, Folder, MoreVertical } from 'lucide-svelte';
	import type {
		CombinedSearchResult,
		EnhancedSearchResult,
		FolderSearchResult
	} from '$lib/search-service';
	import { highlightText, formatTimeAgo } from '$lib/search-service';
	import ContextMenu from './ContextMenu.svelte';
	import { updateNote, deleteNote, updateFolder, deleteFolder } from '$lib/firebase-service';
	import { inputModal, confirmModal } from '$lib/stores';

	export let results: CombinedSearchResult[] = [];
	export let selectedIndex = -1;
	export let query = '';

	const dispatch = createEventDispatcher<{
		select: { result: EnhancedSearchResult; index: number };
		selectFolder: { folder: any; index: number };
	}>();

	let contextMenuVisible = false;
	let contextMenuX = 0;
	let contextMenuY = 0;
	let contextMenuType: 'folder' | 'note' = 'folder';
	let contextMenuTarget: any = null;



	let longPressTimer: NodeJS.Timeout | null = null;
	let touchStartTime = 0;

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

	function handleTouchStart(event: TouchEvent, type: 'folder' | 'note', target: any) {
		touchStartTime = Date.now();
		longPressTimer = setTimeout(() => {
			const touch = event.touches[0];
			if (touch) {
				const syntheticEvent = {
					preventDefault: () => event.preventDefault(),
					stopPropagation: () => event.stopPropagation(),
					clientX: touch.clientX,
					clientY: touch.clientY
				} as MouseEvent;
				showContextMenu(syntheticEvent, type, target);
			}
		}, 500);
	}

	function handleTouchEnd() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function handleTouchMove() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function showContextMenu(event: MouseEvent, type: 'folder' | 'note', target: any) {
		if (!target) return;
		event.preventDefault();
		event.stopPropagation();
		contextMenuX = event.clientX;
		contextMenuY = event.clientY;
		contextMenuType = type;
		contextMenuTarget = target;
		contextMenuVisible = true;
	}

	function handleContextMenuAction(event: CustomEvent<string>) {
		const action = event.detail;
		contextMenuVisible = false;

		if (!contextMenuTarget) return;

		switch (action) {
			case 'rename':
				handleRename();
				break;
			case 'delete':
				handleDelete();
				break;
		}
	}

	function handleGlobalClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.context-menu')) {
			contextMenuVisible = false;
		}
	}

	async function handleRename() {
		if (!contextMenuTarget) return;

		const isFolder = contextMenuType === 'folder';
		const currentName = isFolder ? contextMenuTarget.name : contextMenuTarget.title;

		inputModal.set({
			visible: true,
			title: `Rename ${isFolder ? 'Folder' : 'Note'}`,
			placeholder: isFolder ? 'Folder name' : 'Note title',
			value: currentName,
			onConfirm: async (newName: string) => {
				try {
					if (isFolder) {
						await updateFolder(contextMenuTarget.id, newName);
					} else {
						await updateNote(contextMenuTarget.id, { title: newName });
					}
					inputModal.update((modal) => ({ ...modal, visible: false }));
				} catch (error) {
					console.error(`Error renaming ${isFolder ? 'folder' : 'note'}:`, error);
				}
			}
		});
	}

	async function handleDelete() {
		if (!contextMenuTarget) return;

		const isFolder = contextMenuType === 'folder';
		const name = isFolder ? contextMenuTarget.name : contextMenuTarget.title;

		confirmModal.set({
			visible: true,
			title: `Delete ${isFolder ? 'Folder' : 'Note'}`,
			message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
			onConfirm: async () => {
				try {
					if (isFolder) {
						await deleteFolder(contextMenuTarget.id);
					} else {
						await deleteNote(contextMenuTarget.id);
					}
					confirmModal.update((modal) => ({ ...modal, visible: false }));
				} catch (error) {
					console.error(`Error deleting ${isFolder ? 'folder' : 'note'}:`, error);
				}
			}
		});
	}
</script>

<svelte:window on:click={handleGlobalClick} />

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
						<div class="relative group">
							<button
								class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
								class:bg-blue-50={selectedIndex === index}
								class:bg-blue-900={selectedIndex === index && true}
								on:click={() => result.folderResult && selectFolder(result.folderResult, index)}
								on:contextmenu={(e) => result.folderResult && showContextMenu(e, 'folder', result.folderResult!.folder)}
								on:touchstart={(e) => result.folderResult && handleTouchStart(e, 'folder', result.folderResult!.folder)}
								on:touchend={handleTouchEnd}
								on:touchmove={handleTouchMove}
							>
								<div class="flex items-start gap-3">
									<div class="mt-1 flex-shrink-0">
										<Folder size={16} class="text-blue-500 dark:text-blue-400" />
									</div>
									<div class="min-w-0 flex-1">
										<div class="truncate font-medium text-gray-900 dark:text-gray-100">
											{@html highlightText(
												result.folderResult!.folder.name,
												result.folderResult.titleMatches
											)}
										</div>
										<div class="mt-2 flex items-center justify-between">
											<span class="text-xs text-gray-500 dark:text-gray-400"> Folder </span>
										</div>
									</div>
								</div>
							</button>
							<!-- Context menu trigger button -->
							<button
								class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
								on:click={(e) => {
									e.stopPropagation();
									result.folderResult && showContextMenu(e, 'folder', result.folderResult!.folder);
								}}
								title="More options"
							>
								<MoreVertical size={14} class="text-gray-500 dark:text-gray-400" />
							</button>
						</div>
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
						<div class="relative group">
							<button
								class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
								class:bg-blue-50={selectedIndex === index}
								class:bg-blue-900={selectedIndex === index && true}
								on:click={() => result.noteResult && selectResult(result.noteResult, index)}
								on:contextmenu={(e) => showContextMenu(e, 'note', result.noteResult!.note)}
								on:touchstart={(e) => result.noteResult && handleTouchStart(e, 'note', result.noteResult!.note)}
								on:touchend={handleTouchEnd}
								on:touchmove={handleTouchMove}
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
											result.noteResult!.note.title,
											result.noteResult.titleMatches
										)}
									</div>
									{#if result.noteResult.folder?.name}
										<div
											class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
										>
											<span>{result.noteResult.folder.name}</span>
											<ChevronRight size={12} />
											<span class="truncate">{result.noteResult!.note.title}</span>
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
						<!-- Context menu trigger button -->
						<button
							class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
							on:click={(e) => {
								e.stopPropagation();
								showContextMenu(e, 'note', result.noteResult!.note);
							}}
							title="More options"
						>
							<MoreVertical size={14} class="text-gray-500 dark:text-gray-400" />
						</button>
					</div>
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
						<div class="relative group">
							<button
								class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
								class:bg-blue-50={selectedIndex === index}
								class:bg-blue-900={selectedIndex === index && true}
								on:click={() => result.noteResult && selectResult(result.noteResult, index)}
								on:contextmenu={(e) => showContextMenu(e, 'note', result.noteResult!.note)}
								on:touchstart={(e) => result.noteResult && handleTouchStart(e, 'note', result.noteResult!.note)}
								on:touchend={handleTouchEnd}
								on:touchmove={handleTouchMove}
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
											result.noteResult!.note.title,
											result.noteResult.titleMatches
										)}
									</div>
									{#if result.noteResult.folder?.name}
										<div
											class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
										>
											<span>{result.noteResult.folder.name}</span>
											<ChevronRight size={12} />
											<span class="truncate">{result.noteResult!.note.title}</span>
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
						<!-- Context menu trigger button -->
						<button
							class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
							on:click={(e) => {
								e.stopPropagation();
								showContextMenu(e, 'note', result.noteResult!.note);
							}}
							title="More options"
						>
							<MoreVertical size={14} class="text-gray-500 dark:text-gray-400" />
						</button>
					</div>
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
						<div class="relative group">
							<button
								class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
								class:bg-blue-50={selectedIndex === index}
								class:bg-blue-900={selectedIndex === index && true}
								on:click={() => result.noteResult && selectResult(result.noteResult, index)}
								on:contextmenu={(e) => showContextMenu(e, 'note', result.noteResult!.note)}
								on:touchstart={(e) => result.noteResult && handleTouchStart(e, 'note', result.noteResult!.note)}
								on:touchend={handleTouchEnd}
								on:touchmove={handleTouchMove}
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
										{result.noteResult!.note.title}
									</div>
									{#if result.noteResult.folder?.name}
										<div
											class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
										>
											<span>{result.noteResult.folder.name}</span>
											<ChevronRight size={12} />
											<span class="truncate">{result.noteResult!.note.title}</span>
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
						<!-- Context menu trigger button -->
						<button
							class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
							on:click={(e) => {
								e.stopPropagation();
								showContextMenu(e, 'note', result.noteResult!.note);
							}}
							title="More options"
						>
							<MoreVertical size={14} class="text-gray-500 dark:text-gray-400" />
						</button>
					</div>
					{/if}
				{/each}
			{/if}

			<!-- Recent Notes -->
			{#each groupedResults.recentNotes as result, index}
				{#if result.noteResult}
					<div class="relative group">
						<button
							class="w-full border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
							class:bg-blue-50={selectedIndex === index}
							class:bg-blue-900={selectedIndex === index && true}
							on:click={() => result.noteResult && selectResult(result.noteResult, index)}
							on:contextmenu={(e) => showContextMenu(e, 'note', result.noteResult!.note)}
							on:touchstart={(e) => result.noteResult && handleTouchStart(e, 'note', result.noteResult!.note)}
							on:touchend={handleTouchEnd}
							on:touchmove={handleTouchMove}
						>
						<div class="flex items-start gap-3">
							<div class="mt-1 flex-shrink-0">
								<Clock size={16} class="text-gray-400" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="truncate font-medium text-gray-900 dark:text-gray-100">
									{result.noteResult!.note.title}
								</div>
								{#if result.noteResult.folder?.name}
									<div
										class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
									>
										<span>{result.noteResult.folder.name}</span>
										<ChevronRight size={12} />
										<span class="truncate">{result.noteResult!.note.title}</span>
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
					<!-- Context menu trigger button -->
					<button
						class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
						on:click={(e) => {
							e.stopPropagation();
							showContextMenu(e, 'note', result.noteResult!.note);
						}}
						title="More options"
					>
						<MoreVertical size={14} class="text-gray-500 dark:text-gray-400" />
					</button>
				</div>
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

<!-- Context Menu - positioned at document level with high z-index -->
{#if contextMenuVisible}
	<div class="context-menu fixed inset-0 z-[9999] pointer-events-none">
		<ContextMenu
			x={contextMenuX}
			y={contextMenuY}
			visible={contextMenuVisible}
			type={contextMenuType}
			on:close={() => (contextMenuVisible = false)}
			on:action={handleContextMenuAction}
		/>
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
