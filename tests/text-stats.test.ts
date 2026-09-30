import { describe, test, expect } from 'vitest';
import { computeTextStats, formatReadingTime } from '../src/lib/text-stats';

describe('computeTextStats', () => {
	test('empty content has zero words, characters, and reading time', () => {
		expect(computeTextStats('')).toEqual({ words: 0, characters: 0, readingTimeMinutes: 0 });
	});

	test('whitespace-only content counts as no words but still counts characters', () => {
		const stats = computeTextStats('   \n\t  ');
		expect(stats.words).toBe(0);
		expect(stats.characters).toBe(7);
	});

	test('counts words split on any run of whitespace, including newlines', () => {
		const stats = computeTextStats('hello   world\nfoo\tbar');
		expect(stats.words).toBe(4);
	});

	test('counts characters including markdown syntax and spaces', () => {
		const stats = computeTextStats('# Heading');
		expect(stats.characters).toBe(9);
	});

	test('leading/trailing whitespace does not inflate the word count', () => {
		const stats = computeTextStats('  one two three  ');
		expect(stats.words).toBe(3);
	});

	test('reading time scales with word count at 200 words/minute', () => {
		const stats = computeTextStats(Array(400).fill('word').join(' '));
		expect(stats.words).toBe(400);
		expect(stats.readingTimeMinutes).toBe(2);
	});
});

describe('formatReadingTime', () => {
	test('zero minutes reads as "0 min read"', () => {
		expect(formatReadingTime(0)).toBe('0 min read');
	});

	test('anything under a minute reads as "< 1 min read"', () => {
		expect(formatReadingTime(0.3)).toBe('< 1 min read');
	});

	test('rounds up to the nearest whole minute', () => {
		expect(formatReadingTime(1.1)).toBe('2 min read');
		expect(formatReadingTime(2.0)).toBe('2 min read');
	});
});
