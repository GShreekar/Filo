<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { markdown } from '@codemirror/lang-markdown';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorState } from '@codemirror/state';
	import { keymap } from '@codemirror/view';
	import { indentWithTab } from '@codemirror/commands';
	import MarkdownToolbar from './MarkdownToolbar.svelte';

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
				insertText('\n```javascript\n', -14);
				break;
			case 'table':
				insertText(
					'\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n'
				);
				break;
			case 'footnote':
				const footnoteNum = Math.floor(Math.random() * 1000) + 1;
				wrapSelection(`[^${footnoteNum}`, ']');
				insertText(`\n\n[^${footnoteNum}]: Add your footnote content here`);
				break;
			case 'math-inline':
				wrapSelection('$', '$');
				break;
			case 'math-block':
				insertText('\n$$\n', -3);
				break;
			case 'subscript':
				wrapSelection('~', '~');
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
					const element = domPos.node.nodeType === Node.ELEMENT_NODE 
						? domPos.node as Element
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
					insertText('\n```javascript\n', -14);
					return true;
				}
			},
			{
				key: 'Cmd-Shift-e',
				run: () => {
					insertText('\n```javascript\n', -14);
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

		function insertLinePrefix(prefix: string) {
			if (!editorView) return;

			const selection = editorView.state.selection.main;
			const line = editorView.state.doc.lineAt(selection.from);
			const lineStart = line.from;
			
			const transaction = editorView.state.update({
				changes: {
					from: lineStart,
					to: lineStart,
					insert: prefix
				},
				selection: {
					anchor: selection.from + prefix.length,
					head: selection.to + prefix.length
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
			oneDark,
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

	$: if (editorView && content !== editorView.state.doc.toString()) {
		editorView.dispatch({
			changes: {
				from: 0,
				to: editorView.state.doc.length,
				insert: content
			}
		});
	}
</script>

<div class="flex h-full w-full flex-col">
	{#if showToolbar}
		<MarkdownToolbar on:action={(e) => handleToolbarAction(e.detail)} />
	{/if}

	<div bind:this={editorElement} class="min-h-0 flex-1"></div>
</div>
