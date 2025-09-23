export interface Folder {
	id: string;
	name: string;
	createdAt: Date;
}

export interface Note {
	id: string;
	title: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	folderId: string | null;
}

export interface SearchResult {
	note: Note;
	folder: Folder;
	matchType: 'title' | 'content';
}
