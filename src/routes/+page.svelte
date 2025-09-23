<script lang="ts">
	import { onMount } from 'svelte';
	import { subscribeFolders, subscribeNotes } from '$lib/firebase-service';
	import { sidebarCollapsed, searchQuery, selectedNote, folders, notes } from '$lib/stores';
	import { createNote, createFolder } from '$lib/firebase-service';
	import { shortcuts, matchesShortcut } from '$lib/keyboard-shortcuts';
	import TopBar from '$lib/components/TopBar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import MainEditor from '$lib/components/MainEditor.svelte';
	import ErrorToast from '$lib/components/ErrorToast.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let searchInput: HTMLInputElement;

	onMount(() => {
		const unsubscribeFolders = subscribeFolders();
		const unsubscribeNotes = subscribeNotes();

		return () => {
			unsubscribeFolders();
			unsubscribeNotes();
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
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		for (const shortcut of shortcuts) {
			if (matchesShortcut(event, shortcut)) {
				const target = event.target as HTMLElement;
				if (
					target.tagName === 'INPUT' ||
					target.tagName === 'TEXTAREA' ||
					target.contentEditable === 'true'
				) {
					if (['bold', 'italic', 'link', 'code'].includes(shortcut.action)) {
						continue;
					}
					return;
				}

				event.preventDefault();

				if (shortcut.action.startsWith('view-')) {
					continue;
				}

				handleGlobalShortcut(shortcut.action);
				break;
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex h-full flex-col">
	<TopBar bind:searchInput />

	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar -->
		<div class="w-80 flex-shrink-0 transition-all duration-300" class:hidden={$sidebarCollapsed}>
			<Sidebar />
		</div>

		<!-- Main Content -->
		<div class="flex-1 overflow-hidden">
			<MainEditor />
		</div>
	</div>
</div>

<!-- Global Components -->
<ErrorToast />
<LoadingSpinner />
