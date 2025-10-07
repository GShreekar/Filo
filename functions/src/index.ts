import {setGlobalOptions} from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import puppeteer from "puppeteer";

setGlobalOptions({ maxInstances: 10 });

interface PDFGenerationRequest {
  html: string;
  title: string;
  metadata?: {
    folder?: string;
    author?: string;
    subject?: string;
  };
}

interface PDFGenerationResponse {
  success: boolean;
  pdfBase64?: string;
  error?: string;
}

export const generatePDF = onCall<PDFGenerationRequest>(
  { memory: "2GiB", timeoutSeconds: 540, maxInstances: 5 },
  async (request): Promise<PDFGenerationResponse> => {
    logger.info("PDF generation request received", { 
      title: request.data.title,
      hasHtml: !!request.data.html 
    });

    try {
      if (!request.data.html || !request.data.title) {
        throw new Error("Missing required fields: html and title");
      }

      const { html, title } = request.data;

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      try {
        const page = await browser.newPage();

        await page.setViewport({ width: 1200, height: 800 });

        const completeHtml = createPrintableHTML(html, title);
        
        await page.setContent(completeHtml, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          margin: {
            top: '1in',
            right: '1in',
            bottom: '1in',
            left: '1in'
          },
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: true,
          headerTemplate: `
            <div style="font-size: 10px; width: 100%; text-align: center; margin: 0 1in;">
              <span style="color: #666;">${title}</span>
            </div>
          `,
          footerTemplate: `
            <div style="font-size: 10px; width: 100%; text-align: center; margin: 0 1in; color: #666;">
              <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            </div>
          `
        });

        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

        logger.info("PDF generated successfully", { 
          title,
          sizeKB: Math.round(pdfBuffer.length / 1024)
        });

        return {
          success: true,
          pdfBase64
        };

      } finally {
        await browser.close();
      }

    } catch (error) {
      logger.error("PDF generation failed", { 
        error: error instanceof Error ? error.message : String(error),
        title: request.data.title
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }
);

function createPrintableHTML(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  
  <!-- KaTeX CSS for math rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  
  <!-- Highlight.js CSS for code syntax highlighting -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github.min.css">
  
  <style>
    /* Print-optimized styles */
    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: none;
      margin: 0;
      padding: 20px;
      background: white;
    }
    
    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      page-break-after: avoid;
    }
    
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    h5 { font-size: 0.875em; }
    h6 { font-size: 0.85em; color: #6a737d; }
    
    /* Paragraphs and text */
    p {
      margin-bottom: 16px;
      orphans: 3;
      widows: 3;
    }
    
    /* Code blocks */
    pre {
      background: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      font-size: 85%;
      line-height: 1.45;
      page-break-inside: avoid;
      margin: 16px 0;
    }
    
    code {
      background: #f6f8fa;
      border-radius: 3px;
      padding: 0.2em 0.4em;
      font-size: 85%;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }
    
    pre code {
      background: transparent;
      border-radius: 0;
      padding: 0;
    }
    
    /* Lists */
    ul, ol {
      padding-left: 30px;
      margin-bottom: 16px;
    }
    
    li {
      margin-bottom: 4px;
    }
    
    /* Task lists */
    .task-list-item {
      list-style-type: none;
      margin-left: -20px;
    }
    
    .task-list-item-checkbox {
      margin-right: 8px;
    }
    
    /* Tables */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #e1e4e8;
      padding: 6px 13px;
      text-align: left;
    }
    
    th {
      background: #f6f8fa;
      font-weight: 600;
    }
    
    /* Blockquotes */
    blockquote {
      border-left: 4px solid #dfe2e5;
      padding: 0 16px;
      color: #6a737d;
      margin: 16px 0;
    }
    
    /* Links */
    a {
      color: #0366d6;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Images */
    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }
    
    /* Horizontal rules */
    hr {
      border: none;
      border-top: 1px solid #e1e4e8;
      margin: 24px 0;
    }
    
    /* Math equations */
    .katex {
      font-size: 1em;
    }
    
    .katex-display {
      margin: 16px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    
    /* Footnotes */
    .footnotes {
      border-top: 1px solid #e1e4e8;
      margin-top: 32px;
      padding-top: 16px;
    }
    
    .footnotes ol {
      padding-left: 20px;
    }
    
    /* Page break handling */
    @media print {
      .page-break {
        page-break-before: always;
      }
      
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      
      pre, blockquote, table, img {
        page-break-inside: avoid;
      }
    }
    
    /* Mark/highlight */
    mark {
      background: #fff3cd;
      padding: 0.1em 0.2em;
    }
    
    /* Subscript and superscript */
    sub, sup {
      font-size: 0.8em;
      line-height: 0;
      position: relative;
      vertical-align: baseline;
    }
    
    sub {
      bottom: -0.25em;
    }
    
    sup {
      top: -0.5em;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
  `.trim();
}


function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
