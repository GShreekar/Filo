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
			case 'horizontal-rule':
				insertText('\n---\n');
				break;
			case 'code-block':
				insertText('\n```\n', -4);
				break;
		}
	}

	onMount(() => {
		const extensions = [
			basicSetup,
			markdown(),
			keymap.of([indentWithTab]),
			oneDark,
			EditorView.lineWrapping,
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
					lineHeight: '1.6'
				},
				'.cm-focused': {
					outline: 'none'
				},
				'.cm-editor': {
					height: '100%'
				},
				'.cm-scroller': {
					fontFamily: 'inherit',
					overflow: 'auto'
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

<div class="flex h-full w-full flex-col overflow-hidden">
	{#if showToolbar}
		<MarkdownToolbar on:action={(e) => handleToolbarAction(e.detail)} />
	{/if}

	<div bind:this={editorElement} class="flex-1 overflow-auto"></div>
</div>
