<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { subscribeFolders, subscribeNotes, getAllNoteContents } from '$lib/firebase-service';
	import {
		sidebarCollapsed,
		selectedNote,
		notes,
		noteContentCache,
		folders,
		sidebarWidth,
		confirmModal,
		inputModal,
		exportModal,
		importModal,
		helpModal,
		editorActions,
		selectedFolder,
		searchQuery
	} from '$lib/stores';
	import { createNote, createFolder, deleteNote } from '$lib/firebase-service';
	import { openNote } from '$lib/note-selection';
	import { initAuth, currentUser, authReady } from '$lib/auth';
	import { clearAutoSaveState, saveCurrentNoteIfDirty } from '$lib/auto-save';
	import { shortcuts, matchesShortcut } from '$lib/keyboard-shortcuts';
	import SignIn from '$lib/components/SignIn.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import MainEditor from '$lib/components/MainEditor.svelte';
	import TabSlider from '$lib/components/TabSlider.svelte';
	import HelpModal from '$lib/components/HelpModal.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import InputModal from '$lib/components/InputModal.svelte';
	import ExportModal from '$lib/components/ExportModal.svelte';
	import ImportModal from '$lib/components/ImportModal.svelte';
	import ErrorToast from '$lib/components/ErrorToast.svelte';

	let searchInput: HTMLInputElement;
	let editorContainer: HTMLElement;
	let isMobile = false;

	let unsubscribeAuth: (() => void) | null = null;
	let unsubscribeFolders: (() => void) | null = null;
	let unsubscribeNotes: (() => void) | null = null;
	let subscribedUserId: string | null = null;

	// Re-point the Firestore listeners whenever the signed-in user changes, and
	// drop every trace of the previous session's data on sign-out.
	$: syncWorkspaceSubscriptions($currentUser?.uid ?? null);

	function syncWorkspaceSubscriptions(userId: string | null) {
		if (userId === subscribedUserId) return;

		unsubscribeFolders?.();
		unsubscribeNotes?.();
		unsubscribeFolders = null;
		unsubscribeNotes = null;
		subscribedUserId = userId;

		clearAutoSaveState();
		selectedNote.set(null);
		selectedFolder.set(null);
		searchQuery.set('');
		notes.set([]);
		folders.set([]);
		noteContentCache.set(new Map());

		if (!userId) return;

		unsubscribeFolders = subscribeFolders(userId);
		unsubscribeNotes = subscribeNotes(userId);

		// One-time background fetch, not a live listener — warms the content
		// search cache without making note bodies part of the live list
		// subscription (2.12). Fire-and-forget: search just has nothing to
		// match against content-wise until this resolves, title search is
		// unaffected, and opening a note fetches its own content regardless.
		getAllNoteContents(userId)
			.then((contents) => {
				if (userId !== subscribedUserId) return; // user switched again meanwhile
				noteContentCache.update((cache) => {
					const merged = new Map(cache);
					for (const [id, content] of contents) {
						// Don't clobber an entry the open note's live listener
						// (MainEditor's watchNoteContent) may have already set
						// more recently than this one-time batch read.
						if (!merged.has(id)) merged.set(id, content);
					}
					return merged;
				});
			})
			.catch((error) => {
				console.error('Failed to warm note content cache:', error);
			});
	}

	onMount(() => {
		unsubscribeAuth = initAuth();

		const checkMobile = () => {
			const wasMobile = isMobile;
			isMobile = window.innerWidth < 768;

			if (isMobile && !wasMobile) {
				sidebarCollapsed.set(true);
			} else if (!isMobile && wasMobile && $sidebarCollapsed) {
				sidebarCollapsed.set(false);
			}
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);

		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	});

	onDestroy(() => {
		unsubscribeFolders?.();
		unsubscribeNotes?.();
		unsubscribeAuth?.();
	});

	// Keeps $selectedNote's metadata (title, folderId, ...) in sync with the
	// notes list — e.g. a rename from the sidebar should reflect immediately
	// in the open editor's header. Content isn't part of NoteMeta any more
	// (2.12): it's kept live by MainEditor's own subscription to the note's
	// content doc, so merge the list's fresher metadata onto whatever content
	// is already on screen rather than comparing/overwriting it here.
	$: if ($selectedNote) {
		const updatedNote = $notes.find((note) => note.id === $selectedNote.id);
		if (
			updatedNote &&
			(updatedNote.title !== $selectedNote.title ||
				updatedNote.folderId !== $selectedNote.folderId ||
				updatedNote.updatedAt.getTime() !== $selectedNote.updatedAt.getTime())
		) {
			selectedNote.set({ ...updatedNote, content: $selectedNote.content });
		}
	}

	async function handleGlobalShortcut(action: string) {
		switch (action) {
			case 'new-note':
				try {
					const noteId = await createNote(null, 'Untitled Note');

					const checkForNote = () => {
						const newNote = $notes.find((n) => n.id === noteId);
						if (newNote) {
							openNote(newNote);
							if (isMobile) {
								sidebarCollapsed.set(true);
							}
						} else {
							setTimeout(checkForNote, 100);
						}
					};

					checkForNote();
				} catch (error) {
					console.error('Failed to create note:', error);
				}
				break;
			case 'new-folder':
				await createFolder('New Folder');
				break;
			case 'save':
				if ($selectedNote) {
					// Auto-save already debounces every keystroke; Ctrl+S just
					// flushes whatever's pending right now instead of waiting.
					saveCurrentNoteIfDirty($selectedNote.id).catch((error) => {
						console.error('Failed to save note:', error);
					});
				}
				break;
			case 'search':
				searchInput?.focus();
				break;
			case 'toggle-sidebar':
				sidebarCollapsed.update((collapsed) => !collapsed);
				break;
			case 'previous-note':
				navigateToNote('previous');
				break;
			case 'next-note':
				navigateToNote('next');
				break;
			case 'delete-note':
				deleteCurrentNote();
				break;
			case 'rename-note':
				renameCurrentNote();
				break;
			case 'export-note':
				exportCurrentNote();
				break;
			case 'import-notes':
				showImportModal();
				break;
			case 'show-help':
				showHelpModal();
				break;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isMobile && !$sidebarCollapsed) {
			event.preventDefault();
			sidebarCollapsed.set(true);
			return;
		}

		for (const shortcut of shortcuts) {
			if (matchesShortcut(event, shortcut)) {
				const target = event.target as HTMLElement;

				const isInEditor =
					target.tagName === 'INPUT' ||
					target.tagName === 'TEXTAREA' ||
					target.contentEditable === 'true' ||
					target.closest('.cm-editor');

				if (
					[
						'new-note',
						'new-folder',
						'save',
						'search',
						'toggle-sidebar',
						'previous-note',
						'next-note',
						'delete-note',
						'rename-note',
						'export-note',
						'import-notes',
						'show-help'
					].includes(shortcut.action)
				) {
					event.preventDefault();
					handleGlobalShortcut(shortcut.action);
					break;
				}

				if (isInEditor) {
					if (
						[
							'bold',
							'italic',
							'link',
							'code',
							'code-block',
							'heading-1',
							'heading-2',
							'heading-3',
							'heading-4',
							'heading-5',
							'heading-6',
							'unordered-list',
							'ordered-list'
						].includes(shortcut.action)
					) {
						return;
					}
					return;
				}

				event.preventDefault();

				if (shortcut.action.startsWith('view-')) {
					return;
				}

				handleGlobalShortcut(shortcut.action);
				break;
			}
		}
	}

	function handleEditorFocus() {
		if (isMobile && !$sidebarCollapsed) {
			sidebarCollapsed.set(true);
		}
	}

	function handleSidebarResize(event: CustomEvent<{ size: number }>) {
		sidebarWidth.set(event.detail.size);
	}

	function navigateToNote(direction: 'next' | 'previous') {
		if (!$selectedNote) return;

		const currentNote = get(selectedNote);
		if (!currentNote) return;

		console.log('Navigation debug:', {
			direction,
			currentNote: currentNote.title,
			selectedNoteFolder: currentNote.folderId || 'none'
		});

		const availableNotes = $notes.filter((note) => {
			if (currentNote.folderId) {
				return note.folderId === currentNote.folderId;
			} else {
				return !note.folderId;
			}
		});

		console.log(
			'Available notes for navigation:',
			availableNotes.map((n) => ({ title: n.title, folderId: n.folderId }))
		);

		if (availableNotes.length <= 1) {
			console.log('Not enough notes to navigate');
			return;
		}

		const currentIndex = availableNotes.findIndex((note) => note.id === currentNote.id);
		if (currentIndex === -1) {
			console.log('Current note not found in available notes');
			return;
		}

		let newIndex;
		if (direction === 'next') {
			newIndex = (currentIndex + 1) % availableNotes.length;
		} else {
			newIndex = currentIndex === 0 ? availableNotes.length - 1 : currentIndex - 1;
		}

		console.log('Navigating from index', currentIndex, 'to', newIndex);
		openNote(availableNotes[newIndex]);
	}

	function deleteCurrentNote() {
		if (!$selectedNote) return;

		confirmModal.set({
			visible: true,
			title: 'Delete Note',
			message: `Are you sure you want to delete "${$selectedNote.title}"? This action cannot be undone.`,
			onConfirm: async () => {
				if ($selectedNote) {
					try {
						await deleteNote($selectedNote.id);
						selectedNote.set(null);
					} catch (error) {
						console.error('Failed to delete note:', error);
					}
				}
			}
		});
	}

	function renameCurrentNote() {
		const currentNote = get(selectedNote);
		if (currentNote) {
			editorActions.set({ action: 'rename-title', timestamp: Date.now() });
		}
	}

	function exportCurrentNote() {
		if (!$selectedNote) return;

		exportModal.set({
			visible: true,
			type: 'note',
			targetNote: $selectedNote
		});
	}

	function showImportModal() {
		importModal.set({
			visible: true
		});
	}

	function showHelpModal() {
		helpModal.set({
			visible: true
		});
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if !$authReady}
	<div class="flex h-full items-center justify-center">
		<div
			class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"
		></div>
	</div>
{:else if !$currentUser}
	<SignIn />
{:else}
	<div class="flex h-full flex-col">
		<TopBar bind:searchInput />

		<div class="flex flex-1 overflow-hidden">
			<!-- Sidebar -->
			<div
				class="flex-shrink-0"
				class:hidden={$sidebarCollapsed}
				class:absolute={isMobile && !$sidebarCollapsed}
				class:inset-y-14={isMobile && !$sidebarCollapsed}
				class:left-0={isMobile && !$sidebarCollapsed}
				class:z-30={isMobile && !$sidebarCollapsed}
				class:shadow-xl={isMobile && !$sidebarCollapsed}
				style="width: {$sidebarCollapsed ? '0' : $sidebarWidth}px"
			>
				<Sidebar />
			</div>

			<!-- Sidebar Resizer -->
			{#if !$sidebarCollapsed && !isMobile}
				<TabSlider
					orientation="horizontal"
					minSize={200}
					maxSize={600}
					initialSize={$sidebarWidth}
					on:resize={handleSidebarResize}
					className="bg-gray-200 dark:bg-gray-700"
				/>
			{/if}

			<!-- Overlay for mobile sidebar -->
			{#if isMobile && !$sidebarCollapsed}
				<div
					class="fixed inset-0 z-20 bg-black/50 transition-opacity"
					on:click={() => sidebarCollapsed.set(true)}
					role="presentation"
				></div>
			{/if}

			<!-- Main Content -->
			<main class="flex-1 overflow-hidden">
				<button
					class="h-full w-full overflow-hidden border-0 bg-transparent p-0 text-left outline-none focus:outline-0"
					bind:this={editorContainer}
					on:click={handleEditorFocus}
					type="button"
					aria-label="Editor area - click to focus and collapse sidebar on mobile"
				>
					<MainEditor />
				</button>
			</main>
		</div>
	</div>

	<!-- Global Components -->
	<!-- Each modal is mounted exactly once, here, bound directly to its store
	     field ($store.visible rather than a local mirror variable) so the
	     component's own internal `visible = false` on close writes straight
	     back to the store — no other component should mount these. -->
	<HelpModal bind:visible={$helpModal.visible} on:close={() => helpModal.set({ visible: false })} />
	<ConfirmModal
		bind:visible={$confirmModal.visible}
		title={$confirmModal.title}
		message={$confirmModal.message}
		confirmText="Delete"
		type="danger"
		on:confirm={() => $confirmModal.onConfirm?.()}
		on:cancel={() => confirmModal.update((modal) => ({ ...modal, visible: false }))}
	/>
	<InputModal
		bind:visible={$inputModal.visible}
		title={$inputModal.title}
		bind:value={$inputModal.value}
		placeholder={$inputModal.placeholder}
		on:confirm={(e) => $inputModal.onConfirm?.(e.detail)}
		on:cancel={() => inputModal.update((modal) => ({ ...modal, visible: false }))}
	/>
	<ExportModal
		bind:visible={$exportModal.visible}
		exportType={$exportModal.type}
		targetNote={$exportModal.targetNote}
		targetFolder={$exportModal.targetFolder}
	/>
	<ImportModal bind:visible={$importModal.visible} />
{/if}

<ErrorToast />
<LoadingSpinner />
