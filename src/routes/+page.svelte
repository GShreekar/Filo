<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { subscribeFolders, subscribeNotes } from '$lib/firebase-service';
	import { sidebarCollapsed, selectedNote, notes, sidebarWidth, confirmModal, exportModal, importModal, helpModal, editorActions, selectedFolder } from '$lib/stores';
	import { createNote, createFolder, deleteNote } from '$lib/firebase-service';
	import { shortcuts, matchesShortcut } from '$lib/keyboard-shortcuts';
	import TopBar from '$lib/components/TopBar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import MainEditor from '$lib/components/MainEditor.svelte';
	import TabSlider from '$lib/components/TabSlider.svelte';
	import HelpModal from '$lib/components/HelpModal.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ExportModal from '$lib/components/ExportModal.svelte';
	import ImportModal from '$lib/components/ImportModal.svelte';
	import ErrorToast from '$lib/components/ErrorToast.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let searchInput: HTMLInputElement;
	let editorContainer: HTMLElement;
	let isMobile = false;

	onMount(() => {
		const unsubscribeFolders = subscribeFolders();
		const unsubscribeNotes = subscribeNotes();

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
			unsubscribeFolders();
			unsubscribeNotes();
			window.removeEventListener('resize', checkMobile);
		};
	});

	$: if ($selectedNote) {
		const updatedNote = $notes.find((note) => note.id === $selectedNote.id);
		if (
			updatedNote &&
			(updatedNote.title !== $selectedNote.title ||
				updatedNote.content !== $selectedNote.content ||
				updatedNote.updatedAt.getTime() !== $selectedNote.updatedAt.getTime())
		) {
			selectedNote.set(updatedNote);
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
							selectedNote.set(newNote);
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
					console.log('Note auto-saved');
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
				
				const isInEditor = target.tagName === 'INPUT' ||
					target.tagName === 'TEXTAREA' ||
					target.contentEditable === 'true' ||
					target.closest('.cm-editor');

				if (['new-note', 'new-folder', 'save', 'search', 'toggle-sidebar', 'previous-note', 'next-note', 'delete-note', 'rename-note', 'export-note', 'import-notes', 'show-help'].includes(shortcut.action)) {
					event.preventDefault();
					handleGlobalShortcut(shortcut.action);
					break;
				}

				if (isInEditor) {
					if (['bold', 'italic', 'link', 'code', 'code-block', 'heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6', 'unordered-list', 'ordered-list'].includes(shortcut.action)) {
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
		
		const availableNotes = $notes.filter(note => {
			if (currentNote.folderId) {
				return note.folderId === currentNote.folderId;
			} else {
				return !note.folderId;
			}
		});

		console.log('Available notes for navigation:', availableNotes.map(n => ({ title: n.title, folderId: n.folderId })));

		if (availableNotes.length <= 1) {
			console.log('Not enough notes to navigate');
			return;
		}

		const currentIndex = availableNotes.findIndex(note => note.id === currentNote.id);
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
		selectedNote.set(availableNotes[newIndex]);
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
				class="bg-opacity-50 fixed inset-0 z-20 bg-black transition-opacity"
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
<HelpModal bind:visible={$helpModal.visible} on:close={() => helpModal.set({ visible: false })} />
<ConfirmModal />
<ExportModal />
<ImportModal />
<ErrorToast />
<LoadingSpinner />
