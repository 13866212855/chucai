'use client';

/**
 * Load PDF.js from local pre-built /pdf.min.js without webpack dynamic chunk issues
 */
export async function loadClientPdfJs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only run in browser');
  }

  if ((window as any).pdfjsLib) {
    const lib = (window as any).pdfjsLib;
    lib.GlobalWorkerOptions = lib.GlobalWorkerOptions || {};
    if (!lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    return lib;
  }

  return new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-pdfjs-loader="true"]') as HTMLScriptElement | null;
    if (script) {
      if ((window as any).pdfjsLib) {
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions = lib.GlobalWorkerOptions || {};
        lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        resolve(lib);
        return;
      }
      script.addEventListener('load', () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions = lib.GlobalWorkerOptions || {};
          lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          resolve(lib);
        } else {
          reject(new Error('pdfjsLib unavailable'));
        }
      });
      script.addEventListener('error', (e) => reject(e));
      return;
    }

    script = document.createElement('script');
    script.setAttribute('data-pdfjs-loader', 'true');
    script.src = '/pdf.min.js';
    script.async = true;
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions = lib.GlobalWorkerOptions || {};
        lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        resolve(lib);
      } else {
        reject(new Error('pdfjsLib not defined'));
      }
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

/**
 * Extract embedded text from PDF; if scanned image PDF (text < 30 chars),
 * render first 2 pages as compressed JPEG DataURLs for multimodal Vision LLM.
 */
export async function extractPdfForInference(dataUrl: string): Promise<{
  extractedText: string;
  pageImages: string[];
}> {
  const pdfjsLib = await loadClientPdfJs();
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const maxTextPages = Math.min(pdfDoc.numPages, 5);
  const textChunks: string[] = [];

  for (let i = 1; i <= maxTextPages; i++) {
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
  }

  const extractedText = textChunks.join('\n');
  const pageImages: string[] = [];

  // If scanned PDF with minimal embedded text, render first 2 pages as compressed JPEGs
  if (extractedText.replace(/\s+/g, '').length < 40) {
    const maxImagePages = Math.min(pdfDoc.numPages, 2);
    for (let i = 1; i <= maxImagePages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        pageImages.push(canvas.toDataURL('image/jpeg', 0.78));
      }
    }
  }

  return { extractedText, pageImages };
}

/**
 * Compress an uploaded image DataURL so API payloads remain lightweight and fast
 */
export async function compressImageDataUrl(dataUrl: string, maxDim = 1400): Promise<string> {
  if (typeof window === 'undefined') return dataUrl;
  return new Promise((resolve) => {
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
  });
}
