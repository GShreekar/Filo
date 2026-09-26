import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { NoteMeta, Folder } from './types';
import sanitizeFilename from 'sanitize-filename';
import { generateNotePDF, generateFolderPDFs } from './pdf-service';
import { getNoteContent, getAllNoteContents } from './firebase-service';
import { requireUserId } from './auth';

export type ExportFormat = 'markdown' | 'pdf';

// Note bodies live in their own collection now (2.12), not on NoteMeta, so
// every export path below fetches whatever content it needs rather than
// assuming it's already attached to the note objects it was passed.

// Two notes titled the same (e.g. several "Untitled Note"s) used to overwrite
// each other silently — JSZip's .file() doesn't error on a duplicate path, it
// just replaces the earlier entry. Scoped per call site (per zip folder),
// matching how a real filesystem only conflicts within one directory.
function uniqueFilename(title: string, used: Set<string>): string {
	const base = sanitizeFilename(title) || 'untitled';
	let candidate = base;
	let suffix = 2;
	while (used.has(candidate.toLowerCase())) {
		candidate = `${base} (${suffix})`;
		suffix++;
	}
	used.add(candidate.toLowerCase());
	return candidate;
}

export async function exportNote(note: NoteMeta, format: ExportFormat): Promise<void> {
	const safeFilename = sanitizeFilename(note.title) || 'untitled';
	const content = await getNoteContent(note.id);

	switch (format) {
		case 'markdown':
			exportMarkdownFile(safeFilename, content);
			break;
		case 'pdf':
			await exportPDFFile(safeFilename, note.title, content);
			break;
	}
}

export async function exportFolder(
	folder: Folder,
	allNotes: NoteMeta[],
	allFolders: Folder[],
	format: ExportFormat,
	onProgress?: (completed: number, total: number, currentItem: string) => void
): Promise<void> {
	// Every note under this folder, including subfolders — this used to only
	// grab direct children, so a folder with subfolders silently exported
	// only part of what the sidebar shows nested under it. Flattened into one
	// zip folder rather than mirroring the subfolder structure, so markdown
	// and PDF exports stay structurally identical here; exportWorkspace()
	// below is the path that preserves full hierarchy.
	function collectDescendantFolderIds(parentId: string): string[] {
		const children = allFolders.filter((f) => f.parentId === parentId);
		return children.flatMap((child) => [child.id, ...collectDescendantFolderIds(child.id)]);
	}
	const folderIds = new Set([folder.id, ...collectDescendantFolderIds(folder.id)]);
	const folderNotes = allNotes.filter((note) => note.folderId && folderIds.has(note.folderId));

	if (folderNotes.length === 0) {
		throw new Error('No notes in this folder');
	}

	const contents = await getAllNoteContents(requireUserId());

	const safeFolderName = sanitizeFilename(folder.name) || 'folder';

	const zip = new JSZip();
	const folderZip = zip.folder(safeFolderName);

	if (!folderZip) {
		throw new Error('Failed to create folder in ZIP');
	}

	const usedNames = new Set<string>();

	switch (format) {
		case 'markdown':
			for (let i = 0; i < folderNotes.length; i++) {
				const note = folderNotes[i];
				const filename = uniqueFilename(note.title, usedNames);
				folderZip.file(`${filename}.md`, contents.get(note.id) ?? '');

				if (onProgress) {
					onProgress(i + 1, folderNotes.length, note.title);
				}
			}
			break;
		case 'pdf': {
			const pdfResults = await generateFolderPDFs(
				folderNotes.map((note) => ({ title: note.title, content: contents.get(note.id) ?? '' })),
				onProgress
			);

			for (const { title, pdfData } of pdfResults) {
				const filename = uniqueFilename(title, usedNames);
				folderZip.file(`${filename}.pdf`, pdfData);
			}
			break;
		}
	}

	const blob = await zip.generateAsync({ type: 'blob' });
	saveAs(blob, `${safeFolderName}.zip`);
}

export async function exportWorkspace(
	folders: Folder[],
	allNotes: NoteMeta[],
	format: ExportFormat
): Promise<void> {
	if (format !== 'markdown') {
		throw new Error('Workspace export only supports markdown format');
	}

	const contents = await getAllNoteContents(requireUserId());

	const zip = new JSZip();

	const standaloneNotes = allNotes.filter((note) => !note.folderId);
	if (standaloneNotes.length > 0) {
		const standaloneFolder = zip.folder('Standalone Notes');
		const usedNames = new Set<string>();

		for (const note of standaloneNotes) {
			const filename = uniqueFilename(note.title, usedNames);
			standaloneFolder?.file(`${filename}.md`, contents.get(note.id) ?? '');
		}
	}

	function createFolderInZip(folder: Folder, parentZipFolder: JSZip | null = null): JSZip | null {
		const safeFolderName = sanitizeFilename(folder.name) || 'folder';
		const folderZip = parentZipFolder
			? parentZipFolder.folder(safeFolderName)
			: zip.folder(safeFolderName);

		const folderNotes = allNotes.filter((note) => note.folderId === folder.id);
		const usedNames = new Set<string>();
		for (const note of folderNotes) {
			const filename = uniqueFilename(note.title, usedNames);
			folderZip?.file(`${filename}.md`, contents.get(note.id) ?? '');
		}

		const subfolders = folders.filter((f) => f.parentId === folder.id);
		for (const subfolder of subfolders) {
			createFolderInZip(subfolder, folderZip);
		}

		return folderZip;
	}

	const rootFolders = folders.filter((folder) => folder.parentId === null);
	for (const folder of rootFolders) {
		createFolderInZip(folder);
	}

	// A note whose folderId points at a folder that no longer exists (e.g. a
	// partial/interrupted delete, or data edited outside the app) used to
	// land in neither standaloneNotes nor any folder walk above, and silently
	// vanish from the export with no indication anything was skipped.
	const validFolderIds = new Set(folders.map((f) => f.id));
	const orphanedNotes = allNotes.filter(
		(note) => note.folderId && !validFolderIds.has(note.folderId)
	);
	if (orphanedNotes.length > 0) {
		const orphanedZipFolder = zip.folder('Orphaned Notes (folder no longer exists)');
		const usedNames = new Set<string>();
		for (const note of orphanedNotes) {
			const filename = uniqueFilename(note.title, usedNames);
			orphanedZipFolder?.file(`${filename}.md`, contents.get(note.id) ?? '');
		}
	}

	const blob = await zip.generateAsync({ type: 'blob' });
	const timestamp = new Date().toISOString().split('T')[0];
	saveAs(blob, `filo-export-${timestamp}.zip`);
}

function exportMarkdownFile(filename: string, content: string): void {
	const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
	saveAs(blob, `${filename}.md`);
}

async function exportPDFFile(filename: string, title: string, content: string): Promise<void> {
	const pdfData = await generateNotePDF(title, content);
	const blob = new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' });
	saveAs(blob, `${filename}.pdf`);
}

export interface ImportResult {
	success: number;
	failed: number;
	errors: string[];
}

type CreateNoteFn = (folderId: string | null, title: string, content: string) => Promise<string>;
type CreateFolderFn = (name: string, parentId: string | null) => Promise<string>;

// Handles both loose .md/.markdown files and .zip archives — including
// Filo's own folder/workspace export output, recreating the folder structure
// inside the zip rather than dumping every note into one target folder.
export async function importFiles(
	files: FileList,
	targetFolderId: string | null,
	createNoteFn: CreateNoteFn,
	createFolderFn: CreateFolderFn
): Promise<ImportResult> {
	const result: ImportResult = {
		success: 0,
		failed: 0,
		errors: []
	};

	for (const file of Array.from(files)) {
		if (file.name.endsWith('.zip')) {
			await importZipFile(file, targetFolderId, createNoteFn, createFolderFn, result);
		} else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
			await importSingleMarkdownFile(file, targetFolderId, createNoteFn, result);
		} else {
			result.failed++;
			result.errors.push(`${file.name}: Not a markdown file or zip archive`);
		}
	}

	return result;
}

async function importSingleMarkdownFile(
	file: File,
	targetFolderId: string | null,
	createNoteFn: CreateNoteFn,
	result: ImportResult
): Promise<void> {
	try {
		const content = await file.text();
		const title = file.name.replace(/\.(md|markdown)$/, '');
		await createNoteFn(targetFolderId, title, content);
		result.success++;
	} catch (error) {
		result.failed++;
		result.errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

async function importZipFile(
	file: File,
	targetFolderId: string | null,
	createNoteFn: CreateNoteFn,
	createFolderFn: CreateFolderFn,
	result: ImportResult
): Promise<void> {
	try {
		const zip = await JSZip.loadAsync(file);

		// Memoized by zip-internal directory path, so the same subfolder is
		// only created once even though many files inside it each need to
		// resolve it.
		const folderIdByPath = new Map<string, string | null>([['', targetFolderId]]);

		async function resolveFolderId(dirPath: string): Promise<string | null> {
			const cached = folderIdByPath.get(dirPath);
			if (cached !== undefined) return cached;

			const segments = dirPath.split('/').filter(Boolean);
			let currentPath = '';
			let parentId = targetFolderId;

			for (const segment of segments) {
				currentPath = currentPath ? `${currentPath}/${segment}` : segment;
				const existing = folderIdByPath.get(currentPath);
				if (existing !== undefined) {
					parentId = existing;
					continue;
				}
				parentId = await createFolderFn(segment, parentId);
				folderIdByPath.set(currentPath, parentId);
			}

			return parentId;
		}

		const entries = Object.values(zip.files).filter(
			(entry) => !entry.dir && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))
		);

		for (const entry of entries) {
			try {
				const content = await entry.async('string');
				const parts = entry.name.split('/');
				const filename = parts.pop() ?? entry.name;
				const dirPath = parts.join('/');
				const title = filename.replace(/\.(md|markdown)$/, '');

				const folderId = await resolveFolderId(dirPath);
				await createNoteFn(folderId, title, content);
				result.success++;
			} catch (error) {
				result.failed++;
				result.errors.push(
					`${entry.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}

		if (entries.length === 0) {
			result.failed++;
			result.errors.push(`${file.name}: No markdown files found in archive`);
		}
	} catch (error) {
		result.failed++;
		result.errors.push(
			`${file.name}: ${error instanceof Error ? error.message : 'Failed to read zip file'}`
		);
	}
}
