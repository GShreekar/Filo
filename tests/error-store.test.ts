import { describe, test, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { errors, showError, clearError } from '../src/lib/error-store';

describe('showError — unique toast IDs', () => {
	beforeEach(() => {
		errors.set([]);
	});

	test('two toasts raised in the same millisecond get distinct IDs', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1234567890);

		showError('first');
		showError('second');

		const [first, second] = get(errors);
		expect(first.id).not.toBe(second.id);

		vi.restoreAllMocks();
	});

	test('dismissing one same-millisecond toast leaves the other visible', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1234567890);

		showError('first');
		showError('second');

		const [first, second] = get(errors);
		clearError(first.id);

		const remaining = get(errors);
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).toBe(second.id);

		vi.restoreAllMocks();
	});
});
