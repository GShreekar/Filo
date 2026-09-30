export interface TextStats {
	words: number;
	characters: number;
	// Fractional minutes, 0 for empty content — format for display with
	// formatReadingTime() rather than rounding here, so callers that just
	// want the raw numbers (e.g. tests) aren't stuck with a pre-rounded value.
	readingTimeMinutes: number;
}

const WORDS_PER_MINUTE = 200;

export function computeTextStats(content: string): TextStats {
	const trimmed = content.trim();
	const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;

	return {
		words,
		characters: content.length,
		readingTimeMinutes: words / WORDS_PER_MINUTE
	};
}

export function formatReadingTime(minutes: number): string {
	if (minutes <= 0) return '0 min read';
	if (minutes < 1) return '< 1 min read';
	return `${Math.ceil(minutes)} min read`;
}
