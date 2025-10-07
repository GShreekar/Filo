import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Note, Folder } from './types';
import sanitizeFilename from 'sanitize-filename';

export type ExportFormat = 'markdown';

export async function exportNote(note: Note, format: ExportFormat): Promise<void> {
	const safeFilename = sanitizeFilename(note.title) || 'untitled';

	switch (format) {
		case 'markdown':
			exportMarkdownFile(safeFilename, note.content);
			break;
	}
}

export async function exportFolder(
	folder: Folder,
	allNotes: Note[],
	format: ExportFormat
): Promise<void> {
	const folderNotes = allNotes.filter((note) => note.folderId === folder.id);

	if (folderNotes.length === 0) {
		throw new Error('No notes in this folder');
	}

	const safeFolderName = sanitizeFilename(folder.name) || 'folder';

	const zip = new JSZip();
	const folderZip = zip.folder(safeFolderName);

	if (!folderZip) {
		throw new Error('Failed to create folder in ZIP');
	}

	for (const note of folderNotes) {
		const safeFilename = sanitizeFilename(note.title) || 'untitled';

		switch (format) {
			case 'markdown':
				folderZip.file(`${safeFilename}.md`, note.content);
				break;
		}
	}

	const blob = await zip.generateAsync({ type: 'blob' });
	saveAs(blob, `${safeFolderName}.zip`);
}

export async function exportWorkspace(
	folders: Folder[],
	allNotes: Note[],
	format: ExportFormat
): Promise<void> {
	const zip = new JSZip();

	const standaloneNotes = allNotes.filter((note) => !note.folderId);
	if (standaloneNotes.length > 0) {
		const standaloneFolder = zip.folder('Standalone Notes');

		for (const note of standaloneNotes) {
			const safeFilename = sanitizeFilename(note.title) || 'untitled';

			switch (format) {
				case 'markdown':
					standaloneFolder?.file(`${safeFilename}.md`, note.content);
					break;
			}
		}
	}

	for (const folder of folders) {
		const folderNotes = allNotes.filter((note) => note.folderId === folder.id);
		if (folderNotes.length === 0) continue;

		const safeFolderName = sanitizeFilename(folder.name) || 'folder';
		const folderZip = zip.folder(safeFolderName);

		for (const note of folderNotes) {
			const safeFilename = sanitizeFilename(note.title) || 'untitled';

			switch (format) {
				case 'markdown':
					folderZip?.file(`${safeFilename}.md`, note.content);
					break;
			}
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
