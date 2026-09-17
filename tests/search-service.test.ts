import { describe, test, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { notes, folders, noteContentCache } from '../src/lib/stores';
import { searchAll } from '../src/lib/search-service';
import type { NoteMeta, Folder } from '../src/lib/types';

function makeNote(overrides: Partial<NoteMeta> = {}): NoteMeta {
	return {
		id: 'n1',
		title: 'Untitled',
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		folderId: null,
		ownerId: 'owner',
		...overrides
	};
}

function makeFolder(overrides: Partial<Folder> = {}): Folder {
	return {
		id: 'f1',
		name: 'Folder',
		createdAt: new Date('2026-01-01'),
		parentId: null,
		ownerId: 'owner',
		...overrides
	};
}

describe('searchAll — bare prefix with no term', () => {
	beforeEach(() => {
		// A few notes with meaningfully long cached content, so a
		// per-character scan would produce a very large (and slow) match
		// list if the empty-term guard regressed.
		notes.set([
			makeNote({ id: 'n1', title: 'Shopping list' }),
			makeNote({ id: 'n2', title: 'Recipe' })
		]);
		folders.set([makeFolder({ id: 'f1', name: 'Personal' })]);
		noteContentCache.set(
			new Map([
				['n1', 'x'.repeat(5000)],
				['n2', 'y'.repeat(5000)]
			])
		);
	});

	test('"content:" alone returns recent notes, not a per-character match list', () => {
		const results = searchAll('content:');

		expect(results.every((r) => r.type === 'note')).toBe(true);
		expect(results.length).toBeLessThanOrEqual(get(notes).length);
		for (const r of results) {
			expect(r.noteResult?.contentMatches.length ?? 0).toBe(0);
		}
	});

	test('"title:" alone returns recent notes, not a per-character match list', () => {
		const results = searchAll('title:');
		for (const r of results) {
			expect(r.noteResult?.titleMatches.length ?? 0).toBe(0);
		}
	});

	test('"folder:" alone returns recent notes, no folder results', () => {
		const results = searchAll('folder:');
		expect(results.some((r) => r.type === 'folder')).toBe(false);
	});

	test('a real content query still matches normally, via the content cache', () => {
		notes.set([makeNote({ id: 'n1', title: 'Shopping list' })]);
		noteContentCache.set(new Map([['n1', 'buy milk and eggs']]));

		const results = searchAll('content:milk');
		expect(results.length).toBe(1);
		expect(results[0].noteResult?.contentMatches.length).toBeGreaterThan(0);
	});

	test('a note not yet in the content cache contributes no content matches', () => {
		notes.set([makeNote({ id: 'n1', title: 'Shopping list' })]);
		noteContentCache.set(new Map()); // cache not warmed yet

		const results = searchAll('content:milk');
		expect(results.length).toBe(0);
	});
});
