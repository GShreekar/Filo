<script lang="ts">
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
	import { onMount, afterUpdate } from 'svelte';

	export let content: string = '';

	let mounted = false;
	let containerRef: HTMLDivElement;

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

	let md: MarkdownIt;

	function initializeMarkdown() {
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
	}

	$: renderedContent = mounted && md ? md.render(content) : '';

	function handleFootnoteClick(event: Event) {
		const target = event.target as HTMLElement;
		const link = target.closest('a');

		if (!link || !containerRef) return;

		const href = link.getAttribute('href');
		if (!href || !href.startsWith('#')) return;

		event.preventDefault();

		const targetId = href.slice(1);
		const targetElement = containerRef.querySelector(`#${targetId}`);

		if (targetElement) {
			const containerRect = containerRef.getBoundingClientRect();
			const targetRect = targetElement.getBoundingClientRect();
			const relativeTop = targetRect.top - containerRect.top + containerRef.scrollTop;

			const scrollTop = relativeTop - containerRef.clientHeight / 2;

			containerRef.scrollTo({
				top: Math.max(0, scrollTop),
				behavior: 'smooth'
			});

			targetElement.classList.add('footnote-highlight');

			setTimeout(() => {
				targetElement.classList.remove('footnote-highlight');
			}, 1000);
		}
	}

	onMount(() => {
		initializeMarkdown();
		mounted = true;
	});

	afterUpdate(() => {
		if (containerRef && mounted) {
			const footnoteLinks = containerRef.querySelectorAll('a[href^="#fn"], a[href^="#fnref"]');
			footnoteLinks.forEach((link) => {
				link.addEventListener('click', handleFootnoteClick);
			});

			return () => {
				footnoteLinks.forEach((link) => {
					link.removeEventListener('click', handleFootnoteClick);
				});
			};
		}
	});
</script>

<div
	bind:this={containerRef}
	class="h-full overflow-x-hidden overflow-y-auto pb-8"
	aria-label="Markdown preview content"
>
	<div
		class="prose prose-gray dark:prose-invert box-border max-w-none overflow-x-hidden p-4 break-words"
	>
		{@html renderedContent}
	</div>
</div>

<style>
	:global(.prose) {
		--tw-prose-body: #374151;
		--tw-prose-headings: #111827;
		--tw-prose-links: #2563eb;
		--tw-prose-bold: #111827;
		--tw-prose-counters: #6b7280;
		--tw-prose-bullets: #d1d5db;
		--tw-prose-hr: #e5e7eb;
		--tw-prose-quotes: #111827;
		--tw-prose-quote-borders: #e5e7eb;
		--tw-prose-captions: #6b7280;
		--tw-prose-code: #111827;
		--tw-prose-pre-code: #e5e7eb;
		--tw-prose-pre-bg: #1f2937;
		--tw-prose-th-borders: #d1d5db;
		--tw-prose-td-borders: #e5e7eb;
	}

	:global(.dark .prose) {
		--tw-prose-body: #d1d5db;
		--tw-prose-headings: #ffffff;
		--tw-prose-links: #60a5fa;
		--tw-prose-bold: #ffffff;
		--tw-prose-counters: #9ca3af;
		--tw-prose-bullets: #4b5563;
		--tw-prose-hr: #374151;
		--tw-prose-quotes: #f9fafb;
		--tw-prose-quote-borders: #374151;
		--tw-prose-captions: #9ca3af;
		--tw-prose-code: #ffffff;
		--tw-prose-pre-code: #d1d5db;
		--tw-prose-pre-bg: #1f2937;
		--tw-prose-th-borders: #4b5563;
		--tw-prose-td-borders: #374151;
	}

	:global(.prose pre) {
		overflow-x: auto;
		word-wrap: normal;
		white-space: pre;
	}

	:global(.prose code) {
		word-break: break-word;
	}

	:global(.prose a) {
		word-break: break-all;
	}

	:global(.prose p, .prose li) {
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.prose {
		height: auto;
		min-height: 100%;
		box-sizing: border-box;
	}

	:global(.prose > :last-child) {
		margin-bottom: 2rem;
	}

	:global(.prose .footnotes) {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		font-size: 0.875rem;
	}

	:global(.dark .prose .footnotes) {
		border-top-color: #374151;
	}

	:global(.prose .footnotes ol) {
		margin: 0;
		padding-left: 1.5rem;
	}

	:global(.prose .footnotes li) {
		margin: 0.5rem 0;
	}

	:global(.prose .footnote-ref) {
		color: #2563eb;
		text-decoration: none;
		font-weight: 500;
	}

	:global(.dark .prose .footnote-ref) {
		color: #60a5fa;
	}

	:global(.prose .footnote-ref:hover) {
		text-decoration: underline;
	}

	:global(.prose .footnote-backref) {
		color: #6b7280;
		text-decoration: none;
		margin-left: 0.25rem;
	}

	:global(.dark .prose .footnote-backref) {
		color: #9ca3af;
	}

	:global(.prose .footnote-backref:hover) {
		color: #2563eb;
	}

	:global(.dark .prose .footnote-backref:hover) {
		color: #60a5fa;
	}

	:global(.footnote-highlight) {
		background-color: #fef3c7 !important;
		transition: background-color 0.3s ease !important;
	}

	:global(.dark .footnote-highlight) {
		background-color: #451a03 !important;
	}

	:global(.prose ::selection) {
		background-color: #3b82f6;
		color: white;
	}

	:global(.dark .prose ::selection) {
		background-color: #60a5fa;
		color: #1f2937;
	}

	:global(.prose) {
		user-select: text;
		-webkit-user-select: text;
		-moz-user-select: text;
		-ms-user-select: text;
	}

	:global(.prose .katex) {
		user-select: text;
		-webkit-user-select: text;
	}

	:global(.prose pre, .prose code) {
		user-select: text;
		-webkit-user-select: text;
	}

	:global(
		.prose p,
		.prose li,
		.prose h1,
		.prose h2,
		.prose h3,
		.prose h4,
		.prose h5,
		.prose h6,
		.prose blockquote
	) {
		cursor: text;
	}

	:global(.prose a) {
		cursor: pointer;
		user-select: text;
	}

	:global(.prose p) {
		margin-bottom: 1.2em;
	}

	:global(.prose p:empty)::before {
		content: '\00a0';
		display: block;
		line-height: 1.5em;
	}
</style>
