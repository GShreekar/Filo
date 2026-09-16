import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import puppeteer, {type HTTPRequest} from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import DOMPurify from "isomorphic-dompurify";

// Only one function in this project, used by one person — keep the ceiling
// low so a bug or a leaked credential can't turn into a large bill.
setGlobalOptions({maxInstances: 3});

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

// Mirrors allowedEmails() in ../firestore.rules. This function never touches
// Firestore, so being signed in is not enough on its own — anyone with a
// Google account can obtain a valid ID token. The allowlist is what actually
// restricts who can use it. Keep both lists in sync by hand; they're
// necessarily separate because rules and function code run in different
// languages/runtimes.
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

// Network egress permitted while rendering. Nothing else is reachable from
// inside the page — no localhost, no RFC1918 ranges, no cloud metadata
// endpoint — which is what actually closes the SSRF hole, not just style.
// (This does mean an <img src> pointing at some other public host in a note
// won't load in the exported PDF — a deliberate tradeoff: an allowlist is
// the only version of this check that can't be bypassed with a redirect,
// DNS rebinding, or an alternate IP encoding.)
const ALLOWED_RESOURCE_HOSTS = new Set(["cdn.jsdelivr.net"]);

// A Firestore note body is well under 1MB raw; rendered HTML has overhead
// but nowhere near 3MB for legitimate content.
const MAX_HTML_LENGTH = 3_000_000;
const MAX_TITLE_LENGTH = 300;

function assertAllowedCaller(auth: CallableRequest<PDFGenerationRequest>["auth"]): void {
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to generate a PDF.");
  }

  const email = typeof auth.token.email === "string" ? auth.token.email.toLowerCase() : null;
  const emailVerified = auth.token.email_verified === true;

  if (!email || !emailVerified || !ALLOWED_EMAILS.includes(email)) {
    throw new HttpsError("permission-denied", "This account isn't allowed to use this function.");
  }
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: {html: true, svg: true, svgFilters: true, mathMl: true},
    // The printable page template supplies its own stylesheets; note content
    // has no legitimate reason to bring its own <style>/<link>/<base>.
    FORBID_TAGS: ["style", "link", "base"],
    // markdown-it-task-lists renders checkboxes as bare <input> elements —
    // no name/value/form attributes — so allowing just this doesn't reopen
    // form or event-handler surface.
    ADD_TAGS: ["input"],
    ADD_ATTR: ["type", "checked", "disabled"]
  });
}

export const generatePDF = onCall<PDFGenerationRequest>(
  {memory: "1GiB", timeoutSeconds: 120, maxInstances: 2},
  async (request): Promise<PDFGenerationResponse> => {
    assertAllowedCaller(request.auth);

    const {html: rawHtml, title} = request.data;

    if (!rawHtml || !title) {
      throw new HttpsError("invalid-argument", "Missing required fields: html and title");
    }
    if (rawHtml.length > MAX_HTML_LENGTH) {
      throw new HttpsError("invalid-argument", "Note content is too large to export as PDF.");
    }
    if (title.length > MAX_TITLE_LENGTH) {
      throw new HttpsError("invalid-argument", "Title is too long.");
    }

    const html = sanitizeHtml(rawHtml);

    logger.info("PDF generation request received", {
      uid: request.auth?.uid,
      title,
      hasHtml: !!html
    });

    try {
      // Launch Puppeteer with serverless Chromium for cloud environment
      const browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu"
        ],
        defaultViewport: {width: 1280, height: 720},
        executablePath: await chromium.executablePath(),
        headless: true,
        ignoreDefaultArgs: ["--disable-extensions"]
      });

      try {
        const page = await browser.newPage();

        await page.setViewport({width: 1200, height: 800});

        // page.setContent() below injects the document directly and never
        // goes through the network stack, so this only ever sees requests
        // for sub-resources (the two CDN stylesheets, or anything a note
        // tries to fetch) — exactly what needs gating.
        await page.setRequestInterception(true);
        page.on("request", (req: HTTPRequest) => {
          let allowed = false;

          try {
            const url = new URL(req.url());
            allowed =
              url.protocol === "data:" ||
              url.protocol === "about:" ||
              (url.protocol === "https:" && ALLOWED_RESOURCE_HOSTS.has(url.hostname));
          } catch {
            allowed = false;
          }

          if (allowed) {
            req.continue();
          } else {
            logger.warn("Blocked outbound request during PDF render", {url: req.url()});
            req.abort();
          }
        });

        const completeHtml = createPrintableHTML(html, title);

        await page.setContent(completeHtml, {
          waitUntil: "networkidle0",
          timeout: 30000
        });

        const pdfBuffer = await page.pdf({
          format: "A4",
          margin: {
            top: "1in",
            right: "1in",
            bottom: "1in",
            left: "1in"
          },
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: true,
          headerTemplate: `
            <div style="font-size: 10px; width: 100%; text-align: center; margin: 0 1in;">
              <span style="color: #666;">${escapeHtml(title)}</span>
            </div>
          `,
          footerTemplate: `
            <div style="font-size: 10px; width: 100%; text-align: center; margin: 0 1in; color: #666;">
              <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            </div>
          `
        });

        const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

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
        title
      });

      // Deliberately generic — the real detail is in the log above, not in
      // what a caller gets back.
      return {
        success: false,
        error: "PDF generation failed. Please try again."
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
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
