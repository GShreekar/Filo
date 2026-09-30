declare module 'markdown-it-task-lists' {
	import MarkdownIt from 'markdown-it';
	interface TaskListsOptions {
		enabled?: boolean;
		label?: boolean;
		labelAfter?: boolean;
	}
	const plugin: MarkdownIt.PluginWithOptions<TaskListsOptions>;
	export = plugin;
}

declare module 'markdown-it-deflist' {
	import MarkdownIt from 'markdown-it';
	const plugin: MarkdownIt.PluginSimple;
	export = plugin;
}

declare module 'markdown-it-sub' {
	import MarkdownIt from 'markdown-it';
	const plugin: MarkdownIt.PluginSimple;
	export = plugin;
}

declare module 'markdown-it-sup' {
	import MarkdownIt from 'markdown-it';
	const plugin: MarkdownIt.PluginSimple;
	export = plugin;
}

declare module 'markdown-it-abbr' {
	import MarkdownIt from 'markdown-it';
	const plugin: MarkdownIt.PluginSimple;
	export = plugin;
}

declare module 'markdown-it-attrs' {
	import MarkdownIt from 'markdown-it';
	const plugin: MarkdownIt.PluginSimple;
	export = plugin;
}

declare module 'markdown-it-mark' {
	import MarkdownIt from 'markdown-it';
	const plugin: MarkdownIt.PluginSimple;
	export = plugin;
}

declare module 'markdown-it-footnote' {
	import MarkdownIt from 'markdown-it';
	const plugin: MarkdownIt.PluginSimple;
	export = plugin;
}

declare module 'markdown-it-highlightjs' {
	import MarkdownIt from 'markdown-it';
	interface HighlightjsOptions {
		auto?: boolean;
		code?: boolean;
	}
	const plugin: MarkdownIt.PluginWithOptions<HighlightjsOptions>;
	export = plugin;
}

declare module 'markdown-it-multimd-table' {
	import MarkdownIt from 'markdown-it';
	interface MultimdTableOptions {
		multiline?: boolean;
		rowspan?: boolean;
		headerless?: boolean;
		multibody?: boolean;
	}
	const plugin: MarkdownIt.PluginWithOptions<MultimdTableOptions>;
	export = plugin;
}
