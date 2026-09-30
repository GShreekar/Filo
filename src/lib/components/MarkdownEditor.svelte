<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { markdown } from '@codemirror/lang-markdown';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { syntaxHighlighting } from '@codemirror/language';
	import { EditorState, Compartment, type Extension } from '@codemirror/state';
	import { keymap } from '@codemirror/view';
	import { indentWithTab } from '@codemirror/commands';
	import MarkdownToolbar from './MarkdownToolbar.svelte';
	import { theme } from '$lib/theme';
	import { oneLightTheme, oneLightHighlightStyle } from '$lib/editor-themes';

	// A separate compartment for just the color theme, so switching light/dark
	// reconfigures that one slice of the editor's extensions in place —
	// cursor position, undo history, and scroll position all survive it,
	// unlike tearing down and recreating the whole EditorView.
	const themeCompartment = new Compartment();

	function themeExtension(currentTheme: 'light' | 'dark'): Extension {
		return currentTheme === 'dark'
			? oneDark
			: [oneLightTheme, syntaxHighlighting(oneLightHighlightStyle)];
	}

	export let content: string = '';
	export let onContentChange: (newContent: string) => void = () => {};
	export let showToolbar: boolean = true;

	let editorElement: HTMLDivElement;
	let editorView: EditorView;

	function insertText(text: string, offset: number = 0) {
		if (!editorView) return;

		const selection = editorView.state.selection.main;
		const transaction = editorView.state.update({
			changes: {
				from: selection.from,
				to: selection.to,
				insert: text
			},
			selection: {
				anchor: selection.from + text.length + offset
			}
		});

		editorView.dispatch(transaction);
		editorView.focus();
	}

	function wrapSelection(before: string, after: string = before) {
		if (!editorView) return;

		const selection = editorView.state.selection.main;
		const selectedText = editorView.state.doc.sliceString(selection.from, selection.to);
		const newText = before + selectedText + after;

		const transaction = editorView.state.update({
			changes: {
				from: selection.from,
				to: selection.to,
				insert: newText
			},
			selection: {
				anchor: selection.from + before.length,
				head: selection.from + before.length + selectedText.length
			}
		});

		editorView.dispatch(transaction);
		editorView.focus();
	}

	// wrapSelection() leaves the wrapped text selected so the caller can chain
	// another edit onto it; a plain insertText() call right after it would
	// therefore replace that selection instead of appending after it. This
	// builds the marker and definition as one insertion instead, so the
	// footnote number can't end up overwritten by its own definition text.
	function insertFootnote() {
		if (!editorView) return;

		const footnoteNum = Math.floor(Math.random() * 1000) + 1;
		const selection = editorView.state.selection.main;
		const selectedText = editorView.state.doc.sliceString(selection.from, selection.to);
		const marker = `[^${footnoteNum}]`;
		const definition = `\n\n[^${footnoteNum}]: Add your footnote content here`;
		const insertion = selectedText + marker + definition;

		const transaction = editorView.state.update({
			changes: { from: selection.from, to: selection.to, insert: insertion },
			selection: { anchor: selection.from + selectedText.length + marker.length }
		});

		editorView.dispatch(transaction);
		editorView.focus();
	}

	// Subscript uses a single ~, the same character strikethrough pairs up as
	// ~~. Two subscripts placed back-to-back via this button (e.g. select "a",
	// subscript, select the following "b", subscript again) would otherwise
	// land as `~a~~b~`, which markdown-it reads as strikethrough kicking in
	// partway through. A zero-width space only where that adjacency would
	// actually occur breaks the ambiguity without affecting normal use.
	function wrapSelectionSubscript() {
		if (!editorView) return;

		const selection = editorView.state.selection.main;
		const doc = editorView.state.doc;
		const charBefore =
			selection.from > 0 ? doc.sliceString(selection.from - 1, selection.from) : '';
		const charAfter =
			selection.to < doc.length ? doc.sliceString(selection.to, selection.to + 1) : '';

		wrapSelection(charBefore === '~' ? '​~' : '~', charAfter === '~' ? '~​' : '~');
	}

	function handleToolbarAction(action: string) {
		switch (action) {
			case 'bold':
				wrapSelection('**');
				break;
			case 'italic':
				wrapSelection('*');
				break;
			case 'strikethrough':
				wrapSelection('~~');
				break;
			case 'highlight':
				wrapSelection('==');
				break;
			case 'code':
				wrapSelection('`');
				break;
			case 'link':
				wrapSelection('[', '](url)');
				break;
			case 'heading1':
				insertText('# ');
				break;
			case 'heading2':
				insertText('## ');
				break;
			case 'heading3':
				insertText('### ');
				break;
			case 'quote':
				insertText('> ');
				break;
			case 'unordered-list':
				insertText('- ');
				break;
			case 'ordered-list':
				insertText('1. ');
				break;
			case 'task-list':
				insertText('- [ ] Task item\n- [x] Completed task\n- [ ] Another task');
				break;
			case 'horizontal-rule':
				insertText('\n---\n');
				break;
			case 'code-block':
				wrapSelection('\n```javascript\n', '\n```\n');
				break;
			case 'table':
				insertText(
					'\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n'
				);
				break;
			case 'footnote':
				insertFootnote();
				break;
			case 'math-inline':
				wrapSelection('$', '$');
				break;
			case 'math-block':
				wrapSelection('\n$$\n', '\n$$\n');
				break;
			case 'subscript':
				wrapSelectionSubscript();
				break;
			case 'superscript':
				wrapSelection('^', '^');
				break;
			case 'matrix':
				insertText('\n$$\n\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}\n$$\n');
				break;
		}
	}

	onMount(() => {
		const scrollToCursor = (view: EditorView) => {
			try {
				const selection = view.state.selection.main;
				const domPos = view.domAtPos(selection.head);

				if (domPos.node) {
					const element =
						domPos.node.nodeType === Node.ELEMENT_NODE
							? (domPos.node as Element)
							: domPos.node.parentElement;

					if (element) {
						element.scrollIntoView({
							block: 'nearest',
							behavior: 'smooth'
						});
					}
				}
			} catch (error) {
				console.debug('Scroll error:', error);
			}
		};

		const ensureCursorVisible = EditorView.updateListener.of((update) => {
			if (update.selectionSet || update.docChanged) {
				requestAnimationFrame(() => scrollToCursor(update.view));
			}
		});

		const scrollOnNavigation = keymap.of([
			{
				key: 'Enter',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			},
			{
				key: 'ArrowDown',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			},
			{
				key: 'ArrowUp',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			},
			{
				key: 'ArrowLeft',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			},
			{
				key: 'ArrowRight',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			},
			{
				key: 'Home',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			},
			{
				key: 'End',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			},
			{
				key: 'PageUp',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			},
			{
				key: 'PageDown',
				run: (view) => {
					setTimeout(() => scrollToCursor(view), 30);
					return false;
				}
			}
		]);

		const markdownShortcuts = keymap.of([
			{
				key: 'Ctrl-b',
				run: () => {
					wrapSelection('**', '**');
					return true;
				}
			},
			{
				key: 'Cmd-b',
				run: () => {
					wrapSelection('**', '**');
					return true;
				}
			},
			{
				key: 'Ctrl-i',
				run: () => {
					wrapSelection('*', '*');
					return true;
				}
			},
			{
				key: 'Cmd-i',
				run: () => {
					wrapSelection('*', '*');
					return true;
				}
			},
			{
				key: 'Ctrl-e',
				run: () => {
					wrapSelection('`', '`');
					return true;
				}
			},
			{
				key: 'Cmd-e',
				run: () => {
					wrapSelection('`', '`');
					return true;
				}
			},
			{
				key: 'Ctrl-Shift-e',
				run: () => {
					wrapSelection('\n```javascript\n', '\n```\n');
					return true;
				}
			},
			{
				key: 'Cmd-Shift-e',
				run: () => {
					wrapSelection('\n```javascript\n', '\n```\n');
					return true;
				}
			},
			{
				key: 'Ctrl-l',
				run: () => {
					wrapSelection('[', '](url)');
					return true;
				}
			},
			{
				key: 'Cmd-l',
				run: () => {
					wrapSelection('[', '](url)');
					return true;
				}
			},
			{
				key: 'Ctrl-1',
				run: () => {
					insertLinePrefix('# ');
					return true;
				}
			},
			{
				key: 'Cmd-1',
				run: () => {
					insertLinePrefix('# ');
					return true;
				}
			},
			{
				key: 'Ctrl-2',
				run: () => {
					insertLinePrefix('## ');
					return true;
				}
			},
			{
				key: 'Cmd-2',
				run: () => {
					insertLinePrefix('## ');
					return true;
				}
			},
			{
				key: 'Ctrl-3',
				run: () => {
					insertLinePrefix('### ');
					return true;
				}
			},
			{
				key: 'Cmd-3',
				run: () => {
					insertLinePrefix('### ');
					return true;
				}
			},
			{
				key: 'Ctrl-4',
				run: () => {
					insertLinePrefix('#### ');
					return true;
				}
			},
			{
				key: 'Cmd-4',
				run: () => {
					insertLinePrefix('#### ');
					return true;
				}
			},
			{
				key: 'Ctrl-5',
				run: () => {
					insertLinePrefix('##### ');
					return true;
				}
			},
			{
				key: 'Cmd-5',
				run: () => {
					insertLinePrefix('##### ');
					return true;
				}
			},
			{
				key: 'Ctrl-6',
				run: () => {
					insertLinePrefix('###### ');
					return true;
				}
			},
			{
				key: 'Cmd-6',
				run: () => {
					insertLinePrefix('###### ');
					return true;
				}
			},
			{
				key: 'Ctrl-Shift-8',
				run: () => {
					insertLinePrefix('- ');
					return true;
				}
			},
			{
				key: 'Cmd-Shift-8',
				run: () => {
					insertLinePrefix('- ');
					return true;
				}
			},
			{
				key: 'Ctrl-Shift-7',
				run: () => {
					insertLinePrefix('1. ');
					return true;
				}
			},
			{
				key: 'Cmd-Shift-7',
				run: () => {
					insertLinePrefix('1. ');
					return true;
				}
			}
		]);

		// Toggles/replaces rather than always prepending — otherwise pressing a
		// heading shortcut repeatedly stacked markers ("# # # text"). Headings
		// and list markers are treated as separate families: applying a
		// heading only ever replaces another heading on that line, same for
		// list markers, so this never mixes the two.
		function insertLinePrefix(prefix: string) {
			if (!editorView) return;

			const selection = editorView.state.selection.main;
			const line = editorView.state.doc.lineAt(selection.from);
			const lineText = line.text;

			const isHeading = /^#{1,6} $/.test(prefix);
			const existingMatch = isHeading
				? lineText.match(/^#{1,6} /)
				: lineText.match(/^(?:-|\d+\.) /);
			const existingPrefix = existingMatch ? existingMatch[0] : null;

			let newLineText: string;
			let cursorDelta: number;

			if (existingPrefix === prefix) {
				newLineText = lineText.slice(existingPrefix.length);
				cursorDelta = -existingPrefix.length;
			} else if (existingPrefix) {
				newLineText = prefix + lineText.slice(existingPrefix.length);
				cursorDelta = prefix.length - existingPrefix.length;
			} else {
				newLineText = prefix + lineText;
				cursorDelta = prefix.length;
			}

			const transaction = editorView.state.update({
				changes: { from: line.from, to: line.to, insert: newLineText },
				selection: {
					anchor: Math.max(line.from, selection.from + cursorDelta),
					head: Math.max(line.from, selection.to + cursorDelta)
				}
			});

			editorView.dispatch(transaction);
			editorView.focus();
		}

		const extensions = [
			basicSetup,
			markdown(),
			keymap.of([indentWithTab]),
			scrollOnNavigation,
			markdownShortcuts,
			themeCompartment.of(themeExtension($theme)),
			EditorView.lineWrapping,
			ensureCursorVisible,
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					const newContent = update.state.doc.toString();
					onContentChange(newContent);
				}
			}),
			EditorView.theme({
				'&': {
					fontSize: '14px',
					fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace'
				},
				'.cm-content': {
					padding: '16px',
					lineHeight: '1.6',
					paddingBottom: '2rem'
				},
				'.cm-focused': {
					outline: 'none'
				},
				'.cm-editor': {
					height: '100%'
				},
				'.cm-scroller': {
					fontFamily: 'inherit',
					height: '100%',
					overflow: 'auto',
					scrollBehavior: 'smooth'
				}
			})
		];

		const startState = EditorState.create({
			doc: content,
			extensions
		});

		editorView = new EditorView({
			state: startState,
			parent: editorElement
		});

		return () => {
			editorView?.destroy();
		};
	});

	// Replaces only the span that actually differs (common prefix/suffix
	// left untouched) instead of the whole document. A whole-doc replace
	// resets the cursor to the start of the change and collapses undo
	// history on every external update (a remote edit arriving, a note
	// reload) even though most of the text is unchanged; CodeMirror maps
	// the existing selection through a smaller change correctly, so typing
	// elsewhere in the document isn't disturbed by an edit made elsewhere.
	function applyMinimalDiff(view: EditorView, newContent: string) {
		const oldContent = view.state.doc.toString();
		if (oldContent === newContent) return;

		const maxCommon = Math.min(oldContent.length, newContent.length);

		let prefixLen = 0;
		while (prefixLen < maxCommon && oldContent[prefixLen] === newContent[prefixLen]) {
			prefixLen++;
		}

		let oldEnd = oldContent.length;
		let newEnd = newContent.length;
		while (
			oldEnd > prefixLen &&
			newEnd > prefixLen &&
			oldContent[oldEnd - 1] === newContent[newEnd - 1]
		) {
			oldEnd--;
			newEnd--;
		}

		view.dispatch({
			changes: {
				from: prefixLen,
				to: oldEnd,
				insert: newContent.slice(prefixLen, newEnd)
			}
		});
	}

	$: if (editorView && content !== editorView.state.doc.toString()) {
		applyMinimalDiff(editorView, content);
	}

	$: if (editorView) {
		editorView.dispatch({ effects: themeCompartment.reconfigure(themeExtension($theme)) });
	}
</script>

<div class="flex h-full w-full flex-col">
	{#if showToolbar}
		<MarkdownToolbar on:action={(e) => handleToolbarAction(e.detail)} />
	{/if}

	<div bind:this={editorElement} class="min-h-0 flex-1"></div>
</div>
