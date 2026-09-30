import MarkdownIt from 'markdown-it';
import markdownItKatex from '@traptitech/markdown-it-katex';
import markdownItTable from 'markdown-it-multimd-table';
import markdownItTaskLists from 'markdown-it-task-lists';
import markdownItDeflist from 'markdown-it-deflist';
import markdownItSub from 'markdown-it-sub';
import markdownItSup from 'markdown-it-sup';
import markdownItAbbr from 'markdown-it-abbr';
import markdownItHighlightjs from 'markdown-it-highlightjs';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItMark from 'markdown-it-mark';
import markdownItFootnote from 'markdown-it-footnote';

import hljs from 'highlight.js';
import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify';

let md: MarkdownIt | null = null;

function initializeMarkdown(): MarkdownIt {
	if (md) return md;

	hljs.configure({
		languages: [
			'javascript',
			'typescript',
			'python',
			'java',
			'css',
			'html',
			'json',
			'markdown',
			'bash',
			'sql',
			'xml',
			'yaml'
		]
	});

	md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
		breaks: true
	}).use(markdownItKatex, {
		throwOnError: false,
		errorColor: '#cc0000'
	});

	try {
		md.use(markdownItTable, {
			multiline: true,
			rowspan: true,
			headerless: true,
			multibody: true
		});
	} catch (e) {
		console.warn('Failed to load markdown-it-multimd-table:', e);
	}

	try {
		md.use(markdownItTaskLists, {
			enabled: true,
			label: true,
			labelAfter: true,
			lineNumber: true
		});
	} catch (e) {
		console.warn('Failed to load markdown-it-task-lists:', e);
	}

	try {
		md.use(markdownItDeflist);
	} catch (e) {
		console.warn('Failed to load markdown-it-deflist:', e);
	}

	try {
		md.use(markdownItSub);
		md.use(markdownItSup);
	} catch (e) {
		console.warn('Failed to load markdown-it-sub/sup:', e);
	}

	try {
		md.use(markdownItAbbr);
	} catch (e) {
		console.warn('Failed to load markdown-it-abbr:', e);
	}

	try {
		md.use(markdownItHighlightjs, {
			auto: true,
			code: true
		});
	} catch (e) {
		console.warn('Failed to load markdown-it-highlightjs:', e);
	}

	try {
		md.use(markdownItAttrs);
	} catch (e) {
		console.warn('Failed to load markdown-it-attrs:', e);
	}

	try {
		md.use(markdownItMark);
	} catch (e) {
		console.warn('Failed to load markdown-it-mark:', e);
	}

	try {
		md.use(markdownItFootnote);
	} catch (e) {
		console.warn('Failed to load markdown-it-footnote:', e);
	}

	md.enable(['strikethrough']);

	return md;
}

// Notes are rendered with html:true (markdown-it) so raw HTML pasted into a
// note works, but that means note content is untrusted HTML by the time it
// gets here — a note is user input, and with per-user data the "user" who
// wrote it isn't necessarily the one viewing it in every code path (e.g. a
// future share feature, or this same HTML going into the PDF export
// pipeline). Sanitize on every render rather than trusting the caller.
//
// Keep this in sync with the sanitizer config in
// ../../functions/src/index.ts — that one guards the PDF renderer
// server-side, this one guards the live preview; both need to allow the same
// KaTeX/highlight.js/task-list output while blocking the same things.
const SANITIZE_OPTIONS: DOMPurifyConfig = {
	USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
	FORBID_TAGS: ['style', 'link', 'base'],
	ADD_TAGS: ['input'],
	ADD_ATTR: ['type', 'checked', 'disabled']
};

export function renderMarkdown(content: string): string {
	const renderer = initializeMarkdown();
	const rendered = renderer.render(content);
	return DOMPurify.sanitize(rendered, SANITIZE_OPTIONS);
}

export function resetMarkdownRenderer(): void {
	md = null;
}
