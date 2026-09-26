import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

// A light counterpart to @codemirror/theme-one-dark — there's no official
// "one-light" package from the CodeMirror project itself. Without this, the
// editor had no light-mode syntax coloring at all: oneDark bundles both the
// dark color palette AND the tag-to-color mapping that makes markdown
// structure (headings, emphasis, links, code) visually distinct in the first
// place, so simply not applying it in light mode would mean flat, colorless
// text rather than an actual light theme.
export const oneLightHighlightStyle = HighlightStyle.define([
	{ tag: t.keyword, color: '#a626a4' },
	{ tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e45649' },
	{ tag: [t.function(t.variableName), t.labelName], color: '#4078f2' },
	{ tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#986801' },
	{ tag: [t.definition(t.name), t.separator], color: '#383a42' },
	{
		tag: [
			t.typeName,
			t.className,
			t.number,
			t.changed,
			t.annotation,
			t.modifier,
			t.self,
			t.namespace
		],
		color: '#c18401'
	},
	{
		tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.special(t.string)],
		color: '#0184bc'
	},
	{ tag: [t.meta, t.comment], color: '#a0a1a7', fontStyle: 'italic' },
	{ tag: t.strong, fontWeight: 'bold' },
	{ tag: t.emphasis, fontStyle: 'italic' },
	{ tag: t.strikethrough, textDecoration: 'line-through' },
	{ tag: t.link, color: '#4078f2', textDecoration: 'underline' },
	{ tag: t.heading, fontWeight: 'bold', color: '#e45649' },
	{ tag: [t.atom, t.bool, t.special(t.variableName)], color: '#986801' },
	{ tag: [t.processingInstruction, t.string, t.inserted], color: '#50a14f' },
	{ tag: t.invalid, color: '#e45649' }
]);

export const oneLightTheme = EditorView.theme(
	{
		'&': {
			color: '#383a42',
			backgroundColor: '#fafafa'
		},
		'.cm-content': { caretColor: '#526eff' },
		'.cm-cursor, .cm-dropCursor': { borderLeftColor: '#526eff' },
		'&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
			backgroundColor: '#e5e5e6'
		},
		'.cm-activeLine': { backgroundColor: '#f0f0f0' },
		'.cm-gutters': {
			backgroundColor: '#fafafa',
			color: '#9d9d9f',
			border: 'none'
		},
		'.cm-activeLineGutter': { backgroundColor: '#f0f0f0' }
	},
	{ dark: false }
);
