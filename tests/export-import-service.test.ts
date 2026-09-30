// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';

vi.mock('../src/lib/firebase-service', () => ({
	getNoteContent: vi.fn(),
	getAllNoteContents: vi.fn()
}));
vi.mock('../src/lib/pdf-service', () => ({
	generateNotePDF: vi.fn(),
	generateFolderPDFs: vi.fn()
}));
vi.mock('../src/lib/auth', () => ({
	requireUserId: vi.fn(() => 'owner-uid')
}));

let savedBlob: Blob | null = null;
vi.mock('file-saver', () => ({
	saveAs: (blob: Blob) => {
		savedBlob = blob;
	}
}));

import { getAllNoteContents } from '../src/lib/firebase-service';
import {
	exportFolder,
	exportWorkspace,
	importFiles,
	type ImportResult
} from '../src/lib/export-import-service';
import type { Folder, NoteMeta } from '../src/lib/types';

function makeFolder(overrides: Partial<Folder> = {}): Folder {
	return {
		id: 'f1',
		name: 'Folder',
		parentId: null,
		ownerId: 'owner-uid',
		createdAt: new Date(),
		...overrides
	};
}

function makeNote(overrides: Partial<NoteMeta> = {}): NoteMeta {
	return {
		id: 'n1',
		title: 'Note',
		folderId: null,
		ownerId: 'owner-uid',
		createdAt: new Date(),
		updatedAt: new Date(),
		revision: 0,
		...overrides
	};
}

async function loadSavedZip(): Promise<JSZip> {
	if (!savedBlob) throw new Error('saveAs was never called');
	return JSZip.loadAsync(await savedBlob.arrayBuffer());
}

describe('exportFolder', () => {
	beforeEach(() => {
		savedBlob = null;
		vi.mocked(getAllNoteContents).mockReset();
	});

	test('includes notes from subfolders, not just direct children', async () => {
		const root = makeFolder({ id: 'root', name: 'Root' });
		const child = makeFolder({ id: 'child', name: 'Child', parentId: 'root' });
		const notes = [
			makeNote({ id: 'n1', title: 'Top note', folderId: 'root' }),
			makeNote({ id: 'n2', title: 'Nested note', folderId: 'child' })
		];

		vi.mocked(getAllNoteContents).mockResolvedValue(
			new Map([
				['n1', 'top content'],
				['n2', 'nested content']
			])
		);

		await exportFolder(root, notes, [root, child], 'markdown');

		const zip = await loadSavedZip();
		const names = Object.keys(zip.files);
		expect(names.some((n) => n.endsWith('Top note.md'))).toBe(true);
		expect(names.some((n) => n.endsWith('Nested note.md'))).toBe(true);
	});

	test('gives duplicate titles unique filenames instead of one overwriting the other', async () => {
		const root = makeFolder({ id: 'root', name: 'Root' });
		const notes = [
			makeNote({ id: 'n1', title: 'Untitled', folderId: 'root' }),
			makeNote({ id: 'n2', title: 'Untitled', folderId: 'root' })
		];

		vi.mocked(getAllNoteContents).mockResolvedValue(
			new Map([
				['n1', 'first'],
				['n2', 'second']
			])
		);

		await exportFolder(root, notes, [root], 'markdown');

		const zip = await loadSavedZip();
		const names = Object.keys(zip.files).filter((n) => n.endsWith('.md'));
		expect(names).toHaveLength(2);
		expect(names.some((n) => n.includes('(2)'))).toBe(true);
	});

	test('throws when the folder has no notes anywhere in its subtree', async () => {
		const root = makeFolder({ id: 'root', name: 'Root' });
		await expect(exportFolder(root, [], [root], 'markdown')).rejects.toThrow('No notes');
	});
});

describe('exportWorkspace', () => {
	beforeEach(() => {
		savedBlob = null;
		vi.mocked(getAllNoteContents).mockReset();
	});

	test('places a note whose folder no longer exists into an orphaned-notes section instead of dropping it', async () => {
		const notes = [makeNote({ id: 'n1', title: 'Ghost note', folderId: 'deleted-folder' })];
		vi.mocked(getAllNoteContents).mockResolvedValue(new Map([['n1', 'ghost content']]));

		await exportWorkspace([], notes, 'markdown');

		const zip = await loadSavedZip();
		const names = Object.keys(zip.files);
		expect(names.some((n) => n.includes('Orphaned Notes') && n.endsWith('Ghost note.md'))).toBe(
			true
		);
	});

	test('reconstructs the full folder hierarchy, not just top-level folders', async () => {
		const parent = makeFolder({ id: 'parent', name: 'Parent', parentId: null });
		const child = makeFolder({ id: 'child', name: 'Child', parentId: 'parent' });
		const notes = [makeNote({ id: 'n1', title: 'Deep note', folderId: 'child' })];
		vi.mocked(getAllNoteContents).mockResolvedValue(new Map([['n1', 'deep content']]));

		await exportWorkspace([parent, child], notes, 'markdown');

		const zip = await loadSavedZip();
		const names = Object.keys(zip.files);
		expect(names.some((n) => n.includes('Parent/Child/') && n.endsWith('Deep note.md'))).toBe(true);
	});

	test('rejects a non-markdown format', async () => {
		await expect(exportWorkspace([], [], 'pdf')).rejects.toThrow('only supports markdown');
	});
});

describe('importFiles', () => {
	function makeMarkdownFile(name: string, content: string): File {
		return new File([content], name, { type: 'text/markdown' });
	}

	test('imports a loose markdown file, deriving the title from its filename', async () => {
		const createNoteFn = vi.fn().mockResolvedValue('new-id');
		const createFolderFn = vi.fn();
		const file = makeMarkdownFile('My Note.md', '# Hello');

		const result = await importFiles(
			[file] as unknown as FileList,
			'target-folder',
			createNoteFn,
			createFolderFn
		);

		expect(result).toEqual<ImportResult>({ success: 1, failed: 0, errors: [] });
		expect(createNoteFn).toHaveBeenCalledWith('target-folder', 'My Note', '# Hello');
	});

	test('rejects a file that is neither markdown nor zip', async () => {
		const createNoteFn = vi.fn();
		const createFolderFn = vi.fn();
		const file = new File(['data'], 'image.png');

		const result = await importFiles(
			[file] as unknown as FileList,
			null,
			createNoteFn,
			createFolderFn
		);

		expect(result.success).toBe(0);
		expect(result.failed).toBe(1);
		expect(result.errors[0]).toContain('Not a markdown file');
		expect(createNoteFn).not.toHaveBeenCalled();
	});

	test('one failing file does not stop the rest of the batch from importing', async () => {
		const createNoteFn = vi
			.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce('ok-id');
		const createFolderFn = vi.fn();

		const files = [makeMarkdownFile('bad.md', 'x'), makeMarkdownFile('good.md', 'y')];

		const result = await importFiles(
			files as unknown as FileList,
			null,
			createNoteFn,
			createFolderFn
		);

		expect(result.success).toBe(1);
		expect(result.failed).toBe(1);
		expect(result.errors[0]).toContain('bad.md');
	});

	test('reconstructs nested folder structure from a zip archive, reusing a folder for every file under it', async () => {
		const zip = new JSZip();
		zip.file('Projects/Ideas/note-a.md', 'content a');
		zip.file('Projects/Ideas/note-b.md', 'content b');
		zip.file('Projects/note-c.md', 'content c');
		const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
		const zipFile = new File([zipBuffer], 'export.zip');

		let nextFolderId = 0;
		const createFolderFn = vi.fn(async (name: string) => `folder-${name}-${nextFolderId++}`);
		const createNoteFn = vi.fn().mockResolvedValue('note-id');

		const result = await importFiles(
			[zipFile] as unknown as FileList,
			null,
			createNoteFn,
			createFolderFn
		);

		expect(result).toEqual<ImportResult>({ success: 3, failed: 0, errors: [] });
		// "Projects" is created once and reused for note-c.md, not once per file.
		expect(createFolderFn).toHaveBeenCalledTimes(2);
		expect(createFolderFn).toHaveBeenCalledWith('Projects', null);
		expect(createFolderFn).toHaveBeenCalledWith('Ideas', expect.stringContaining('Projects'));
	});

	test('reports a zip with no markdown files inside as a failure', async () => {
		const zip = new JSZip();
		zip.file('image.png', 'not markdown');
		const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
		const zipFile = new File([zipBuffer], 'export.zip');

		const result = await importFiles([zipFile] as unknown as FileList, null, vi.fn(), vi.fn());

		expect(result.success).toBe(0);
		expect(result.failed).toBe(1);
		expect(result.errors[0]).toContain('No markdown files found');
	});
});
