<script lang="ts">
  import MarkdownIt from 'markdown-it';
  
  export let content: string = '';
  
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
  });
  
  $: renderedContent = md.render(content);
</script>

<div class="prose prose-gray dark:prose-invert max-w-none h-full overflow-y-auto overflow-x-hidden p-4 break-words">
  {@html renderedContent}
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
</style>