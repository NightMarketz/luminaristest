/**
 * HTML → PDF via a SINGLE shared headless-Chromium instance (puppeteer).
 *
 * ponytail: one browser launched lazily and reused for every render — per-request
 * launch would add seconds of latency + a Chromium process per call. Single-process
 * deploy (memory stay-on-sqlite-no-postgres) → one browser for the whole app; closed on
 * shutdown via closePdfBrowser(). If request isolation is ever needed, move to a page
 * pool, not a browser-per-request.
 */
import puppeteer, { type Browser } from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    // --no-sandbox: required in most container/CI runtimes; the input HTML is our own
    // trusted, self-contained template (no remote content loaded).
    browserPromise = puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }).catch((err) => {
      // Don't cache a failed launch — a transient failure would otherwise poison every
      // later render until process restart. Reset so the next call retries.
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

export interface PdfMargin {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

const DEFAULT_MARGIN: PdfMargin = { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' };

/**
 * Renders a self-contained HTML string to an A4 PDF buffer. `opts.margin` (NFE-DANFE-IBSCBS PR-2, item 16): the DANFE
 * needs 0,2–0,8 cm (`[MOC-DANFE-MARGEM]`); without it the receipts keep the default above.
 */
export async function htmlToPdf(html: string, opts?: { margin?: PdfMargin }): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // 'load' is enough — the template inlines all CSS and loads no network assets.
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: opts?.margin ?? DEFAULT_MARGIN,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

/** Closes the shared browser (call on process shutdown). Safe to call when none is open. */
export async function closePdfBrowser(): Promise<void> {
  const pending = browserPromise;
  browserPromise = null;
  if (!pending) return;
  // Tolerate a still-rejecting launch promise — nothing to close in that case.
  // eslint-disable-next-line no-restricted-syntax -- SANCTIONED: launch que falhou já rejeitou para quem chamou getBrowser(); no shutdown não há o que fechar (OBS-R8)
  const browser = await pending.catch(() => null);
  if (browser) await browser.close();
}
