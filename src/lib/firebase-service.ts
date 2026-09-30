import {
	collection,
	doc,
	addDoc,
	setDoc,
	updateDoc,
	deleteDoc,
	getDoc,
	onSnapshot,
	query,
	orderBy,
	where,
	Timestamp,
	getDocs,
	writeBatch
} from 'firebase/firestore';
import { get } from 'svelte/store';
import { db } from './firebase';
import { requireUserId } from './auth';
import type { Folder, Note, NoteMeta } from './types';
import { folders, notes } from './stores';
import { showError, isLoading, isSaving } from './error-store';

export async function createFolder(name: string, parentId: string | null = null): Promise<string> {
	try {
		isLoading.set(true);
		const ownerId = requireUserId();
		const docRef = await addDoc(collection(db, 'folders'), {
			name,
			parentId: parentId || null,
			ownerId,
			createdAt: Timestamp.now(),
			pinnedAt: null
		});
		showError(`Folder "${name}" created successfully`, 'success');
		return docRef.id;
	} catch (error) {
		console.error('Error creating folder:', error);
		showError('Failed to create folder. Please try again.');
		throw error;
	} finally {
		isLoading.set(false);
	}
}

export async function updateFolder(id: string, name: string): Promise<void> {
	try {
		isSaving.set(true);
		await updateDoc(doc(db, 'folders', id), {
			name
		});
		showError('Folder renamed successfully', 'success');
	} catch (error) {
		console.error('Error updating folder:', error);
		showError('Failed to rename folder. Please try again.');
		throw error;
	} finally {
		isSaving.set(false);
	}
}

// Deliberately not routed through updateFolder(): pinning isn't a rename, and
// shouldn't show a "renamed successfully" toast or require a name argument.
export async function setFolderPinned(id: string, pinned: boolean): Promise<void> {
	try {
		await updateDoc(doc(db, 'folders', id), {
			pinnedAt: pinned ? Timestamp.now() : null
		});
	} catch (error) {
		console.error('Error updating folder pin state:', error);
		showError('Failed to update pin. Please try again.');
		throw error;
	}
}

export async function deleteFolder(id: string): Promise<void> {
	try {
		isLoading.set(true);
		const ownerId = requireUserId();

		async function getAllSubfolderIds(parentId: string): Promise<string[]> {
			const subfoldersQuery = query(
				collection(db, 'folders'),
				where('ownerId', '==', ownerId),
				where('parentId', '==', parentId)
			);
			const subfoldersSnapshot = await getDocs(subfoldersQuery);

			const subfolderIds = subfoldersSnapshot.docs.map((doc) => doc.id);
			const allSubfolderIds = [...subfolderIds];

			for (const subfolderId of subfolderIds) {
				const nestedIds = await getAllSubfolderIds(subfolderId);
				allSubfolderIds.push(...nestedIds);
			}

			return allSubfolderIds;
		}

		const allSubfolderIds = await getAllSubfolderIds(id);
		const allFolderIds = [id, ...allSubfolderIds];

		const noteIds: string[] = [];
		for (const folderId of allFolderIds) {
			const notesQuery = query(
				collection(db, 'notes'),
				where('ownerId', '==', ownerId),
				where('folderId', '==', folderId)
			);
			const notesSnapshot = await getDocs(notesQuery);
			noteIds.push(...notesSnapshot.docs.map((noteDoc) => noteDoc.id));
		}

		// Notes and their content docs first, then folders deepest-first, so a
		// partial failure never leaves notes stranded under a missing folder.
		const deletions = [
			...noteIds.map((noteId) => doc(db, 'notes', noteId)),
			...noteIds.map((noteId) => doc(db, 'noteContents', noteId)),
			...allFolderIds.reverse().map((folderId) => doc(db, 'folders', folderId))
		];

		for (let i = 0; i < deletions.length; i += 450) {
			const batch = writeBatch(db);
			for (const ref of deletions.slice(i, i + 450)) {
				batch.delete(ref);
			}
			await batch.commit();
		}

		showError('Folder and all its contents deleted successfully', 'success');
	} catch (error) {
		console.error('Error deleting folder:', error);
		showError('Failed to delete folder. Please try again.');
		throw error;
	} finally {
		isLoading.set(false);
	}
}

// Rename already refuses to create a duplicate title within a folder (see
// updateNote's callers in MainEditor/Sidebar); create had no equivalent
// check, so every "New Note" click piled up same-named notes that you were
// then stuck with (renaming *away* from the duplicate is fine, there's just
// no way to end up with two of them again). This makes create respect the
// same invariant by finding the next free "title", "title 2", "title 3", ...
function uniqueNoteTitle(folderId: string | null, baseTitle: string): string {
	const siblingTitles = new Set(
		get(notes)
			.filter((n) => (n.folderId || null) === (folderId || null))
			.map((n) => n.title)
	);

	if (!siblingTitles.has(baseTitle)) return baseTitle;

	let suffix = 2;
	while (siblingTitles.has(`${baseTitle} ${suffix}`)) suffix++;
	return `${baseTitle} ${suffix}`;
}

export async function createNote(
	folderId: string | null,
	title: string,
	content: string = ''
): Promise<string> {
	try {
		isLoading.set(true);
		const ownerId = requireUserId();
		const uniqueTitle = uniqueNoteTitle(folderId, title);

		// Metadata and content are separate docs (2.12) but must appear
		// together, so write both in one batch under a pre-generated id
		// rather than addDoc-then-setDoc, which could leave metadata without
		// a content doc if the second write failed.
		const noteRef = doc(collection(db, 'notes'));
		const batch = writeBatch(db);
		batch.set(noteRef, {
			title: uniqueTitle,
			folderId: folderId || null,
			ownerId,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now(),
			revision: 0,
			pinnedAt: null
		});
		batch.set(doc(db, 'noteContents', noteRef.id), { content, ownerId });
		await batch.commit();

		showError(`Note "${uniqueTitle}" created successfully`, 'success');
		return noteRef.id;
	} catch (error) {
		console.error('Error creating note:', error);
		showError('Failed to create note. Please try again.');
		throw error;
	} finally {
		isLoading.set(false);
	}
}

export async function updateNote(
	id: string,
	updates: Partial<Pick<Note, 'title' | 'content'>>,
	options: { silent?: boolean; baseRevision: number }
): Promise<number> {
	try {
		isSaving.set(true);
		const ownerId = requireUserId();
		const updatedAt = Timestamp.now();
		const newRevision = options.baseRevision + 1;

		const batch = writeBatch(db);
		const metaUpdate: Record<string, unknown> = { updatedAt, revision: newRevision };
		if (updates.title !== undefined) metaUpdate.title = updates.title;
		batch.update(doc(db, 'notes', id), metaUpdate);

		if (updates.content !== undefined) {
			// set(..., {merge:true}) rather than update(): resilient to a note
			// whose content doc doesn't exist yet (e.g. this one hasn't been
			// through the metadata/content split migration).
			batch.set(
				doc(db, 'noteContents', id),
				{ content: updates.content, ownerId },
				{ merge: true }
			);
		}

		await batch.commit();

		if (updates.title && !options.silent) {
			showError('Note updated successfully', 'success');
		}

		return newRevision;
	} catch (error) {
		console.error('Error updating note:', error);
		showError('Failed to update note. Changes may be lost.');
		throw error;
	} finally {
		isSaving.set(false);
	}
}

export async function moveNote(id: string, newFolderId: string | null): Promise<void> {
	try {
		isSaving.set(true);
		await updateDoc(doc(db, 'notes', id), {
			folderId: newFolderId,
			updatedAt: Timestamp.now()
		});
		showError('Note moved successfully', 'success');
	} catch (error) {
		console.error('Error moving note:', error);
		showError('Failed to move note. Please try again.');
		throw error;
	} finally {
		isSaving.set(false);
	}
}

// Not routed through updateNote(): pinning doesn't touch title/content, so it
// has no business bumping revision (5.1.3's conflict check) or updatedAt (which
// would reorder the note in the main list — pinned order is tracked separately).
export async function setNotePinned(id: string, pinned: boolean): Promise<void> {
	try {
		await updateDoc(doc(db, 'notes', id), {
			pinnedAt: pinned ? Timestamp.now() : null
		});
	} catch (error) {
		console.error('Error updating note pin state:', error);
		showError('Failed to update pin. Please try again.');
		throw error;
	}
}

export async function deleteNote(id: string): Promise<void> {
	try {
		isLoading.set(true);
		const batch = writeBatch(db);
		batch.delete(doc(db, 'notes', id));
		batch.delete(doc(db, 'noteContents', id));
		await batch.commit();
		showError('Note deleted successfully', 'success');
	} catch (error) {
		console.error('Error deleting note:', error);
		showError('Failed to delete note. Please try again.');
		throw error;
	} finally {
		isLoading.set(false);
	}
}

export function subscribeFolders(userId: string) {
	try {
		const q = query(
			collection(db, 'folders'),
			where('ownerId', '==', userId),
			orderBy('createdAt', 'asc')
		);

		return onSnapshot(
			q,
			(snapshot) => {
				const folderData: Folder[] = snapshot.docs.map((doc) => ({
					id: doc.id,
					name: doc.data().name,
					parentId: doc.data().parentId || null,
					ownerId: doc.data().ownerId,
					createdAt: doc.data().createdAt?.toDate() ?? new Date(),
					pinnedAt: doc.data().pinnedAt?.toDate() ?? null
				}));
				folders.set(folderData);
			},
			(error) => {
				console.error('Error listening to folders:', error);
				showError('Lost connection to folders. Please refresh the page.');
			}
		);
	} catch (error) {
		console.error('Error setting up folders listener:', error);
		showError('Failed to load folders. Please refresh the page.');
		return () => {};
	}
}

// Metadata only — no content field is read here. This is what makes 2.12's
// fix real: the list that powers the sidebar and title search no longer
// carries every note's full body.
export function subscribeNotes(userId: string) {
	try {
		const q = query(
			collection(db, 'notes'),
			where('ownerId', '==', userId),
			orderBy('updatedAt', 'desc')
		);

		return onSnapshot(
			q,
			(snapshot) => {
				const noteData: NoteMeta[] = snapshot.docs.map((doc) => ({
					id: doc.id,
					title: doc.data().title,
					folderId: doc.data().folderId,
					ownerId: doc.data().ownerId,
					createdAt: doc.data().createdAt?.toDate() ?? new Date(),
					updatedAt: doc.data().updatedAt?.toDate() ?? new Date(),
					// Notes written before this field existed have none in
					// Firestore — treated as revision 0 rather than migrated,
					// since the next write to any such note stamps a real one.
					revision: doc.data().revision ?? 0,
					pinnedAt: doc.data().pinnedAt?.toDate() ?? null
				}));
				notes.set(noteData);
			},
			(error) => {
				console.error('Error listening to notes:', error);
				showError('Lost connection to notes. Please refresh the page.');
			}
		);
	} catch (error) {
		console.error('Error setting up notes listener:', error);
		showError('Failed to load notes. Please refresh the page.');
		return () => {};
	}
}

// Live content for exactly one note — used for whichever note is currently
// open, swapped out as the selection changes (see MainEditor.svelte). Keeps
// the same "content updates while open" behavior the app had before the
// metadata/content split, without every note's body being part of the list
// listener.
export function subscribeNoteContent(noteId: string, onContent: (content: string) => void) {
	return onSnapshot(
		doc(db, 'noteContents', noteId),
		(snapshot) => {
			onContent(snapshot.exists() ? (snapshot.data().content ?? '') : '');
		},
		(error) => {
			console.error('Error listening to note content:', error);
			showError('Lost connection to this note. Please reopen it.');
		}
	);
}

// One-time fetch of a single note's content — for export, where a live
// subscription isn't needed.
export async function getNoteContent(noteId: string): Promise<string> {
	const snapshot = await getDoc(doc(db, 'noteContents', noteId));
	return snapshot.exists() ? (snapshot.data().content ?? '') : '';
}

// One-time batched fetch of every note's content for this user, used to warm
// the client-side search cache (noteContentCache in stores.ts) after login,
// and to fetch bodies in bulk for folder/workspace export. Not a live
// listener — the cache can go briefly stale if a note is edited elsewhere
// and not reopened; acceptable for a single-user app, cheaper than mirroring
// the old "sync everything live" behaviour this fix removes.
export async function getAllNoteContents(userId: string): Promise<Map<string, string>> {
	const q = query(collection(db, 'noteContents'), where('ownerId', '==', userId));
	const snapshot = await getDocs(q);
	const result = new Map<string, string>();
	for (const docSnap of snapshot.docs) {
		result.set(docSnap.id, docSnap.data().content ?? '');
	}
	return result;
}
