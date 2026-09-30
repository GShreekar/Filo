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
		revision: 0,
		pinnedAt: null,
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
		pinnedAt: null,
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

describe('searchAll — case-insensitive matching against the original text', () => {
	test('is case-insensitive', () => {
		notes.set([makeNote({ id: 'n1', title: 'Shopping List' })]);
		folders.set([]);
		noteContentCache.set(new Map());

		const results = searchAll('shopping');
		expect(results.length).toBe(1);
		expect(results[0].noteResult?.titleMatches[0]?.text).toBe('Shopping');
	});

	test('match offsets stay correct when case-folding would change string length', () => {
		// 'İ'.toLowerCase() is two UTF-16 code units ('i' + a combining dot
		// above) — matching against a lowercased copy of the title would
		// shift every index after it, corrupting the highlighted match text
		// and the generated excerpt for any content that follows.
		notes.set([makeNote({ id: 'n1', title: 'İstanbul notes' })]);
		folders.set([]);
		noteContentCache.set(new Map());

		const results = searchAll('notes');
		expect(results.length).toBe(1);
		const match = results[0].noteResult?.titleMatches[0];
		expect(match?.text).toBe('notes');
		expect(match?.start).toBe(9);
	});

	test('regex metacharacters in the query are matched literally', () => {
		notes.set([makeNote({ id: 'n1', title: 'a (draft) note' })]);
		folders.set([]);
		noteContentCache.set(new Map());

		const results = searchAll('(draft)');
		expect(results.length).toBe(1);
		expect(results[0].noteResult?.titleMatches[0]?.text).toBe('(draft)');
	});
});

describe('searchAll — generateExcerpt respects maxLength', () => {
	test('a longer excerpt window surfaces more context around the match', () => {
		const content = `${'a'.repeat(100)} needle ${'b'.repeat(100)}`;
		notes.set([makeNote({ id: 'n1', title: 'Note' })]);
		folders.set([]);
		noteContentCache.set(new Map([['n1', content]]));

		const results = searchAll('content:needle');
		const excerpt = results[0].noteResult?.excerpt ?? '';
		// Default maxLength (150) can't fit 100 'a's before the match plus
		// the match itself plus trailing context — the excerpt must have
		// been clamped, not left at the content's full length.
		expect(excerpt.length).toBeLessThan(content.length);
		expect(excerpt).toContain('needle');
	});
});

describe('searchAll — word-index prefilter never drops a real match', () => {
	test('excludes notes that plainly cannot match, keeps ones that do', () => {
		notes.set([
			makeNote({ id: 'n1', title: 'Grocery list' }),
			makeNote({ id: 'n2', title: 'Recipe for pancakes' })
		]);
		folders.set([]);
		noteContentCache.set(
			new Map([
				['n1', 'buy eggs and flour'],
				['n2', 'mix flour, milk, and eggs']
			])
		);

		const results = searchAll('content:pancakes');
		expect(results).toHaveLength(0);

		const eggResults = searchAll('content:eggs');
		expect(eggResults.map((r) => r.noteResult?.note.id).sort()).toEqual(['n1', 'n2']);
	});

	test('a multi-word phrase only matches where it appears contiguously', () => {
		notes.set([
			// Has both words, but not adjacent — must not match "buy milk".
			makeNote({ id: 'n1', title: 'Note' }),
			makeNote({ id: 'n2', title: 'Note' })
		]);
		folders.set([]);
		noteContentCache.set(
			new Map([
				['n1', 'buy eggs, then get milk from the store'],
				['n2', 'remember to buy milk today']
			])
		);

		const results = searchAll('content:buy milk');
		expect(results.map((r) => r.noteResult?.note.id)).toEqual(['n2']);
	});

	test('reflects a content edit made after the note was first indexed', () => {
		notes.set([makeNote({ id: 'n1', title: 'Note' })]);
		folders.set([]);
		noteContentCache.set(new Map([['n1', 'original text']]));

		expect(searchAll('content:banana')).toHaveLength(0);

		noteContentCache.set(new Map([['n1', 'original text about a banana']]));
		expect(searchAll('content:banana')).toHaveLength(1);
	});
});
