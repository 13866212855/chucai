'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileAttachment, OutingRecord } from '@/types/outing';
import {
  FileText,
  Download,
  ExternalLink,
  Printer,
  AlertCircle,
  Loader2,
  FileCheck,
  ZoomIn,
  RefreshCw,
} from 'lucide-react';

interface OriginalFileRenderItemProps {
  record: OutingRecord;
  file: FileAttachment;
  showFinanceHeader: boolean;
  showWatermark: boolean;
  pageIndex: number;
  totalPages: number;
}

export function OriginalFileRenderItem({
  record,
  file,
  showFinanceHeader,
  showWatermark,
  pageIndex,
  totalPages,
}: OriginalFileRenderItemProps) {
  const fileName = file.name || '';
  const isPdf =
    file.type === 'application/pdf' ||
    /\.pdf$/i.test(fileName) ||
    (file.dataUrl && file.dataUrl.startsWith('data:application/pdf'));

  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|bmp|gif|svg)$/i.test(fileName) ||
    (file.dataUrl && file.dataUrl.startsWith('data:image/'));

  const isWord =
    file.type.includes('word') ||
    file.type.includes('officedocument') ||
    /\.(docx?)$/i.test(fileName) ||
    (file.dataUrl &&
      (file.dataUrl.startsWith('data:application/vnd.openxmlformats') ||
        file.dataUrl.startsWith('data:application/msword')));

  const isText =
    file.type.startsWith('text/') ||
    /\.(txt|md|csv)$/i.test(fileName);

  // Print helper for opening native print dialog for the raw file
  const handleDirectNativePrint = () => {
    if (!file.dataUrl) return;

    if (isPdf) {
      // Create hidden iframe and trigger native print
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = file.dataUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print fallback to window open:', e);
            window.open(file.dataUrl, '_blank');
          }
        }, 300);
      };
    } else {
      window.print();
    }
  };

  return (
    <div
      className="official-doc-page bg-white rounded-lg shadow-md border border-slate-300 p-6 sm:p-8 min-h-[297mm] flex flex-col justify-between text-slate-900 relative print:shadow-none print:border-none print:m-0 print:p-0"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Top Watermark or Stamp (only if enabled) */}
      {showWatermark && (
        <div className="absolute right-8 top-8 pointer-events-none opacity-20 border-2 border-red-600 text-red-600 rounded px-2.5 py-1 text-xs font-serif font-bold rotate-12 uppercase tracking-widest no-print">
          财务报销·原件打印附单
        </div>
      )}

      {/* Top Official Header (Audit Banner) */}
      {showFinanceHeader && (
        <div className="pb-3 mb-4 border-b-2 border-slate-900 text-xs shrink-0">
          <div className="flex items-center justify-between pb-1 text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-800 tracking-wider">
                【公务外出与培训报销凭据附件 · 上传原件】
              </span>
              <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded font-normal">
                原始文档打印
              </span>
            </div>
            <span className="font-mono text-[11px]">
              第 {pageIndex + 1} 项 / 共 {totalPages} 项
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
            <div>
              <span className="text-slate-400">报销事项：</span>
              <strong className="text-slate-900 block truncate">{record.title}</strong>
            </div>
            <div>
              <span className="text-slate-400">出差人员：</span>
              <strong className="text-slate-900 block truncate">
                {record.applicantName}（{record.department || '单位'}）
              </strong>
            </div>
            <div>
              <span className="text-slate-400">行程路线：</span>
              <strong className="text-slate-900 block truncate">
                {record.destinations?.join(' ➔ ') || '外出地'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400">外出时间：</span>
              <span className="text-slate-900 block font-mono text-[10px]">
                {record.startTime ? record.startTime.slice(0, 10) : ''} 至{' '}
                {record.endTime ? record.endTime.slice(0, 10) : ''}（{Math.max(1, Math.round(record.durationDays || 1))}天）
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Original Document Body: Renders ACTUAL content */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 w-full">
        {!file.dataUrl ? (
          /* Empty DataURL Notice */
          <div className="w-full border-2 border-dashed border-amber-300 bg-amber-50/60 rounded-xl p-8 text-center text-slate-700 space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <h4 className="font-bold text-sm text-amber-900">
              《{file.name}》
            </h4>
            <p className="text-xs text-amber-800 max-w-md mx-auto">
              此记录为示例或草稿条目，未包含本地上传的原始文件流。请在【编辑】中重新上传原文件（支持从微信聊天记录直接拖入 PDF、Word 或图片）。
            </p>
          </div>
        ) : isPdf ? (
          /* Real Original PDF Document Pages */
          <PdfOriginalPagesViewer
            dataUrl={file.dataUrl}
            fileName={file.name}
            onNativePrint={handleDirectNativePrint}
          />
        ) : isWord ? (
          /* Real Original Word Document */
          <WordOriginalDocumentViewer
            dataUrl={file.dataUrl}
            fileName={file.name}
          />
        ) : isImage ? (
          /* Real Original Image Document */
          <div className="w-full flex flex-col items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.dataUrl}
              alt={file.name}
              className="max-w-full max-h-[800px] object-contain border border-slate-200 rounded shadow-2xs"
            />
          </div>
        ) : isText ? (
          /* Real Original Text Document */
          <TextOriginalDocumentViewer dataUrl={file.dataUrl} fileName={file.name} />
        ) : (
          /* Unknown Binary File Fallback */
          <div className="w-full border border-slate-200 rounded-xl p-6 bg-slate-50 text-center space-y-3">
            <FileText className="w-10 h-10 text-blue-600 mx-auto" />
            <p className="font-bold text-sm text-slate-800">{file.name}</p>
            <p className="text-xs text-slate-500">
              文件大小：{(file.size / 1024).toFixed(1)} KB
            </p>
            <a
              href={file.dataUrl}
              download={file.name}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载并打开原文件打印</span>
            </a>
          </div>
        )}
      </div>

      {/* Sheet Bottom Footer */}
      <div className="pt-3 mt-3 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500 font-sans shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-800">
            原始文件：{file.name}
          </span>
          <span>·</span>
          <span>大小: {(file.size / 1024).toFixed(0)} KB</span>
          <span>·</span>
          <span>上传于：{file.uploadedAt || record.createdAt?.slice(0, 10)}</span>
        </div>
        <div className="flex items-center space-x-2">
          {file.dataUrl && (
            <a
              href={file.dataUrl}
              download={file.name}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 no-print text-[11px]"
              title="下载原始上传文档"
            >
              <Download className="w-3 h-3" />
              <span>下载原件</span>
            </a>
          )}
          <span className="font-mono text-[10px] text-slate-400">
            审批单号: {record.id} · A4 报账原件附单
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * PDF Original Pages Viewer
 * Renders each page of the uploaded PDF to high-resolution canvas
 */
function PdfOriginalPagesViewer({
  dataUrl,
  fileName,
  onNativePrint,
}: {
  dataUrl: string;
  fileName: string;
  onNativePrint?: () => void;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);

        // Dynamically import pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker source to our local static copy
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }

        // Convert base64 DataURL to Uint8Array
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
        if (isCancelled) return;

        const renderedPageUrls: string[] = [];
        const scale = 2.0; // High resolution rendering for sharp A4 print

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          if (context) {
            // Fill clean white background
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };

            await page.render(renderContext).promise;
            renderedPageUrls.push(canvas.toDataURL('image/jpeg', 0.95));
          }
        }

        if (!isCancelled) {
          setPages(renderedPageUrls);
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error('PDF.js rendering failed, using native iframe fallback:', err);
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'PDF 解析异常');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [dataUrl]);

  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-slate-50/80 rounded-xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-700">正在按原版高保真加载《{fileName}》...</p>
        <span className="text-[11px] text-slate-400">正在逐页提取原始矢量版面与红头公函原貌</span>
      </div>
    );
  }

  // If pdf.js failed for any reason, provide interactive browser-native object/embed
  if (error || pages.length === 0) {
    return (
      <div className="w-full space-y-3">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900 no-print">
          <span>《{fileName}》已调起浏览器原生 PDF 高清预览</span>
          {onNativePrint && (
            <button
              type="button"
              onClick={onNativePrint}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>调用原生打印此 PDF</span>
            </button>
          )}
        </div>
        <div className="w-full h-[800px] border border-slate-300 rounded-lg overflow-hidden bg-slate-100">
          <object
            data={dataUrl}
            type="application/pdf"
            className="w-full h-full"
          >
            <iframe
              src={`${dataUrl}#toolbar=0`}
              title={fileName}
              className="w-full h-full border-none"
            />
          </object>
        </div>
      </div>
    );
  }

  // Render each page as high-resolution image
  return (
    <div className="w-full space-y-6 flex flex-col items-center">
      {/* Quick Toolbar above original PDF (no-print) */}
      <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700 no-print">
        <div className="flex items-center space-x-1.5 font-medium">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>原版 PDF 文档（共 {pages.length} 页）</span>
        </div>
        <div className="flex items-center space-x-2">
          {onNativePrint && (
            <button
              type="button"
              onClick={onNativePrint}
              className="text-[11px] text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-colors"
              title="直接调用浏览器系统打印此原始 PDF 文件"
            >
              <Printer className="w-3 h-3 text-blue-600" />
              <span>直接打印原版</span>
            </button>
          )}
          <a
            href={dataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-colors"
            title="在新标签页全屏查看原始 PDF"
          >
            <ExternalLink className="w-3 h-3 text-slate-500" />
            <span>新窗口查看</span>
          </a>
        </div>
      </div>

      {pages.map((pageImgUrl, idx) => (
        <div
          key={idx}
          className={`w-full flex flex-col items-center bg-white shadow-sm border border-slate-200 rounded-sm p-1 ${
            idx < pages.length - 1 ? 'print:break-after-page print:page-break-after-always' : ''
          }`}
        >
          {pages.length > 1 && (
            <div className="w-full text-right text-[10px] text-slate-400 pb-1 pr-2 no-print font-mono">
              第 {idx + 1} 页 / 共 {pages.length} 页
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pageImgUrl}
            alt={`${fileName} - 第 ${idx + 1} 页`}
            className="w-full max-w-[200mm] print:max-w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Word Original Document Viewer
 * Uses mammoth to convert .docx into native formatted HTML preserving tables, headings, paragraphs
 */
function WordOriginalDocumentViewer({
  dataUrl,
  fileName,
}: {
  dataUrl: string;
  fileName: string;
}) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadWord() {
      try {
        setLoading(true);
        const mammoth = await import('mammoth');

        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        if (!isCancelled) {
          setHtmlContent(result.value || '');
          setLoading(false);
        }
      } catch (err) {
        console.warn('Mammoth docx conversion error:', err);
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadWord();

    return () => {
      isCancelled = true;
    };
  }, [dataUrl]);

  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-2 bg-slate-50 rounded-xl border border-slate-200">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-600">正在解析 Word 文档《{fileName}》...</p>
      </div>
    );
  }

  return (
    <div className="w-full border border-slate-300 rounded-lg p-6 sm:p-8 bg-white font-serif text-slate-900 shadow-2xs">
      <div className="pb-3 mb-4 border-b border-slate-300 text-xs text-slate-500 flex justify-between">
        <span className="font-sans font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>原版 Word 文档内容：{fileName}</span>
        </span>
      </div>

      {htmlContent ? (
        <div
          className="prose prose-sm max-w-none space-y-3 leading-relaxed text-slate-900 [&_table]:border [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_p]:indent-6"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : (
        <div className="py-8 text-center text-slate-500 space-y-2">
          <FileText className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-xs">无法直接在网页中解析此格式 Word 文档，请下载原件打印：</p>
          <a
            href={dataUrl}
            download={fileName}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下载原版文档 ({fileName})</span>
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Text Original Document Viewer
 */
function TextOriginalDocumentViewer({
  dataUrl,
  fileName,
}: {
  dataUrl: string;
  fileName: string;
}) {
  const textContent = React.useMemo(() => {
    try {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      return decodeURIComponent(escape(atob(base64Data)));
    } catch {
      return '';
    }
  }, [dataUrl]);

  return (
    <div className="w-full border border-slate-300 rounded-lg p-6 bg-slate-50/50 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
      <div className="pb-2 mb-3 border-b border-slate-200 text-[11px] text-slate-500 flex justify-between font-sans">
        <span className="font-bold text-slate-700">文本文件原件：{fileName}</span>
      </div>
      {textContent || '文件内容为空'}
    </div>
  );
}
