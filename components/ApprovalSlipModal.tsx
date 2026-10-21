'use client';

import React, { useRef, useState } from 'react';
import { OutingRecord } from '@/types/outing';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  FileCheck,
  MapPin,
  Calendar,
  Share2,
  FileText,
  ShieldCheck,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ApprovalSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OutingRecord | null;
}

export function ApprovalSlipModal({
  isOpen,
  onClose,
  record,
}: ApprovalSlipModalProps) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen || !record) return null;

  // Convert numbers to Chinese RMB uppercase (金额转中文大写)
  const toChineseCurrency = (num: number): string => {
    if (!num || isNaN(num)) return '零元整';
    const fraction = ['角', '分'];
    const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unit = [
      ['元', '万', '亿'],
      ['', '拾', '佰', '仟'],
    ];
    let head = num < 0 ? '欠' : '';
    num = Math.abs(num);
    let s = '';
    for (let i = 0; i < fraction.length; i++) {
      s += (digit[Math.floor(num * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
    }
    s = s || '整';
    num = Math.floor(num);
    for (let i = 0; i < unit[0].length && num > 0; i++) {
      let p = '';
      for (let j = 0; j < unit[1].length && num > 0; j++) {
        p = digit[num % 10] + unit[1][j] + p;
        num = Math.floor(num / 10);
      }
      s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
    }
    return head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
  };

  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return '-';
    return dtStr.replace('T', ' ');
  };

  // Export to standard PDF using html2canvas & jsPDF
  const handleExportPdf = async () => {
    if (!paperRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = paperRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for crisp printing
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `公务出差审批单-${record.approvalNo || record.id}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('导出 PDF 遇到问题，请重试');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export as Long Image
  const handleExportImage = async () => {
    if (!paperRef.current) return;
    setIsExportingImage(true);

    try {
      const canvas = await html2canvas(paperRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `公务出差审批单-${record.approvalNo || record.id}.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('导出图片失败，请重试');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Copy text summary to clipboard
  const handleCopySummary = () => {
    const route = record.destinations?.join(' ➔ ') || '未注明';
    const text = `【公务出差审批单】
单据编号：${record.approvalNo || record.id}
申请人员：${record.applicantName}（${record.department || '未填'}）
出差类型：${record.activityType}
出差事由：${record.title}
行程路线：${route}
起止时间：${formatDateTime(record.startTime)} 至 ${formatDateTime(record.endTime)}
预计天数：${record.durationDays} 天
费用预算：¥${record.budget?.toLocaleString() || 0}
审批状态：${record.status}
填报时间：${record.approvalDate || record.createdAt.slice(0, 10)}`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const isApproved = record.status === '已审批' || record.status === '已归档';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-slate-300">
        {/* Modal Top Control Bar */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/50 flex items-center justify-center text-blue-200">
              <FileCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>公务出差审批单生成</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-normal">
                  标准企业A4版式
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">单据号：{record.approvalNo || record.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySummary}
              className="text-xs bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-slate-700 transition-all"
              title="复制文本摘要"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copySuccess ? '已复制' : '复制摘要'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Document Paper Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/70 flex justify-center">
          {/* Printable Official Paper Container */}
          <div
            ref={paperRef}
            id="approval-slip-paper"
            className="w-full max-w-[595px] bg-white text-slate-900 p-5 sm:p-8 shadow-md rounded-sm border border-slate-300 font-sans relative"
          >
            {/* Red Corporate Header Bar */}
            <div className="border-b-2 border-rose-700 pb-3 mb-4 text-center relative">
              <div className="text-[11px] tracking-widest text-slate-500 uppercase font-semibold">
                ENTERPRISE OFFICIAL BUSINESS TRAVEL APPROVAL
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-rose-800 tracking-wider my-1">
                公 务 出 差 审 批 单
              </h1>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 px-1">
                <span>
                  单据编号：<strong className="font-mono text-slate-800">{record.approvalNo || record.id}</strong>
                </span>
                <span>
                  申请日期：{record.approvalDate || record.createdAt.slice(0, 10)}
                </span>
              </div>
            </div>

            {/* Official Grid Table */}
            <div className="border border-slate-800 text-xs">
              {/* Row 1: Applicant & Dept */}
              <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                <div className="bg-slate-100 p-2 font-bold text-center flex items-center justify-center">
                  出差申请人
                </div>
                <div className="p-2 flex items-center font-medium">
                  {record.applicantName}
                </div>
                <div className="bg-slate-100 p-2 font-bold text-center flex items-center justify-center">
                  所属部门
                </div>
                <div className="p-2 flex items-center font-medium">
                  {record.department || '技术研发中心'}
                </div>
              </div>

              {/* Row 2: Type & Duration */}
              <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                <div className="bg-slate-100 p-2 font-bold text-center flex items-center justify-center">
                  活动类型
                </div>
                <div className="p-2 flex items-center">
                  <span className="font-semibold text-blue-900">{record.activityType}</span>
                </div>
                <div className="bg-slate-100 p-2 font-bold text-center flex items-center justify-center">
                  预计总天数
                </div>
                <div className="p-2 flex items-center font-bold font-mono text-blue-900">
                  {record.durationDays} 天
                </div>
              </div>

              {/* Row 3: Itinerary Route (Multi-stops) */}
              <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                <div className="bg-slate-100 p-2 font-bold text-center flex items-center justify-center">
                  出差目的地
                  <br />
                  <span className="text-[10px] text-slate-500 font-normal">（多段行程）</span>
                </div>
                <div className="col-span-3 p-2 font-medium">
                  <div className="flex items-center flex-wrap gap-1.5">
                    {record.destinations && record.destinations.length > 0 ? (
                      record.destinations.map((city, idx) => (
                        <React.Fragment key={idx}>
                          <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-300 font-bold">
                            {city}
                          </span>
                          {idx < record.destinations.length - 1 && (
                            <span className="text-slate-400 font-bold">➔</span>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <span>未注明</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Exact Times */}
              <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                <div className="bg-slate-100 p-2 font-bold text-center flex items-center justify-center">
                  出差起止时间
                </div>
                <div className="col-span-3 p-2 font-medium font-mono">
                  {formatDateTime(record.startTime)} 至 {formatDateTime(record.endTime)}
                </div>
              </div>

              {/* Row 5: Title / Objective */}
              <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                <div className="bg-slate-100 p-2 font-bold text-center flex items-center justify-center">
                  出差事由及
                  <br />
                  主要任务
                </div>
                <div className="col-span-3 p-2.5 leading-relaxed font-normal">
                  <p className="font-semibold text-slate-900 mb-1">{record.title}</p>
                  {record.notes && (
                    <p className="text-slate-600 text-[11px] mt-1 bg-slate-50 p-1.5 rounded">
                      <strong className="text-slate-700">补充说明：</strong>{record.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 6: Budget Breakdown Table */}
              <div className="border-b border-slate-800">
                <div className="bg-slate-100 p-1.5 font-bold text-center border-b border-slate-800">
                  出差经费预算明细（单位：人民币 元）
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-800 text-center border-b border-slate-300 text-[11px]">
                  <div className="py-1 bg-slate-50 text-slate-600">城际交通费</div>
                  <div className="py-1 bg-slate-50 text-slate-600">住宿费用</div>
                  <div className="py-1 bg-slate-50 text-slate-600">餐饮补助</div>
                  <div className="py-1 bg-slate-50 text-slate-600">公杂及其他</div>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-800 text-center font-mono py-1.5 font-medium">
                  <div>¥{record.budgetBreakdown?.transport?.toLocaleString() || '0'}</div>
                  <div>¥{record.budgetBreakdown?.accommodation?.toLocaleString() || '0'}</div>
                  <div>¥{record.budgetBreakdown?.meals?.toLocaleString() || '0'}</div>
                  <div>¥{record.budgetBreakdown?.other?.toLocaleString() || '0'}</div>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-800 border-t border-slate-800 bg-blue-50/40 p-2">
                  <div className="font-bold text-center flex items-center justify-center">
                    预算合计总金额
                  </div>
                  <div className="col-span-3 flex items-center justify-between font-bold px-2">
                    <span className="text-blue-900 font-mono text-sm">
                      ¥{record.budget?.toLocaleString() || '0'} 元
                    </span>
                    <span className="text-slate-700 text-[11px]">
                      大写：{toChineseCurrency(record.budget || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 7: Attachments list */}
              <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                <div className="bg-slate-100 p-2 font-bold text-center flex items-center justify-center">
                  随附凭据说明
                </div>
                <div className="col-span-3 p-2 text-[11px] text-slate-700">
                  <span>包含任务通知/公函文件：<strong>{record.files?.length || 0}</strong> 份</span>
                  <span className="mx-2">|</span>
                  <span>留存现场工作照片：<strong>{record.photos?.length || 0}</strong> 张</span>
                  {record.files?.length > 0 && (
                    <div className="mt-1 text-slate-500 font-mono text-[10px]">
                      附件清单：{record.files.map((f) => f.name).join('；')}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 8: Signatures & Approvals Multi-columns */}
              <div className="grid grid-cols-3 divide-x divide-slate-800 min-h-[95px] relative">
                {/* Column 1: Applicant Signature */}
                <div className="p-2.5 flex flex-col justify-between">
                  <span className="font-bold text-slate-700">申请人签名：</span>
                  <div className="my-2 pl-2">
                    <span className="font-serif italic text-base text-slate-800 font-bold">
                      {record.applicantName}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    日期：{record.approvalDate || record.createdAt.slice(0, 10)}
                  </div>
                </div>

                {/* Column 2: Department Head Signature */}
                <div className="p-2.5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">部门负责人审批意见：</span>
                  </div>
                  <div className="text-[11px] my-1 text-slate-700">
                    {record.approverNote || (isApproved ? '同意出差，请注意差旅安全，保质完成任务。' : '审核中...')}
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between items-end">
                    <span>签名：{record.approverName || (isApproved ? '李建华' : '________')}</span>
                    <span>状态：{record.status}</span>
                  </div>

                  {/* Stamp Graphic when Approved */}
                  {isApproved && (
                    <div className="absolute right-1 bottom-1 w-20 h-20 rounded-full border-2 border-rose-600/70 text-rose-600/80 flex flex-col items-center justify-center -rotate-12 pointer-events-none select-none">
                      <span className="text-[8px] tracking-widest font-black uppercase">ENTERPRISE OA</span>
                      <span className="text-xs font-black tracking-widest my-0.5">【已准予】</span>
                      <span className="text-[8px] font-mono">{record.approvalDate || '2025.05.10'}</span>
                    </div>
                  )}
                </div>

                {/* Column 3: Finance & Disbursal Audit */}
                <div className="p-2.5 flex flex-col justify-between">
                  <span className="font-bold text-slate-700">财务部/综合部核准：</span>
                  <div className="text-[11px] text-slate-600 my-1">
                    {isApproved ? '出差预算核定无误，符合差旅报销标准。' : '等待出差返回凭票核销'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    经办人签名：{isApproved ? '王财务（已核准）' : '________'}
                  </div>
                </div>
              </div>
            </div>

            {/* Official Document Footer Notice */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span>备注：本单据为正式财务报销与考勤归档原始凭据，请于出差返回后 5 个工作日内附原始发票办理核销。</span>
              <span className="font-mono">第 1 页 / 共 1 页</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>符合企业出差规范，可直接打印或归档</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-export-image"
              onClick={handleExportImage}
              disabled={isExportingImage}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>{isExportingImage ? '正在生成...' : '保存长图'}</span>
            </button>

            <button
              id="btn-export-pdf"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? '正在导出 PDF...' : '导出标准 PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
