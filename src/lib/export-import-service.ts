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
	format: ExportFormat,
	onProgress?: (completed: number, total: number, currentItem: string) => void
): Promise<void> {
	const folderNotes = allNotes.filter((note) => note.folderId === folder.id);

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

	switch (format) {
		case 'markdown':
			for (let i = 0; i < folderNotes.length; i++) {
				const note = folderNotes[i];
				const safeFilename = sanitizeFilename(note.title) || 'untitled';
				folderZip.file(`${safeFilename}.md`, contents.get(note.id) ?? '');

				if (onProgress) {
					onProgress(i + 1, folderNotes.length, note.title);
				}
			}
			break;
		case 'pdf':
			const pdfResults = await generateFolderPDFs(
				folderNotes.map((note) => ({ title: note.title, content: contents.get(note.id) ?? '' })),
				onProgress
			);

			for (const { title, pdfData } of pdfResults) {
				const safeFilename = sanitizeFilename(title) || 'untitled';
				folderZip.file(`${safeFilename}.pdf`, pdfData);
			}
			break;
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

		for (const note of standaloneNotes) {
			const safeFilename = sanitizeFilename(note.title) || 'untitled';
			standaloneFolder?.file(`${safeFilename}.md`, contents.get(note.id) ?? '');
		}
	}

	function createFolderInZip(folder: Folder, parentZipFolder: JSZip | null = null): JSZip | null {
		const safeFolderName = sanitizeFilename(folder.name) || 'folder';
		const folderZip = parentZipFolder
			? parentZipFolder.folder(safeFolderName)
			: zip.folder(safeFolderName);

		const folderNotes = allNotes.filter((note) => note.folderId === folder.id);
		for (const note of folderNotes) {
			const safeFilename = sanitizeFilename(note.title) || 'untitled';
			folderZip?.file(`${safeFilename}.md`, contents.get(note.id) ?? '');
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

export async function importMarkdownFiles(
	files: FileList,
	folderId: string | null,
	createNoteFn: (folderId: string | null, title: string, content: string) => Promise<string>
): Promise<ImportResult> {
	const result: ImportResult = {
		success: 0,
		failed: 0,
		errors: []
	};

	for (const file of Array.from(files)) {
		if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
			result.failed++;
			result.errors.push(`${file.name}: Not a markdown file`);
			continue;
		}

		try {
			const content = await file.text();
			const title = file.name.replace(/\.(md|markdown)$/, '');

			await createNoteFn(folderId, title, content);
			result.success++;
		} catch (error) {
			result.failed++;
			result.errors.push(
				`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	return result;
}
