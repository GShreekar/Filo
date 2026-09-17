// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { renderMarkdown, resetMarkdownRenderer } from '../src/lib/markdown-renderer';

describe('renderMarkdown sanitizes its output', () => {
	test('strips a script tag', () => {
		const out = renderMarkdown('hi\n\n<script>fetch("http://169.254.169.254/")</script>');
		expect(out).not.toContain('<script');
	});

	test('strips an onerror handler', () => {
		const out = renderMarkdown('<img src=x onerror="fetch(1)">');
		expect(out).not.toContain('onerror');
	});

	test('strips a javascript: link', () => {
		const out = renderMarkdown('<a href="javascript:alert(1)">click</a>');
		expect(out).not.toContain('javascript:');
	});

	test('strips an iframe', () => {
		const out = renderMarkdown('<iframe src="http://10.0.0.1/admin"></iframe>');
		expect(out).not.toContain('<iframe');
	});

	test('strips an injected style block', () => {
		const out = renderMarkdown('<style>@import url(http://evil.example/x.css);</style>\n\ntext');
		expect(out).not.toContain('<style');
	});

	test('strips an injected link tag', () => {
		const out = renderMarkdown('<link rel="stylesheet" href="http://evil.example/x.css">\n\ntext');
		expect(out).not.toContain('<link');
	});

	test('keeps ordinary markdown output', () => {
		const out = renderMarkdown('# Title\n\nSome **bold** text with `code`.');
		expect(out).toContain('<h1');
		expect(out).toContain('<strong>bold</strong>');
		expect(out).toContain('<code>code</code>');
	});

	test('keeps fenced code with syntax highlighting', () => {
		const out = renderMarkdown('```javascript\nconst x = 1;\n```');
		expect(out).toContain('hljs');
		expect(out).toContain('const');
	});

	test('keeps a task list checkbox', () => {
		const out = renderMarkdown('- [x] done\n- [ ] not done');
		expect(out).toContain('type="checkbox"');
	});

	test('keeps rendered KaTeX markup', () => {
		const out = renderMarkdown('$x^2$');
		expect(out).toContain('katex');
	});

	test('keeps a table', () => {
		const out = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |');
		expect(out).toContain('<table');
	});
});

// Isolate side effects on the module-level singleton from other test files.
resetMarkdownRenderer();
