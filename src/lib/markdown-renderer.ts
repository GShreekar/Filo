import MarkdownIt from 'markdown-it';
// @ts-ignore
import markdownItKatex from '@traptitech/markdown-it-katex';
// @ts-ignore
import markdownItTable from 'markdown-it-multimd-table';
// @ts-ignore
import markdownItTaskLists from 'markdown-it-task-lists';
// @ts-ignore
import markdownItDeflist from 'markdown-it-deflist';
// @ts-ignore
import markdownItSub from 'markdown-it-sub';
// @ts-ignore
import markdownItSup from 'markdown-it-sup';
// @ts-ignore
import markdownItAbbr from 'markdown-it-abbr';
// @ts-ignore
import markdownItHighlightjs from 'markdown-it-highlightjs';
// @ts-ignore
import markdownItAttrs from 'markdown-it-attrs';
// @ts-ignore
import markdownItMark from 'markdown-it-mark';
// @ts-ignore
import markdownItFootnote from 'markdown-it-footnote';

import hljs from 'highlight.js';

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

export function renderMarkdown(content: string): string {
	const renderer = initializeMarkdown();
	return renderer.render(content);
}

export function resetMarkdownRenderer(): void {
	md = null;
}
