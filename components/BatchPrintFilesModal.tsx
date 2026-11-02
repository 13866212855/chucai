'use client';

import React, { useRef, useState, useMemo } from 'react';
import { OutingRecord, FileAttachment } from '@/types/outing';
import {
  X,
  Printer,
  Download,
  FileText,
  CheckSquare,
  Square,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Paperclip,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface BatchPrintFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: OutingRecord[];
  initialSelectedRecordIds?: string[];
}

export function BatchPrintFilesModal({
  isOpen,
  onClose,
  records,
  initialSelectedRecordIds,
}: BatchPrintFilesModalProps) {
  if (!isOpen) return null;

  return (
    <BatchPrintFilesContent
      records={records}
      onClose={onClose}
      initialSelectedRecordIds={initialSelectedRecordIds}
    />
  );
}

function BatchPrintFilesContent({
  records,
  onClose,
  initialSelectedRecordIds,
}: {
  records: OutingRecord[];
  onClose: () => void;
  initialSelectedRecordIds?: string[];
}) {
  // Only records that actually contain files
  const recordsWithFiles = useMemo(() => {
    return records.filter((r) => r.files && r.files.length > 0);
  }, [records]);

  // Selected file keys: Set of `recordId___fileId`
  const [selectedFileKeys, setSelectedFileKeys] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const targetRecordIds = initialSelectedRecordIds && initialSelectedRecordIds.length > 0
      ? new Set(initialSelectedRecordIds)
      : null;

    recordsWithFiles.forEach((rec) => {
      if (!targetRecordIds || targetRecordIds.has(rec.id)) {
        rec.files.forEach((f) => {
          set.add(`${rec.id}___${f.id}`);
        });
      }
    });

    // Fallback: if nothing selected, select files from the first record with files
    if (set.size === 0 && recordsWithFiles.length > 0) {
      recordsWithFiles[0].files.forEach((f) => {
        set.add(`${recordsWithFiles[0].id}___${f.id}`);
      });
    }

    return set;
  });

  // Settings
  const [showFinanceHeader, setShowFinanceHeader] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(false);

  // References
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Flattened list of selected items with record metadata
  const selectedItems = useMemo(() => {
    const list: { record: OutingRecord; file: FileAttachment; key: string }[] = [];
    recordsWithFiles.forEach((record) => {
      record.files.forEach((file) => {
        const key = `${record.id}___${file.id}`;
        if (selectedFileKeys.has(key)) {
          list.push({ record, file, key });
        }
      });
    });
    return list;
  }, [recordsWithFiles, selectedFileKeys]);

  // Toggle single file
  const toggleFile = (key: string) => {
    const next = new Set(selectedFileKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedFileKeys(next);
  };

  // Toggle all files in a record
  const toggleRecordFiles = (record: OutingRecord) => {
    const next = new Set(selectedFileKeys);
    const allSelected = record.files.every((f) => next.has(`${record.id}___${f.id}`));

    record.files.forEach((f) => {
      const key = `${record.id}___${f.id}`;
      if (allSelected) {
        next.delete(key);
      } else {
        next.add(key);
      }
    });

    setSelectedFileKeys(next);
  };

  // Select all or deselect all
  const selectAllFiles = () => {
    const next = new Set<string>();
    recordsWithFiles.forEach((r) => {
      r.files.forEach((f) => {
        next.add(`${r.id}___${f.id}`);
      });
    });
    setSelectedFileKeys(next);
  };

  const deselectAllFiles = () => {
    setSelectedFileKeys(new Set());
  };

  // Browser Print
  const handlePrint = () => {
    if (selectedItems.length === 0) return;
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Export PDF with html2canvas and jsPDF
  const handleExportPdf = async () => {
    if (selectedItems.length === 0) return;
    setIsExportingPdf(true);
    setExportProgress('准备生成 PDF...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pages = printContainerRef.current?.querySelectorAll<HTMLElement>('.official-doc-page');
      if (!pages || pages.length === 0) {
        throw new Error('未找到打印页面');
      }

      for (let i = 0; i < pages.length; i++) {
        setExportProgress(`正在渲染第 ${i + 1}/${pages.length} 页文件...`);
        const pageEl = pages[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      setExportProgress('正在保存文件...');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      pdf.save(`出差报账官方文件合集_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('导出 PDF 遇到问题，请重试或直接使用浏览器一键打印');
    } finally {
      setIsExportingPdf(false);
      setExportProgress('');
    }
  };

  // Format date helper
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    return isoStr.replace('T', ' ');
  };

  return (
    <>
      {/* Scoped CSS Print Rules */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            body * {
              visibility: hidden !important;
            }
            #batch-official-files-print-root, #batch-official-files-print-root * {
              visibility: visible !important;
            }
            #batch-official-files-print-root {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            .official-doc-page {
              page-break-after: always !important;
              break-after: page !important;
              box-shadow: none !important;
              border: 1px solid #d1d5db !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 0 20mm 0 !important;
              padding: 10mm 12mm !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
            }
            .official-doc-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
              margin-bottom: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `,
        }}
      />

      {/* Modal Backdrop and Wrapper */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-1 sm:p-4 overflow-y-auto no-print">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col h-[94vh] max-h-[96vh] overflow-hidden border border-slate-300">
          {/* Top Control Bar */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold tracking-tight">一键打印已上传官方文件与批件</h2>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium">
                    财务报账专用
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  支持按需勾选未报账出差的红头批件、培训通知公函，一键打印为标准 A4 装订附单
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowSidebar(!showSidebar)}
                className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 border transition-all md:hidden ${
                  showSidebar
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showSidebar ? '收起清单' : '选择文件'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Body: Left checklist + Right A4 preview */}
          <div className="flex-1 flex overflow-hidden bg-slate-100">
            {/* Left Selection Sidebar (Responsive) */}
            <div
              className={`w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 ${
                showSidebar ? 'fixed inset-y-14 left-0 z-40 shadow-2xl md:relative md:inset-auto md:shadow-none' : 'hidden md:flex'
              }`}
            >
              {/* Sidebar Header */}
              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>待打印文件清单 ({selectedItems.length}/{recordsWithFiles.reduce((acc, r) => acc + r.files.length, 0)})</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    共 {recordsWithFiles.length} 笔记录有附件
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllFiles}
                    className="flex-1 py-1 px-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-center text-[11px] transition-colors"
                  >
                    全选所有文件
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllFiles}
                    className="flex-1 py-1 px-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-center text-[11px] transition-colors"
                  >
                    清空选择
                  </button>
                </div>
              </div>

              {/* Records and Files Tree */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 text-xs">
                {recordsWithFiles.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>当前记录中暂未检测到已上传的官方公函文件</p>
                  </div>
                ) : (
                  recordsWithFiles.map((record) => {
                    const recordFileKeys = record.files.map((f) => `${record.id}___${f.id}`);
                    const selectedCount = recordFileKeys.filter((k) => selectedFileKeys.has(k)).length;
                    const allSelected = selectedCount === recordFileKeys.length && recordFileKeys.length > 0;
                    const partiallySelected = selectedCount > 0 && selectedCount < recordFileKeys.length;

                    return (
                      <div
                        key={record.id}
                        className={`rounded-xl border transition-all p-2.5 ${
                          selectedCount > 0
                            ? 'bg-blue-50/50 border-blue-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Record Head */}
                        <div
                          onClick={() => toggleRecordFiles(record)}
                          className="flex items-start space-x-2 cursor-pointer pb-2 border-b border-slate-200/70"
                        >
                          <button
                            type="button"
                            className="mt-0.5 text-slate-400 hover:text-blue-600"
                          >
                            {allSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : partiallySelected ? (
                              <div className="w-4 h-4 rounded bg-blue-100 border border-blue-600 flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-blue-600" />
                              </div>
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-slate-900 truncate text-xs">
                                {record.title}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                {record.applicantName}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>{record.destinations?.join(' ➔ ') || '出差'}</span>
                              <span>·</span>
                              <span>{record.files.length} 份文件</span>
                            </div>
                          </div>
                        </div>

                        {/* File Items in this record */}
                        <div className="pt-2 space-y-1.5 pl-6">
                          {record.files.map((file) => {
                            const key = `${record.id}___${file.id}`;
                            const isChecked = selectedFileKeys.has(key);

                            return (
                              <div
                                key={file.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFile(key);
                                }}
                                className={`flex items-center justify-between p-1.5 rounded-lg border cursor-pointer text-[11px] transition-all ${
                                  isChecked
                                    ? 'bg-white border-blue-300 text-blue-900 font-medium shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center space-x-1.5 truncate">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                  />
                                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate">{file.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                                  {(file.size / 1024).toFixed(0)}KB
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sidebar Print Settings Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 block text-[11px]">打印选项设置</span>
                <label className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showFinanceHeader}
                    onChange={(e) => setShowFinanceHeader(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>附带财务报销凭据识别标头</span>
                </label>
                <label className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>添加“财务报销装订附单”防伪印戳</span>
                </label>
              </div>
            </div>

            {/* Right Side: A4 Document Viewer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex flex-col items-center">
              {selectedItems.length === 0 ? (
                <div className="my-auto bg-white p-8 rounded-2xl border border-slate-300 text-center text-slate-500 max-w-md shadow-sm">
                  <Printer className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-800 mb-1">未勾选任何官方文件</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    请在左侧清单中勾选需要本次报账打印的通知或公函。
                  </p>
                  <button
                    type="button"
                    onClick={selectAllFiles}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    勾选全部已上传文件
                  </button>
                </div>
              ) : (
                <div
                  id="batch-official-files-print-root"
                  ref={printContainerRef}
                  className="w-full max-w-[210mm] space-y-6"
                >
                  {selectedItems.map((item, index) => {
                    const { record, file } = item;
                    const isImage =
                      file.type.startsWith('image/') ||
                      /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name) ||
                      (file.dataUrl && file.dataUrl.startsWith('data:image/'));

                    return (
                      <div
                        key={item.key}
                        className="official-doc-page bg-white rounded-lg shadow-md border border-slate-300 p-6 sm:p-8 min-h-[297mm] flex flex-col justify-between text-slate-900 relative"
                        style={{ boxSizing: 'border-box' }}
                      >
                        {/* Top Watermark or Stamp */}
                        {showWatermark && (
                          <div className="absolute right-8 top-8 pointer-events-none opacity-20 border-2 border-red-600 text-red-600 rounded px-2.5 py-1 text-xs font-serif font-bold rotate-12 uppercase tracking-widest">
                            财务报销·装订附单
                          </div>
                        )}

                        {/* Top Official Header (Audit Banner) */}
                        {showFinanceHeader && (
                          <div className="pb-4 mb-4 border-b-2 border-slate-900 text-xs">
                            <div className="flex items-center justify-between pb-1 text-slate-600">
                              <span className="font-bold text-slate-800 tracking-wider">
                                【公务外出与培训报销凭据附件】
                              </span>
                              <span className="font-mono text-[11px]">
                                第 {index + 1} 页 / 共 {selectedItems.length} 页
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                              <div>
                                <span className="text-slate-400">报销事项：</span>
                                <strong className="text-slate-900 block truncate">{record.title}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400">出差人员：</span>
                                <strong className="text-slate-900 block truncate">
                                  {record.applicantName}（{record.department || '中心'}）
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

                        {/* Document Content Area */}
                        <div className="flex-1 flex flex-col items-center justify-center py-2">
                          {isImage && file.dataUrl ? (
                            <div className="w-full flex flex-col items-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={file.dataUrl}
                                alt={file.name}
                                className="max-w-full max-h-[750px] object-contain border border-slate-200 rounded shadow-2xs"
                              />
                            </div>
                          ) : (
                            /* Authentic Official Red-Headed Document Template for Non-Image or Seed Files */
                            <div className="w-full border border-slate-300 p-6 sm:p-8 bg-white font-serif text-slate-900 space-y-4">
                              {/* Red Head */}
                              <div className="text-center pb-3 border-b-2 border-red-600">
                                <h1 className="text-xl sm:text-2xl font-black text-red-600 tracking-wider">
                                  阜阳市教育局 / 相关主管部门 文件
                                </h1>
                                <p className="text-xs text-red-600 font-mono mt-1">
                                  阜教发〔2026〕{10 + index} 号
                                </p>
                              </div>

                              {/* Red Star Separator */}
                              <div className="flex items-center justify-center text-red-600 text-xs">
                                ★ ★ ★
                              </div>

                              {/* Document Title */}
                              <h2 className="text-base sm:text-lg font-bold text-center text-slate-900 leading-snug pt-2">
                                关于开展《{record.title}》的通知公函
                              </h2>

                              {/* Content Body */}
                              <div className="text-xs sm:text-sm leading-relaxed space-y-3 pt-2 text-justify indent-6">
                                <p>
                                  各相关直属单位、学校、教研室及有关人员：
                                </p>
                                <p>
                                  为切实保障业务工作顺利开展与专业能力提升，经研究决定，组织安排{' '}
                                  <span className="font-bold underline decoration-slate-400 underline-offset-4">
                                    {record.applicantName}
                                  </span>{' '}
                                  同志于{' '}
                                  <span className="font-mono font-bold">
                                    {record.startTime ? record.startTime.slice(0, 10) : '2026-09-29'}
                                  </span>{' '}
                                  至{' '}
                                  <span className="font-mono font-bold">
                                    {record.endTime ? record.endTime.slice(0, 10) : '2026-09-29'}
                                  </span>{' '}
                                  前往{' '}
                                  <span className="font-bold underline decoration-slate-400 underline-offset-4">
                                    {record.destinations?.join('、') || '阜阳四中'}
                                  </span>{' '}
                                  参加“{record.title}”，行程计{' '}
                                  <span className="font-bold">{Math.max(1, Math.round(record.durationDays || 1))}</span> 天。
                                </p>
                                <p>
                                  请严格按照中央八项规定精神及机关差旅费管理办法执行，活动结束后凭本通知、公务出差审批单及合法票据按程序办理财务报销。
                                </p>
                              </div>

                              {/* Sign & Date */}
                              <div className="pt-8 text-right space-y-1">
                                <p className="font-bold">主管部门业务科室（代章）</p>
                                <p className="font-mono text-xs">
                                  {record.startTime ? record.startTime.slice(0, 10) : '2026-09-29'}
                                </p>
                              </div>

                              {/* Official Document Footer */}
                              <div className="pt-6 border-t border-slate-300 text-[11px] text-slate-500 flex justify-between">
                                <span>随附原始文件：{file.name}</span>
                                <span>印发份数：抄送报销联</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sheet Bottom Footer */}
                        <div className="pt-4 mt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-slate-700">
                              原件名称：{file.name}
                            </span>
                            <span>·</span>
                            <span>上传于：{file.uploadedAt || formatDate(record.createdAt)}</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            审批单号: {record.id} · A4 标准装订附单
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Bottom Control Footer */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                已选中 <strong>{selectedItems.length}</strong> 份官方文件 · 可直接批量打印或导出为多页 PDF
              </span>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-bold transition-all"
              >
                关闭
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={selectedItems.length === 0}
                className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 ${
                  selectedItems.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                    : 'bg-slate-400 cursor-not-allowed opacity-60'
                }`}
                title="一键将选中的官方文件按A4分页打印"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>一键打印到 A4 纸</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={selectedItems.length === 0 || isExportingPdf}
                className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95 ${
                  selectedItems.length > 0 && !isExportingPdf
                    ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
                    : 'bg-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? (exportProgress || '正在导出...') : '导出高清 PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
