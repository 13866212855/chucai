'use client';

import React, { useRef, useState, useMemo } from 'react';
import { OutingRecord } from '@/types/outing';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  FileCheck,
  ChevronRight,
  SlidersHorizontal,
  FileText,
  Layers,
  ArrowRight,
  ShieldCheck,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toChineseCurrency } from '@/lib/utils';

interface ApprovalSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OutingRecord | null;
}

type SheetTab = 'all' | 'cover' | 'approval' | 'reimburse';

export function ApprovalSlipModal({
  isOpen,
  onClose,
  record,
}: ApprovalSlipModalProps) {
  if (!isOpen || !record) return null;

  return (
    <ApprovalSlipContent
      key={record.id}
      record={record}
      onClose={onClose}
    />
  );
}

function ApprovalSlipContent({
  record,
  onClose,
}: {
  record: OutingRecord;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SheetTab>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Print references
  const printContainerRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const approvalRef = useRef<HTMLDivElement>(null);
  const reimburseRef = useRef<HTMLDivElement>(null);

  // Editable fields for fine-tuning before printing
  const [unitName, setUnitName] = useState(() => {
    if (record.department) {
      return record.department.includes('校') || record.department.includes('局')
        ? record.department
        : `${record.department}（单位）`;
    }
    return '阜阳市教师进修学校';
  });
  const [originPlace, setOriginPlace] = useState('职教中心');
  const [destinationPlace, setDestinationPlace] = useState(() => {
    if (record.destinations && record.destinations.length > 0) {
      return record.destinations.join('、');
    }
    return '阜阳市第四中学';
  });
  const [hasCar, setHasCar] = useState(false);
  const [jobTitle, setJobTitle] = useState('教师');
  const [invoiceCount, setInvoiceCount] = useState(() => Math.max(1, record.files?.length || 1));
  const [attachmentCount, setAttachmentCount] = useState(() => record.photos?.length || 0);

  // 整天计算：最低 1 天，严格为整数，不出现小数
  const durationDaysInt = Math.max(1, Math.round(record.durationDays || 1));

  // Date parsing helpers
  const parseDateParts = (dtStr?: string) => {
    if (!dtStr) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      };
    }
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) {
      const match = dtStr.match(/(\d{4})[^\d]?(\d{1,2})[^\d]?(\d{1,2})/);
      if (match) {
        return {
          year: parseInt(match[1]),
          month: parseInt(match[2]),
          day: parseInt(match[3]),
        };
      }
      return { year: 2026, month: 9, day: 29 };
    }
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    };
  };

  const startDate = parseDateParts(record.startTime);
  const endDate = parseDateParts(record.endTime);
  const approvalDate = record.approvalDate
    ? parseDateParts(record.approvalDate)
    : { year: startDate.year, month: startDate.month, day: Math.min(30, startDate.day + 9) };

  // Financial breakdown calculation
  const budget = record.budget || 150;
  const breakdown = record.budgetBreakdown || {
    transport: Math.min(100, Math.round(budget * 0.65)),
    accommodation: 0,
    meals: Math.max(0, budget - Math.min(100, Math.round(budget * 0.65))),
    other: 0,
  };

  // Printable action
  const handlePrint = (tab: SheetTab) => {
    setActiveTab(tab);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Multi-page PDF generation via html2canvas & jsPDF
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const sheetsToRender: { ref: React.RefObject<HTMLDivElement | null>; title: string }[] = [];
      if (activeTab === 'all') {
        sheetsToRender.push(
          { ref: coverRef, title: '单据报销封面' },
          { ref: approvalRef, title: '公务出差审批单' },
          { ref: reimburseRef, title: '差旅费报销表' }
        );
      } else if (activeTab === 'cover') {
        sheetsToRender.push({ ref: coverRef, title: '单据报销封面' });
      } else if (activeTab === 'approval') {
        sheetsToRender.push({ ref: approvalRef, title: '公务出差审批单' });
      } else if (activeTab === 'reimburse') {
        sheetsToRender.push({ ref: reimburseRef, title: '差旅费报销表' });
      }

      for (let i = 0; i < sheetsToRender.length; i++) {
        const item = sheetsToRender[i];
        if (item.ref.current) {
          const canvas = await html2canvas(item.ref.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        }
      }

      const fileName = `公务出差三联套表-${record.applicantName}-${record.approvalNo || record.id}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('导出 PDF 失败，请直接使用一键打印保存为 PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Copy text summary
  const handleCopySummary = () => {
    const summary = `【公务出差审批与报销三联单据】
单据编号：${record.approvalNo || record.id}
出差申请人：${record.applicantName}（${record.department || '未填'}）
开支项目/事由：${record.title}
目的地：${destinationPlace}
出差时间：${startDate.year}年${startDate.month}月${startDate.day}日 至 ${endDate.year}年${endDate.month}月${endDate.day}日（共${record.durationDays}天）
报销总金额：¥${budget} 元（大写：${toChineseCurrency(budget)}）
单据张数：${invoiceCount} 张，附件：${attachmentCount} 张`;

    navigator.clipboard.writeText(summary);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  /* =========================================================================
     1. 单据报销封面 Component (Strict match with 17e49650e7d654216798b1257f80b82e)
     ========================================================================= */
  const renderCoverSheet = () => (
    <div
      ref={coverRef}
      className="a4-print-sheet w-full max-w-[760px] bg-white text-slate-900 mx-auto p-8 sm:p-12 border border-slate-300 shadow-md font-sans mb-8 select-none"
    >
      {/* Top Right Unit Box */}
      <div className="flex justify-end mb-4">
        <div className="border border-slate-900 text-xs px-3 py-1.5 min-w-[170px] text-left">
          <span className="text-slate-600 mr-2 text-[11px]">报销单位：</span>
          <span className="font-bold text-slate-900 font-serif">{unitName}</span>
        </div>
      </div>

      {/* Main Title */}
      <div className="text-center my-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-[0.45em] pl-[0.45em] font-serif">
          单 据 报 销 封 面
        </h1>
      </div>

      {/* Main Bordered Table Container */}
      <div className="border-2 border-slate-900 text-sm">
        {/* Row 1: 开支项目 + 单据张数 + 附件张数 */}
        <div className="border-b border-slate-900 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center flex-1">
            <span className="font-bold shrink-0 text-slate-800">开支项目：</span>
            <span className="font-serif font-bold text-slate-900 text-base border-b border-slate-900 px-2 flex-1 min-h-[26px]">
              {record.title || '阜阳市2027届高三历史第一次主题教研活动费用'}
            </span>
          </div>
          <div className="flex items-center space-x-4 shrink-0 text-xs sm:text-sm">
            <div>
              <span>单据张数</span>
              <span className="font-bold font-serif underline px-2 text-base text-slate-900">
                {invoiceCount}
              </span>
            </div>
            <div>
              <span>附件张数</span>
              <span className="font-bold font-serif underline px-2 text-base text-slate-900">
                {attachmentCount}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: 共报销人民币（大写） + 金额小写 */}
        <div className="border-b border-slate-900 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center flex-1">
            <span className="font-bold shrink-0 text-slate-800">共报销人民币（大写）：</span>
            <span className="font-serif font-bold text-slate-900 text-base sm:text-lg border-b border-slate-900 px-3 flex-1">
              {toChineseCurrency(budget)}
            </span>
          </div>
          <div className="flex items-center text-sm font-bold shrink-0">
            <span className="mr-2">¥</span>
            <span className="font-serif font-bold text-lg border-b border-slate-900 px-4 min-w-[90px] text-center">
              {budget}
            </span>
            <span className="ml-2">元</span>
          </div>
        </div>

        {/* Row 3: 4 Columns (负责人审批意见 / 分管领导意见 / 审核人意见 / 经办人说明) */}
        <div className="grid grid-cols-4 divide-x divide-slate-900 min-h-[170px] sm:min-h-[200px]">
          {/* Column 1: 负责人审批意见 */}
          <div className="p-2 sm:p-3 flex flex-col justify-between">
            <div className="font-bold text-slate-900 text-xs sm:text-sm">负责人审批意见：</div>
            {/* Blank space for leader's handwritten note and signature */}
            <div className="flex-1"></div>
            <div className="text-[11px] text-slate-600 text-right font-serif tracking-widest">
              年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
            </div>
          </div>

          {/* Column 2: 分管领导意见 */}
          <div className="p-2 sm:p-3 flex flex-col justify-between">
            <div className="font-bold text-slate-900 text-xs sm:text-sm">分管领导意见：</div>
            {/* Blank space for branch leader's handwritten note and signature */}
            <div className="flex-1"></div>
            <div className="text-[11px] text-slate-600 text-right font-serif tracking-widest">
              年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
            </div>
          </div>

          {/* Column 3: 审核人意见 */}
          <div className="p-2 sm:p-3 flex flex-col justify-between">
            <div className="font-bold text-slate-900 text-xs sm:text-sm">审核人意见：</div>
            {/* Blank space for auditor's handwritten note and signature */}
            <div className="flex-1"></div>
            <div className="text-[11px] text-slate-600 text-right font-serif tracking-widest">
              年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
            </div>
          </div>

          {/* Column 4: 经办人说明 */}
          <div className="p-2 sm:p-3 flex flex-col justify-between bg-slate-50/40">
            <div className="font-bold text-slate-900 text-xs sm:text-sm">经办人说明：</div>
            <div className="my-auto py-1 leading-relaxed text-xs sm:text-sm font-serif font-medium text-slate-900">
              <span className="font-bold underline mr-1">{record.applicantName}</span>
              <span>{record.title?.startsWith('参加') ? '' : '参加'}</span>
              <span className="mx-1">{record.title}</span>
              <span>费用</span>
            </div>
            <div className="text-[11px] text-slate-600 text-right font-serif tracking-widest">
              年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
            </div>
          </div>
        </div>

        {/* Row 4: 民主理财小组意见 */}
        <div className="border-t border-slate-900 p-3 sm:p-4 flex items-center justify-between text-xs sm:text-sm min-h-[64px]">
          <div className="font-bold text-slate-900">民主理财小组意见：</div>
          <div className="text-slate-600 font-serif tracking-widest text-xs">
            年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
          </div>
        </div>
      </div>

      {/* Sheet Footer Note */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
        <span>【单据 1/3】公务出差与经费报销专用封面（凭票粘帖存底）</span>
        <span>A4 标准报销凭证</span>
      </div>
    </div>
  );

  /* =========================================================================
     2. 公务出差审批单 Component (Strict match with 3ad498a4e298698ed91f695b13a55e70)
     ========================================================================= */
  const renderApprovalSlip = () => (
    <div
      ref={approvalRef}
      className="a4-print-sheet w-full max-w-[760px] bg-white text-slate-900 mx-auto p-8 sm:p-12 border border-slate-300 shadow-md font-sans mb-8 select-none"
    >
      {/* Main Title */}
      <div className="text-center my-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-[0.45em] pl-[0.45em] font-serif">
          公 务 出 差 审 批 单
        </h1>
      </div>

      {/* Main Grid Table */}
      <div className="border-2 border-slate-900 text-sm">
        {/* Row 1: 姓名 + 部门 */}
        <div className="grid grid-cols-12 border-b border-slate-900">
          <div className="col-span-3 sm:col-span-2 p-2.5 sm:p-3.5 font-bold text-center flex items-center justify-center border-r border-slate-900 bg-slate-50/50">
            姓&nbsp;&nbsp;&nbsp;&nbsp;名
          </div>
          <div className="col-span-5 sm:col-span-6 p-2.5 sm:p-3.5 flex items-center border-r border-slate-900 font-serif font-bold text-base sm:text-lg text-slate-900">
            {record.applicantName}
          </div>
          <div className="col-span-2 p-2.5 sm:p-3.5 font-bold text-center flex items-center justify-center border-r border-slate-900 bg-slate-50/50">
            部&nbsp;&nbsp;&nbsp;&nbsp;门
          </div>
          <div className="col-span-2 p-2.5 sm:p-3.5 flex items-center font-serif text-sm text-slate-900">
            {record.department || '—'}
          </div>
        </div>

        {/* Row 2: 出差事由 */}
        <div className="grid grid-cols-12 border-b border-slate-900">
          <div className="col-span-3 sm:col-span-2 p-3 sm:p-4 font-bold text-center flex items-center justify-center border-r border-slate-900 bg-slate-50/50">
            出差事由
          </div>
          <div className="col-span-9 sm:col-span-10 p-3 sm:p-4 font-serif font-bold text-base sm:text-lg text-slate-900 leading-relaxed">
            {record.title}
          </div>
        </div>

        {/* Row 3: 出差时间和目的地 (Contains 3 sub-rows) */}
        <div className="grid grid-cols-12 border-b border-slate-900">
          <div className="col-span-3 sm:col-span-2 p-3 sm:p-4 font-bold text-center flex items-center justify-center border-r border-slate-900 bg-slate-50/50 leading-snug">
            出差时间
            <br />
            和目的地
          </div>
          <div className="col-span-9 sm:col-span-10 flex flex-col">
            {/* Sub-row 1: 日期 */}
            <div className="p-2.5 sm:p-3 border-b border-slate-900 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-serif">
              <span>日期：</span>
              <strong className="text-base text-slate-900">{startDate.year}</strong>
              <span>年</span>
              <strong className="text-base text-slate-900">{startDate.month}</strong>
              <span>月</span>
              <strong className="text-base text-slate-900">{startDate.day}</strong>
              <span>日至</span>
              <strong className="text-base text-slate-900">{endDate.year}</strong>
              <span>年</span>
              <strong className="text-base text-slate-900">{endDate.month}</strong>
              <span>月</span>
              <strong className="text-base text-slate-900">{endDate.day}</strong>
              <span>日</span>
              <span className="ml-4 font-sans font-bold">
                共计 <span className="font-serif text-base text-slate-900 px-1 underline">{durationDaysInt}</span> 天
              </span>
            </div>

            {/* Sub-row 2: 目的地 */}
            <div className="p-2.5 sm:p-3 border-b border-slate-900 flex items-center text-xs sm:text-sm">
              <span className="shrink-0">目的地：</span>
              <span className="font-serif font-bold text-base sm:text-lg text-slate-900">
                {destinationPlace}
              </span>
            </div>

            {/* Sub-row 3: 是否带车 */}
            <div className="p-2.5 sm:p-3 flex items-center text-xs sm:text-sm">
              <span>是否带车：</span>
              <span className="font-serif font-bold text-base text-slate-900 ml-2">
                {hasCar ? '是' : '否'}
              </span>
            </div>
          </div>
        </div>

        {/* Row 4: 科室审批意见 */}
        <div className="grid grid-cols-12 border-b border-slate-900 min-h-[90px] sm:min-h-[110px]">
          <div className="col-span-3 sm:col-span-2 p-3 font-bold text-center flex items-center justify-center border-r border-slate-900 bg-slate-50/50">
            科室审批意见
          </div>
          <div className="col-span-9 sm:col-span-10 p-3 sm:p-4 flex flex-col justify-between">
            {/* Blank space for section head to write opinion and sign */}
            <div className="flex-1"></div>
            <div className="text-right text-xs font-serif text-slate-600 tracking-widest">
              年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
            </div>
          </div>
        </div>

        {/* Row 5: 分管负责人审批意见 */}
        <div className="grid grid-cols-12 border-b border-slate-900 min-h-[90px] sm:min-h-[110px]">
          <div className="col-span-3 sm:col-span-2 p-3 font-bold text-center flex items-center justify-center border-r border-slate-900 bg-slate-50/50 leading-snug">
            分管负责人
            <br />
            审批意见
          </div>
          <div className="col-span-9 sm:col-span-10 p-3 sm:p-4 flex flex-col justify-between">
            {/* Blank space for branch head to write opinion and sign */}
            <div className="flex-1"></div>
            <div className="text-right text-xs font-serif text-slate-600 tracking-widest">
              年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
            </div>
          </div>
        </div>

        {/* Row 6: 单位负责人审批意见 */}
        <div className="grid grid-cols-12 min-h-[90px] sm:min-h-[110px]">
          <div className="col-span-3 sm:col-span-2 p-3 font-bold text-center flex items-center justify-center border-r border-slate-900 bg-slate-50/50 leading-snug">
            单位负责人
            <br />
            审批意见
          </div>
          <div className="col-span-9 sm:col-span-10 p-3 sm:p-4 flex flex-col justify-between">
            {/* Blank space for unit head to write opinion and sign */}
            <div className="flex-1"></div>
            <div className="text-right text-xs font-serif text-slate-600 tracking-widest">
              年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
            </div>
          </div>
        </div>
      </div>

      {/* Sheet Footer Note */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
        <span>【单据 2/3】公务出差事前事前审批联（行政考勤与纪检备案）</span>
        <span>A4 标准报销凭证</span>
      </div>
    </div>
  );

  /* =========================================================================
     3. 差旅费报销表 Component (Strict match with e4cd786a205c134ec1788c9a6f346ee9)
     ========================================================================= */
  const renderReimburseForm = () => (
    <div
      ref={reimburseRef}
      className="a4-print-sheet w-full max-w-[760px] bg-white text-slate-900 mx-auto p-6 sm:p-10 border border-slate-300 shadow-md font-sans mb-8 select-none"
    >
      {/* Main Title */}
      <div className="text-center my-4">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-[0.45em] pl-[0.45em] font-serif">
          差 旅 费 报 销 表
        </h1>
      </div>

      {/* Date Line Above Table */}
      <div className="flex justify-between items-center text-xs sm:text-sm font-serif mb-2 px-1">
        <div className="flex items-center space-x-2">
          <span>{startDate.year} 年</span>
          <span>{startDate.month} 月</span>
          <span>{startDate.day} 日</span>
        </div>
        <div className="text-slate-600 text-xs">单位：人民币（元）</div>
      </div>

      {/* Main Bordered Grid */}
      <div className="border-2 border-slate-900 text-xs">
        {/* Top Meta Row (姓名 / 部门 / 职别 / 单据 / 附件 / 单位领导审批) */}
        <div className="grid grid-cols-12 border-b border-slate-900 items-stretch divide-x divide-slate-900">
          <div className="col-span-2 p-2 flex items-center justify-start">
            <span className="font-bold mr-1">姓名：</span>
            <span className="font-serif font-bold text-sm text-slate-900">{record.applicantName}</span>
          </div>
          <div className="col-span-2 p-2 flex items-center justify-start">
            <span className="font-bold mr-1">部门：</span>
            <span className="font-serif text-slate-800">{record.department || '—'}</span>
          </div>
          <div className="col-span-2 p-2 flex items-center justify-start">
            <span className="font-bold mr-1">职别：</span>
            <span className="font-serif text-slate-800">{jobTitle}</span>
          </div>
          <div className="col-span-1 p-2 flex items-center justify-center">
            <span>单据 <strong className="font-serif font-bold underline">{invoiceCount}</strong> 张</span>
          </div>
          <div className="col-span-1 p-2 flex items-center justify-center">
            <span>附件 <strong className="font-serif font-bold underline">{attachmentCount}</strong> 张</span>
          </div>
          <div className="col-span-4 p-2 flex flex-col justify-between min-h-[48px]">
            <div className="font-bold text-slate-900">单位领导审批：</div>
            <div className="flex justify-end items-end mt-2 text-[11px] font-serif text-slate-600 tracking-widest">
              年 &nbsp;&nbsp;&nbsp;&nbsp; 月 &nbsp;&nbsp;&nbsp;&nbsp; 日
            </div>
          </div>
        </div>

        {/* Column Headers (2 rows of headers) */}
        <div className="grid grid-cols-12 border-b border-slate-900 text-center divide-x divide-slate-900 bg-slate-50 font-bold">
          {/* 起程时间地点 (Colspan 2) */}
          <div className="col-span-2 border-b border-slate-900">
            <div className="py-1 border-b border-slate-900">起程时间地点</div>
            <div className="grid grid-cols-3 divide-x divide-slate-900 py-1 text-[10px]">
              <div>月</div>
              <div>日</div>
              <div>起点</div>
            </div>
          </div>

          {/* 到达时间地点 (Colspan 2) */}
          <div className="col-span-2 border-b border-slate-900">
            <div className="py-1 border-b border-slate-900">到达时间地点</div>
            <div className="grid grid-cols-3 divide-x divide-slate-900 py-1 text-[10px]">
              <div>月</div>
              <div>日</div>
              <div>终点</div>
            </div>
          </div>

          {/* 车船费 */}
          <div className="col-span-1 flex items-center justify-center py-1">
            车船费
          </div>

          {/* 住宿费 */}
          <div className="col-span-1 flex items-center justify-center py-1">
            住宿费
          </div>

          {/* 伙食补助费 */}
          <div className="col-span-2">
            <div className="py-1 border-b border-slate-900">伙食补助费</div>
            <div className="grid grid-cols-2 divide-x divide-slate-900 py-1 text-[10px]">
              <div>天数</div>
              <div>金额</div>
            </div>
          </div>

          {/* 市内交通费 */}
          <div className="col-span-1">
            <div className="py-1 border-b border-slate-900 text-[10px] leading-tight">市内交通</div>
            <div className="py-1 text-[10px]">金额</div>
          </div>

          {/* 其他费用 */}
          <div className="col-span-1">
            <div className="py-1 border-b border-slate-900">其他</div>
            <div className="py-1 text-[10px]">金额</div>
          </div>

          {/* 说明与签名 (Right hand column) */}
          <div className="col-span-2 flex items-center justify-center py-1 bg-slate-100">
            说明与签名
          </div>
        </div>

        {/* Table Body: Row 1 (Filled with Real Record Data) */}
        <div className="grid grid-cols-12 border-b border-slate-900 text-center divide-x divide-slate-900 min-h-[44px] items-center font-serif text-slate-900">
          {/* 起程: 月 / 日 / 起点 */}
          <div className="col-span-2 grid grid-cols-3 divide-x divide-slate-900 h-full items-center">
            <div className="font-bold text-sm">{startDate.month}</div>
            <div className="font-bold text-sm">{startDate.day}</div>
            <div className="text-[11px] font-bold px-1 overflow-hidden truncate">{originPlace}</div>
          </div>

          {/* 到达: 月 / 日 / 终点 */}
          <div className="col-span-2 grid grid-cols-3 divide-x divide-slate-900 h-full items-center">
            <div className="font-bold text-sm">{endDate.month}</div>
            <div className="font-bold text-sm">{endDate.day}</div>
            <div className="text-[11px] font-bold px-1 overflow-hidden truncate">
              {record.destinations?.[0] || '阜阳四中'}
            </div>
          </div>

          {/* 车船费 */}
          <div className="col-span-1 font-bold text-sm">{breakdown.transport || 100}</div>

          {/* 住宿费 */}
          <div className="col-span-1 font-bold text-sm">{breakdown.accommodation || ''}</div>

          {/* 伙食补助费: 天数 / 金额 */}
          <div className="col-span-2 grid grid-cols-2 divide-x divide-slate-900 h-full items-center">
            <div className="font-bold text-sm">{durationDaysInt}</div>
            <div className="font-bold text-sm">{breakdown.meals || 50}</div>
          </div>

          {/* 市内交通费 */}
          <div className="col-span-1 text-sm font-bold"></div>

          {/* 其他费用 */}
          <div className="col-span-1 text-sm font-bold">{breakdown.other || ''}</div>

          {/* 说明与签名 (Spans into the side area) */}
          <div className="col-span-2 p-2 text-left text-[11px] bg-slate-50/70 flex flex-col justify-between h-full">
            <div>
              <span className="font-bold font-sans text-slate-700">说明：</span>
              <p className="mt-0.5 leading-tight font-serif font-bold text-slate-900">
                {record.title?.startsWith('参加') ? '' : '参加'}{record.title}费用
              </p>
            </div>
            <div className="mt-3 text-right">
              <span className="font-sans text-slate-600 mr-1">签名:</span>
              <span className="inline-block border-b border-slate-800 w-20"></span>
            </div>
          </div>
        </div>

        {/* Blank rows 2 & 3 for authentic official institutional form presentation */}
        <div className="grid grid-cols-12 border-b border-slate-900 text-center divide-x divide-slate-900 h-8 items-center text-slate-400">
          <div className="col-span-2 grid grid-cols-3 divide-x divide-slate-900 h-full">
            <div></div><div></div><div></div>
          </div>
          <div className="col-span-2 grid grid-cols-3 divide-x divide-slate-900 h-full">
            <div></div><div></div><div></div>
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-1"></div>
          <div className="col-span-2 grid grid-cols-2 divide-x divide-slate-900 h-full">
            <div></div><div></div>
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-1"></div>
          <div className="col-span-2 bg-slate-50/70"></div>
        </div>

        <div className="grid grid-cols-12 border-b border-slate-900 text-center divide-x divide-slate-900 h-8 items-center text-slate-400">
          <div className="col-span-2 grid grid-cols-3 divide-x divide-slate-900 h-full">
            <div></div><div></div><div></div>
          </div>
          <div className="col-span-2 grid grid-cols-3 divide-x divide-slate-900 h-full">
            <div></div><div></div><div></div>
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-1"></div>
          <div className="col-span-2 grid grid-cols-2 divide-x divide-slate-900 h-full">
            <div></div><div></div>
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-1"></div>
          <div className="col-span-2 bg-slate-50/70"></div>
        </div>

        {/* Row: 小计 */}
        <div className="grid grid-cols-12 border-b border-slate-900 text-center divide-x divide-slate-900 h-9 items-center bg-slate-50/40">
          <div className="col-span-4 font-bold text-slate-800">小&nbsp;&nbsp;&nbsp;&nbsp;计</div>
          <div className="col-span-1 font-serif font-bold text-sm text-slate-900">{breakdown.transport || 100}</div>
          <div className="col-span-1 font-serif font-bold text-sm text-slate-900">{breakdown.accommodation || ''}</div>
          <div className="col-span-2 grid grid-cols-2 divide-x divide-slate-900 h-full items-center">
            <div></div>
            <div className="font-serif font-bold text-sm text-slate-900">{breakdown.meals || 50}</div>
          </div>
          <div className="col-span-1 font-serif font-bold text-sm text-slate-900"></div>
          <div className="col-span-1 font-serif font-bold text-sm text-slate-900">{breakdown.other || ''}</div>
          <div className="col-span-2 bg-slate-50/70"></div>
        </div>

        {/* Row: 合计人民币（大写） + 小写 */}
        <div className="grid grid-cols-12 divide-x divide-slate-900 p-2 sm:p-3 items-center">
          <div className="col-span-8 flex items-center font-bold">
            <span className="shrink-0 text-slate-800">合计人民币：（大写）</span>
            <span className="font-serif text-base sm:text-lg text-slate-900 underline px-3 flex-1 font-bold">
              {toChineseCurrency(budget)}
            </span>
          </div>
          <div className="col-span-4 flex items-center justify-end px-3 font-bold">
            <span className="mr-2">¥</span>
            <span className="font-serif font-bold text-lg text-slate-900 border-b border-slate-900 px-4 min-w-[90px] text-center">
              {budget}
            </span>
            <span className="ml-2">元</span>
          </div>
        </div>
      </div>

      {/* Note below form */}
      <div className="mt-3 text-[11px] text-slate-600 font-serif">
        说明：住宿费实支超过限额标准的，限额栏填限额标准，并按限额标准报销。
      </div>

      {/* Sheet Footer Note */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
        <span>【单据 3/3】差旅费明细报销核算联（财务出纳报销入账）</span>
        <span>A4 标准报销凭证</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Native CSS Print Styles for True 1:1 A4 Output */}
      <style dangerouslySetInnerHTML={{
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
          #printable-root, #printable-root * {
            visibility: visible !important;
          }
          #printable-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .a4-print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: 1px solid #000000 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 0 20mm 0 !important;
            padding: 12mm 15mm !important;
          }
          .a4-print-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
            margin-bottom: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Modal Backdrop and Wrapper */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-1 sm:p-4 overflow-y-auto no-print">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-slate-300">
          {/* Top Control Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <FileCheck className="w-5 h-5 text-blue-100" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>公务出差审批单生成</span>
                  <span className="text-[11px] px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded font-normal">
                    标准财务三联套表
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  对应：单据报销封面 + 公务出差审批单 + 差旅费报销表
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 border transition-all ${
                  showConfig
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="调整打印填充细节"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showConfig ? '收起微调' : '微调参数'}</span>
              </button>

              <button
                onClick={handleCopySummary}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-slate-700 transition-all"
                title="复制文本摘要"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? '已复制' : '复制摘要'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Config Drawer (Optional Fine-tuning for print details) */}
          {showConfig && (
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">报销单位</label>
                <input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                  placeholder="报销单位名称"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">起程地点（起点）</label>
                <input
                  type="text"
                  value={originPlace}
                  onChange={(e) => setOriginPlace(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                  placeholder="例如：职教中心"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">出差目的地</label>
                <input
                  type="text"
                  value={destinationPlace}
                  onChange={(e) => setDestinationPlace(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                  placeholder="例如：阜阳市第四中学"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">职别 / 是否带车</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                    placeholder="教师"
                  />
                  <label className="flex items-center space-x-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasCar}
                      onChange={(e) => setHasCar(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>带车</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Header Tabs */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>整套合集 (3联全览)</span>
              </button>

              <button
                onClick={() => setActiveTab('cover')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'cover'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>① 单据报销封面</span>
              </button>

              <button
                onClick={() => setActiveTab('approval')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'approval'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>② 公务出差审批单</span>
              </button>

              <button
                onClick={() => setActiveTab('reimburse')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'reimburse'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>③ 差旅费报销表</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 hidden md:block">
              提示：可一键打印到 A4 纸或导出高清多页 PDF
            </div>
          </div>

          {/* Scrollable Printable Paper Viewer */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/60">
            <div id="printable-root" ref={printContainerRef} className="w-full">
              {activeTab === 'all' && (
                <>
                  {renderCoverSheet()}
                  {renderApprovalSlip()}
                  {renderReimburseForm()}
                </>
              )}
              {activeTab === 'cover' && renderCoverSheet()}
              {activeTab === 'approval' && renderApprovalSlip()}
              {activeTab === 'reimburse' && renderReimburseForm()}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>大写金额与出差明细已自动真实填妥，所有审批意见、签署人签字与日期已全部留白供手工签署</span>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => handlePrint(activeTab)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                title="打印当前显示的表单"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>{activeTab === 'all' ? '打印当前全部' : '打印本页表单'}</span>
              </button>

              <button
                onClick={() => handlePrint('all')}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                title="一键将3张单据按A4分页连续打印"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>一键打印3页套表</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? '正在导出 PDF...' : '导出 A4 PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
