'use client';

/**
 * PDF.js client helper.
 *
 * The library is loaded from the local pre-built bundle (/pdf.min.js, kept in sync with
 * node_modules/pdfjs-dist by scripts/sync-pdfjs-assets.mjs) instead of a bundler import,
 * so no webpack dynamic chunk is involved.
 *
 * All resources (worker, CMaps, standard fonts) are served from the same origin: the
 * public CDNs (jsdelivr / cdnjs) are unreachable on many domestic networks and would make
 * Chinese PDF parsing hang or fail.
 */
export const PDFJS_WORKER_SRC = '/pdf.worker.min.js';
export const PDFJS_CMAP_URL = '/pdfjs/cmaps/';
export const PDFJS_STANDARD_FONT_URL = '/pdfjs/standard_fonts/';

const PDFJS_SCRIPT_SRC = '/pdf.min.js';
const PDFJS_SCRIPT_LOADER_ATTR = 'data-pdfjs-loader';
const SCRIPT_LOAD_TIMEOUT_MS = 15_000;
const IMAGE_LOAD_TIMEOUT_MS = 10_000;
const DEFAULT_PDF_TIMEOUT_MS = 45_000;

/**
 * Rejects when `promise` does not settle within `ms`.
 * Every await in the inference flow is wrapped with this so the UI can never be stuck
 * in "识别中" forever (a pending promise has no error to catch otherwise).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  onTimeout?: () => void
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try {
        onTimeout?.();
      } catch {
        // ignore cleanup errors
      }
      reject(new Error(`${label}超时（${Math.round(ms / 1000)} 秒），已自动跳过`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/**
 * pdf.js (>= 3.x) exports `GlobalWorkerOptions` as a getter-only property on the library
 * object. Assigning `lib.GlobalWorkerOptions = ...` throws
 * "Cannot set property GlobalWorkerOptions of #<Object> which has only a getter".
 * Only the inner fields may be mutated.
 */
function configureWorker(lib: any): any {
  const options = lib && lib.GlobalWorkerOptions;
  if (!options) {
    throw new Error('pdfjsLib.GlobalWorkerOptions 不可用，请刷新页面后重试');
  }
  if (!options.workerSrc) {
    options.workerSrc = PDFJS_WORKER_SRC;
  }
  return lib;
}

type PdfjsLib = any;

let loaderPromise: Promise<PdfjsLib> | null = null;

/**
 * Load PDF.js from local pre-built /pdf.min.js without webpack dynamic chunk issues.
 * The returned promise always settles: it resolves with the library, or rejects on
 * script error / undefined global / load timeout.
 */
export async function loadClientPdfJs(): Promise<PdfjsLib> {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only run in browser');
  }

  const existing = (window as any).pdfjsLib;
  if (existing) {
    return configureWorker(existing);
  }

  if (!loaderPromise) {
    loaderPromise = new Promise<PdfjsLib>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const script =
        document.querySelector<HTMLScriptElement>(`script[${PDFJS_SCRIPT_LOADER_ATTR}="true"]`) ??
        (() => {
          const created = document.createElement('script');
          created.setAttribute(PDFJS_SCRIPT_LOADER_ATTR, 'true');
          created.src = PDFJS_SCRIPT_SRC;
          created.async = true;
          return created;
        })();

      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        // Remove the broken tag so the next attempt starts clean instead of waiting
        // forever on a "load" event that will never fire again.
        script.remove();
        reject(err instanceof Error ? err : new Error('PDF.js 脚本加载失败'));
      };

      const done = () => {
        if (settled) return;
        try {
          const lib = (window as any).pdfjsLib;
          if (!lib) {
            throw new Error('pdfjsLib is not defined after loading /pdf.min.js');
          }
          const configured = configureWorker(lib);
          settled = true;
          if (timer) clearTimeout(timer);
          resolve(configured);
        } catch (e) {
          fail(e);
        }
      };

      timer = setTimeout(
        () => fail(new Error('PDF.js 脚本加载超时，请检查 /pdf.min.js 是否可访问')),
        SCRIPT_LOAD_TIMEOUT_MS
      );

      script.addEventListener('load', done);
      script.addEventListener('error', () =>
        fail(new Error('/pdf.min.js 加载失败，请刷新页面后重试'))
      );

      if (!script.parentNode) {
        document.head.appendChild(script);
      }
    }).catch((err) => {
      loaderPromise = null;
      throw err;
    });
  }

  return loaderPromise;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export interface PdfExtractionOptions {
  /** Overall budget for the whole extraction. Default 45s. */
  timeoutMs?: number;
  /** Progress label for the UI (engine loading / text parsing / page rendering). */
  onStage?: (stage: string) => void;
}

/**
 * Extract embedded text from PDF; if scanned image PDF (text < 30 chars),
 * render first 2 pages as compressed JPEG DataURLs for multimodal Vision LLM.
 *
 * Always settles: either with a result (possibly with empty text/images on partial
 * failure) or rejects on timeout, so the caller can fall back to filename-only input.
 */
export async function extractPdfForInference(
  dataUrl: string,
  options: PdfExtractionOptions = {}
): Promise<{
  extractedText: string;
  pageImages: string[];
}> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PDF_TIMEOUT_MS;
  const onStage = options.onStage ?? (() => {});
  // Holder object so the async body can publish the cleanup callback to the outer scope.
  const release: { doc: (() => void) | null } = { doc: null };

  const work = (async () => {
    onStage('正在加载 PDF 解析引擎...');
    const pdfjsLib = await loadClientPdfJs();

    const loadingTask = pdfjsLib.getDocument({
      data: dataUrlToBytes(dataUrl),
      cMapUrl: PDFJS_CMAP_URL,
      cMapPacked: true,
      standardFontDataUrl: PDFJS_STANDARD_FONT_URL,
    });
    // Abort the worker-side parsing when we give up (timeout) or when finished.
    release.doc = () => {
      try {
        loadingTask.destroy();
      } catch {
        // ignore
      }
    };

    onStage('正在解析 PDF 文本...');
    const pdfDoc = await loadingTask.promise;
    const maxTextPages = Math.min(pdfDoc.numPages, 5);
    const textChunks: string[] = [];

    for (let i = 1; i <= maxTextPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items || [])
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (pageText) {
          textChunks.push(`[第${i}页] ${pageText}`);
        }
      } catch (e) {
        // A single broken page (e.g. missing CMap) must not sink the whole document.
        console.warn(`PDF page ${i} text extraction failed, skipping:`, e);
      }
    }

    const extractedText = textChunks.join('\n');
    const pageImages: string[] = [];

    // If scanned PDF with minimal embedded text, render first 2 pages as compressed JPEGs
    if (extractedText.replace(/\s+/g, '').length < 40) {
      onStage('PDF 为扫描件/图片版，正在生成页面图像供视觉模型识别...');
      const maxImagePages = Math.min(pdfDoc.numPages, 2);
      for (let i = 1; i <= maxImagePages; i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.35 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            pageImages.push(canvas.toDataURL('image/jpeg', 0.78));
          }
        } catch (e) {
          console.warn(`PDF page ${i} render failed, skipping:`, e);
        }
      }
    }

    return { extractedText, pageImages };
  })();

  try {
    return await withTimeout(work, timeoutMs, 'PDF 解析', () => release.doc?.());
  } finally {
    release.doc?.();
  }
}

/**
 * Compress an uploaded image DataURL so API payloads remain lightweight and fast
 */
export async function compressImageDataUrl(dataUrl: string, maxDim = 1400): Promise<string> {
  if (typeof window === 'undefined') return dataUrl;
  return withTimeout(
    new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && dataUrl.length < 450_000) {
          resolve(dataUrl);
          return;
        }
        const ratio = Math.min(maxDim / width, maxDim / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    }),
    IMAGE_LOAD_TIMEOUT_MS,
    '图片压缩'
    // A timeout rejects -> fall back to the original image instead of failing the whole inference.
  ).catch(() => dataUrl);
}
