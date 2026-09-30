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

// --- Word index (prefilter only) ---
//
// searchAll() used to run findMatches() — a regex scan of the FULL title and
// content — against every note on every keystroke, regardless of whether
// that note had any chance of matching. This index narrows the set of notes
// worth scanning without ever being the source of truth for a match: it can
// only produce false positives (a note it lets through turns out not to
// match, caught by the real findMatches() call that still runs afterward),
// never a false negative, so it can't change which results are returned or
// how they're highlighted — only how many notes get fully scanned.
//
// Indexed per note (title + first MAX_INDEXED_CONTENT_LENGTH chars of
// content) and only re-tokenized when that note's own title/content has
// actually changed since the last search — not on every keystroke, and not
// for notes nobody is editing.
const MAX_INDEXED_CONTENT_LENGTH = 20_000;

interface IndexedNote {
	words: Set<string>;
	title: string;
	content: string;
}

const noteWordIndex = new Map<string, IndexedNote>();

// Dropped once a note no longer exists, so the index doesn't grow without
// bound over a long-lived session.
notes.subscribe((allNotes) => {
	const liveIds = new Set(allNotes.map((note) => note.id));
	for (const noteId of noteWordIndex.keys()) {
		if (!liveIds.has(noteId)) noteWordIndex.delete(noteId);
	}
});

function tokenize(text: string): string[] {
	return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function getIndexedWords(noteId: string, title: string, content: string): Set<string> {
	const truncatedContent = content.slice(0, MAX_INDEXED_CONTENT_LENGTH);
	const cached = noteWordIndex.get(noteId);

	if (cached && cached.title === title && cached.content === truncatedContent) {
		return cached.words;
	}

	const words = new Set(tokenize(title).concat(tokenize(truncatedContent)));
	noteWordIndex.set(noteId, { words, title, content: truncatedContent });
	return words;
}

// A note can only contain searchTerm as a literal substring if every "word"
// of searchTerm is itself a substring of some indexed word of that note —
// necessary, not sufficient, which is exactly what a safe prefilter needs.
function couldContainSearchTerm(words: Set<string>, searchTerm: string): boolean {
	const termWords = tokenize(searchTerm);
	if (termWords.length === 0) return true;

	return termWords.every((termWord) => {
		for (const word of words) {
			if (word.includes(termWord)) return true;
		}
		return false;
	});
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
	const searchTerm = parsedQuery.term.trim();

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
			const titleMatches = findMatches(folder.name, searchTerm);

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
			const words = getIndexedWords(note.id, note.title, content);
			if (!couldContainSearchTerm(words, searchTerm)) continue;

			const titleMatches = parsedQuery.contentOnly ? [] : findMatches(note.title, searchTerm);
			const contentMatches = parsedQuery.titleOnly ? [] : findMatches(content, searchTerm);

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

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches case-insensitively against the ORIGINAL text (never a lowercased
// copy) so that start/end indices always line up with the string callers
// slice from. Lowercasing first and matching there is not just an extra
// step — case-folding can change string length for some characters (e.g.
// 'İ'.toLowerCase() is two code units), which silently shifts every match
// index taken from the lowercased copy out from under the original string.
function findMatches(text: string, searchTerm: string): MatchRange[] {
	if (!searchTerm) return [];

	const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
	const matches: MatchRange[] = [];
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		matches.push({
			start: match.index,
			end: match.index + match[0].length,
			text: match[0]
		});
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
	const contextBefore = Math.floor(maxLength / 3);
	const contextAfter = maxLength - contextBefore;
	const start = Math.max(0, firstMatch.start - contextBefore);
	const end = Math.min(content.length, firstMatch.end + contextAfter);

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
