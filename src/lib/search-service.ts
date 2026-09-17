import type { Folder, NoteMeta } from './types';
import { notes, folders, noteContentCache } from './stores';
import { get } from 'svelte/store';

export interface EnhancedSearchResult {
	note: NoteMeta;
	folder: { id: string; name: string } | null;
	score: number;
	matchType: 'title' | 'content' | 'both' | 'recent';
	titleMatches: MatchRange[];
	contentMatches: MatchRange[];
	excerpt: string;
	lastModified: Date;
}

export interface FolderSearchResult {
	folder: Folder;
	score: number;
	matchType: 'folder';
	titleMatches: MatchRange[];
}

export interface CombinedSearchResult {
	type: 'note' | 'folder';
	noteResult?: EnhancedSearchResult;
	folderResult?: FolderSearchResult;
}

export interface MatchRange {
	start: number;
	end: number;
	text: string;
}

// Note bodies aren't part of the live notes list (2.12) — content search
// reads them from this cache instead, which is populated by
// getAllNoteContents() shortly after login and by openNote() for whichever
// note is open. A note whose content hasn't been cached yet (a brief window
// right after sign-in, before the background warm-up fetch resolves)
// contributes no content matches until then; title search is unaffected
// since titles are always part of the live metadata list.
function contentOf(noteId: string, cache: Map<string, string>): string {
	return cache.get(noteId) ?? '';
}

export function searchNotes(
	query: string,
	contentCache: Map<string, string> = get(noteContentCache)
): EnhancedSearchResult[] {
	const allNotes = get(notes);
	const allFolders = get(folders);

	if (!query.trim()) {
		return getRecentNotes(allNotes, allFolders, contentCache);
	}

	const searchTerm = query.toLowerCase().trim();
	const results: EnhancedSearchResult[] = [];

	for (const note of allNotes) {
		const content = contentOf(note.id, contentCache);
		const titleMatches = findMatches(note.title.toLowerCase(), searchTerm);
		const contentMatches = findMatches(content.toLowerCase(), searchTerm);

		if (titleMatches.length > 0 || contentMatches.length > 0) {
			const folder = allFolders.find((f) => f.id === note.folderId);
			const matchType =
				titleMatches.length > 0 && contentMatches.length > 0
					? 'both'
					: titleMatches.length > 0
						? 'title'
						: 'content';

			results.push({
				note,
				folder: folder ? { id: folder.id, name: getFolderPath(folder.id, allFolders) } : null,
				score: calculateScore(titleMatches, contentMatches, note.title, note.updatedAt),
				matchType,
				titleMatches: titleMatches.map((match) => ({
					...match,
					text: note.title.substring(match.start, match.end)
				})),
				contentMatches: contentMatches.map((match) => ({
					...match,
					text: content.substring(match.start, match.end)
				})),
				excerpt: generateExcerpt(content, contentMatches, searchTerm),
				lastModified: note.updatedAt
			});
		}
	}

	return results.sort((a, b) => b.score - a.score);
}

export function searchAll(
	query: string,
	contentCache: Map<string, string> = get(noteContentCache)
): CombinedSearchResult[] {
	const allNotes = get(notes);
	const allFolders = get(folders);

	if (!query.trim()) {
		return getRecentNotes(allNotes, allFolders, contentCache).map((noteResult) => ({
			type: 'note' as const,
			noteResult
		}));
	}

	const parsedQuery = parseSearchQuery(query);
	const searchTerm = parsedQuery.term.toLowerCase().trim();

	// A bare "folder:"/"title:"/"content:" with nothing after the colon
	// leaves an empty term here. Without this check it falls through to
	// findMatches('', ...) below, which used to match at every character
	// position — one MatchRange per character of every note's full content.
	// Treat it the same as an empty query.
	if (!searchTerm) {
		return getRecentNotes(allNotes, allFolders, contentCache).map((noteResult) => ({
			type: 'note' as const,
			noteResult
		}));
	}

	const results: CombinedSearchResult[] = [];

	if (!parsedQuery.titleOnly && !parsedQuery.contentOnly) {
		for (const folder of allFolders) {
			const titleMatches = findMatches(folder.name.toLowerCase(), searchTerm);

			if (titleMatches.length > 0) {
				results.push({
					type: 'folder',
					folderResult: {
						folder,
						score: titleMatches.length * 15,
						matchType: 'folder',
						titleMatches: titleMatches.map((match) => ({
							...match,
							text: folder.name.substring(match.start, match.end)
						}))
					}
				});
			}
		}
	}

	if (!parsedQuery.folderOnly) {
		for (const note of allNotes) {
			const content = parsedQuery.titleOnly ? '' : contentOf(note.id, contentCache);
			const titleMatches = parsedQuery.contentOnly
				? []
				: findMatches(note.title.toLowerCase(), searchTerm);
			const contentMatches = parsedQuery.titleOnly
				? []
				: findMatches(content.toLowerCase(), searchTerm);

			if (titleMatches.length > 0 || contentMatches.length > 0) {
				const folder = allFolders.find((f) => f.id === note.folderId);
				const matchType =
					titleMatches.length > 0 && contentMatches.length > 0
						? 'both'
						: titleMatches.length > 0
							? 'title'
							: 'content';

				results.push({
					type: 'note',
					noteResult: {
						note,
						folder: folder ? { id: folder.id, name: getFolderPath(folder.id, allFolders) } : null,
						score: calculateScore(titleMatches, contentMatches, note.title, note.updatedAt),
						matchType,
						titleMatches: titleMatches.map((match) => ({
							...match,
							text: note.title.substring(match.start, match.end)
						})),
						contentMatches: contentMatches.map((match) => ({
							...match,
							text: content.substring(match.start, match.end)
						})),
						excerpt: generateExcerpt(content, contentMatches, searchTerm),
						lastModified: note.updatedAt
					}
				});
			}
		}
	}

	return results.sort((a, b) => {
		if (a.type === 'folder' && b.type === 'note') return -1;
		if (a.type === 'note' && b.type === 'folder') return 1;

		const scoreA = a.folderResult?.score || a.noteResult?.score || 0;
		const scoreB = b.folderResult?.score || b.noteResult?.score || 0;
		return scoreB - scoreA;
	});
}

interface ParsedQuery {
	term: string;
	folderOnly: boolean;
	titleOnly: boolean;
	contentOnly: boolean;
}

function parseSearchQuery(query: string): ParsedQuery {
	let term = query;
	let folderOnly = false;
	let titleOnly = false;
	let contentOnly = false;

	if (term.startsWith('folder:')) {
		folderOnly = true;
		term = term.substring(7);
	} else if (term.startsWith('title:')) {
		titleOnly = true;
		term = term.substring(6);
	} else if (term.startsWith('content:')) {
		contentOnly = true;
		term = term.substring(8);
	}

	return { term, folderOnly, titleOnly, contentOnly };
}
export function getRecentNotes(
	allNotes: NoteMeta[],
	allFolders: Folder[],
	contentCache: Map<string, string> = get(noteContentCache),
	limit = 10
): EnhancedSearchResult[] {
	return allNotes
		.slice()
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
		.slice(0, limit)
		.map((note) => {
			const folder = allFolders.find((f) => f.id === note.folderId);
			return {
				note,
				folder: folder ? { id: folder.id, name: getFolderPath(folder.id, allFolders) } : null,
				score: 0,
				matchType: 'recent' as const,
				titleMatches: [],
				contentMatches: [],
				excerpt: generateExcerpt(contentOf(note.id, contentCache), [], ''),
				lastModified: note.updatedAt
			};
		});
}

function findMatches(text: string, searchTerm: string): MatchRange[] {
	// An empty needle matches at every index; without this guard the loop
	// below would produce one MatchRange per character of text instead of
	// no matches. Belt-and-suspenders alongside the searchAll()-level check.
	if (!searchTerm) return [];

	const matches: MatchRange[] = [];
	let index = 0;

	while (index < text.length) {
		const found = text.indexOf(searchTerm, index);
		if (found === -1) break;

		matches.push({
			start: found,
			end: found + searchTerm.length,
			text: text.substring(found, found + searchTerm.length)
		});

		index = found + 1;
	}

	return matches;
}

function calculateScore(
	titleMatches: MatchRange[],
	contentMatches: MatchRange[],
	title: string,
	lastModified?: Date
): number {
	let score = 0;

	score += titleMatches.length * 10;

	score += contentMatches.length * 2;

	if (titleMatches.some((match) => match.start === 0)) {
		score += 5;
	}

	if (titleMatches.length > 0 && title.length < 50) {
		score += 3;
	}

	if (lastModified) {
		const now = new Date();
		const ageInDays = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
		const recencyBonus = Math.max(0, 5 * (1 - ageInDays / 30));
		score += recencyBonus;
	}

	return score;
}

function generateExcerpt(
	content: string,
	matches: MatchRange[],
	searchTerm: string,
	maxLength = 150
): string {
	if (matches.length === 0) {
		return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
	}

	const firstMatch = matches[0];
	const start = Math.max(0, firstMatch.start - 50);
	const end = Math.min(content.length, firstMatch.end + 100);

	let excerpt = content.substring(start, end);

	if (start > 0) excerpt = '...' + excerpt;
	if (end < content.length) excerpt = excerpt + '...';

	return excerpt;
}

export function highlightText(text: string, matches: MatchRange[]): string {
	if (matches.length === 0) return escapeHtml(text);

	let result = '';
	let lastIndex = 0;

	for (const match of matches) {
		result += escapeHtml(text.substring(lastIndex, match.start));

		result += `<mark class="bg-yellow-200 dark:bg-yellow-600 rounded px-1">${escapeHtml(text.substring(match.start, match.end))}</mark>`;

		lastIndex = match.end;
	}

	result += escapeHtml(text.substring(lastIndex));

	return result;
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

export function getFolderPath(folderId: string, allFolders: Folder[]): string {
	const folder = allFolders.find((f) => f.id === folderId);
	if (!folder) return '';

	if (folder.parentId === null) {
		return folder.name;
	}

	const parentPath = getFolderPath(folder.parentId, allFolders);
	return `${parentPath} / ${folder.name}`;
}

export function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMinutes < 1) return 'Just now';
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString();
}
