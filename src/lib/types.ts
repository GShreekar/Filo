export interface Folder {
	id: string;
	name: string;
	createdAt: Date;
	parentId: string | null;
	ownerId: string;
}

// What the sidebar/search list actually needs. Deliberately excludes
// `content` (see 2.12 in docs/AUDIT.md) — a note's body lives in a separate
// `noteContents/{id}` doc and is fetched only for the note that's open, plus
// a one-time batched read used to warm the search cache. This is what the
// live `notes` store holds.
export interface NoteMeta {
	id: string;
	title: string;
	createdAt: Date;
	updatedAt: Date;
	folderId: string | null;
	ownerId: string;
	// Bumped on every write (firebase-service.ts's updateNote). Lets a second
	// tab/session notice its in-memory copy is stale before it overwrites a
	// newer save with one made from older content (see conflict-store.ts).
	revision: number;
}

// A note with its body attached — what the editor and export need. Always a
// superset of NoteMeta, so anywhere a NoteMeta is expected, a Note works too.
export interface Note extends NoteMeta {
	content: string;
}
