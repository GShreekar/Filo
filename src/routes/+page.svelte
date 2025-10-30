<script lang="ts">
	import { onMount } from 'svelte';
	import { subscribeFolders, subscribeNotes } from '$lib/firebase-service';
	import { sidebarCollapsed, selectedNote, notes, sidebarWidth } from '$lib/stores';
	import { createNote, createFolder } from '$lib/firebase-service';
	import { shortcuts, matchesShortcut } from '$lib/keyboard-shortcuts';
	import TopBar from '$lib/components/TopBar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import MainEditor from '$lib/components/MainEditor.svelte';
	import TabSlider from '$lib/components/TabSlider.svelte';
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

	function handleEditorFocus() {
		if (isMobile && !$sidebarCollapsed) {
			sidebarCollapsed.set(true);
		}
	}

	function handleSidebarResize(event: CustomEvent<{ size: number }>) {
		sidebarWidth.set(event.detail.size);
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
<ErrorToast />
<LoadingSpinner />
