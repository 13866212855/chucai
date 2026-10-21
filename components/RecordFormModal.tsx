'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  OutingRecord,
  ActivityType,
  ApprovalStatus,
  FileAttachment,
  PhotoAttachment,
  BudgetBreakdown,
} from '@/types/outing';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Upload,
  FileText,
  Camera,
  CheckCircle2,
  Save,
  Eye,
  RotateCcw,
  Sparkles,
  Paperclip,
} from 'lucide-react';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: Partial<OutingRecord>) => Promise<void>;
  initialData?: OutingRecord | null;
  latestRecord?: OutingRecord | null;
  onAutoSaveDraft?: (draftData: Partial<OutingRecord>) => void;
}

const LAST_FORM_STORAGE_KEY = 'outing_last_form_data';

export interface FormPersistenceState {
  applicantName: string;
  department: string;
  activityType: ActivityType;
  title: string;
  destinations: string[];
  startTime?: string;
  endTime?: string;
  durationDays?: number;
  budgetBreakdown: BudgetBreakdown;
  status: ApprovalStatus;
  notes: string;
}

// Top-level calculation helper
function computeDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 1;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0.5;

  const diffHours = diffMs / (1000 * 60 * 60);
  let days = Math.round((diffHours / 24) * 2) / 2;
  return days < 0.5 ? 0.5 : days;
}

function getDefaultTimes() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 18, 0);

  const formatIsoInput = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  const s = formatIsoInput(start);
  const e = formatIsoInput(end);
  return { start: s, end: e, days: computeDays(s, e) };
}

// Retrieve initial form values remembering previous submission
function getInitialFormValues(
  initialData?: OutingRecord | null,
  latestRecord?: OutingRecord | null
): FormPersistenceState & { isLoadedFromPrevious: boolean } {
  // If editing an existing record, use that record strictly
  if (initialData) {
    return {
      applicantName: initialData.applicantName || '张伟',
      department: initialData.department || '技术研发中心',
      activityType: initialData.activityType || '出差',
      title: initialData.title || '',
      destinations:
        initialData.destinations && initialData.destinations.length >= 2
          ? initialData.destinations
          : ['耿棚', '颍上'],
      startTime: initialData.startTime,
      endTime: initialData.endTime,
      durationDays: initialData.durationDays,
      budgetBreakdown: initialData.budgetBreakdown || {
        transport: 1800,
        accommodation: 1400,
        meals: 600,
        other: 200,
      },
      status: initialData.status || '待审批',
      notes: initialData.notes || '',
      isLoadedFromPrevious: false,
    };
  }

  // Check localStorage for last saved form input
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LAST_FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            applicantName: parsed.applicantName || '张伟',
            department: parsed.department || '技术研发中心',
            activityType: parsed.activityType || '出差',
            title: parsed.title || '',
            destinations:
              Array.isArray(parsed.destinations) && parsed.destinations.length >= 2
                ? parsed.destinations
                : ['耿棚', '颍上'],
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            durationDays: parsed.durationDays,
            budgetBreakdown: parsed.budgetBreakdown || {
              transport: 1800,
              accommodation: 1400,
              meals: 600,
              other: 200,
            },
            status: parsed.status || '待审批',
            notes: parsed.notes || '',
            isLoadedFromPrevious: true,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  // If no localStorage, fallback to the latest record in database
  if (latestRecord) {
    return {
      applicantName: latestRecord.applicantName || '张伟',
      department: latestRecord.department || '技术研发中心',
      activityType: latestRecord.activityType || '出差',
      title: latestRecord.title || '',
      destinations:
        latestRecord.destinations && latestRecord.destinations.length >= 2
          ? latestRecord.destinations
          : ['耿棚', '颍上'],
      startTime: latestRecord.startTime,
      endTime: latestRecord.endTime,
      durationDays: latestRecord.durationDays,
      budgetBreakdown: latestRecord.budgetBreakdown || {
        transport: 1800,
        accommodation: 1400,
        meals: 600,
        other: 200,
      },
      status: latestRecord.status || '待审批',
      notes: latestRecord.notes || '',
      isLoadedFromPrevious: true,
    };
  }

  // Default values with 耿棚 as requested
  return {
    applicantName: '张伟',
    department: '技术研发中心',
    activityType: '出差',
    title: '',
    destinations: ['耿棚', '颍上'],
    budgetBreakdown: {
      transport: 1800,
      accommodation: 1400,
      meals: 600,
      other: 200,
    },
    status: '待审批',
    notes: '',
    isLoadedFromPrevious: false,
  };
}

// Extract files from DragEvent or ClipboardEvent (supporting WeChat desktop and browser)
function extractFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  const files: File[] = [];

  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const f = dataTransfer.files[i];
      if (f) files.push(f);
    }
  } else if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
  }
  return files;
}

// WeChat Icon Component
function WeChatIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} fill-current`} viewBox="0 0 24 24">
      <path d="M8.5 2C4.36 2 1 4.91 1 8.5c0 2.02 1.05 3.82 2.69 5.02L3 17l3.81-1.3c.53.13 1.1.2 1.69.2.2 0 .4 0 .6-.02-.12-.45-.19-.92-.19-1.4 0-3.31 3.13-6 7-6 .48 0 .95.05 1.4.14C16.5 5.06 12.87 2 8.5 2zm-2.25 4.5c.69 0 1.25.56 1.25 1.25S6.94 9 6.25 9 5 8.44 5 7.75s.56-1.25 1.25-1.25zm4.5 0c.69 0 1.25.56 1.25 1.25S11.44 9 10.75 9 9.5 8.44 9.5 7.75s.56-1.25 1.25-1.25zM16 9.5c-3.31 0-6 2.24-6 5s2.69 5 6 5c.48 0 .94-.05 1.38-.15L20.5 21l-.73-2.61C20.9 17.38 22 15.79 22 14.5c0-2.76-2.69-5-6-5zm-2 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
    </svg>
  );
}

// Inner Form Component mounted fresh each time modal opens
function RecordFormContent({
  onClose,
  onSave,
  initialData,
  latestRecord,
  onAutoSaveDraft,
}: {
  onClose: () => void;
  onSave: (recordData: Partial<OutingRecord>) => Promise<void>;
  initialData?: OutingRecord | null;
  latestRecord?: OutingRecord | null;
  onAutoSaveDraft?: (draftData: Partial<OutingRecord>) => void;
}) {
  const defaultTimes = getDefaultTimes();
  const initialValues = useMemo(
    () => getInitialFormValues(initialData, latestRecord),
    [initialData, latestRecord]
  );

  // Step in 3-step wizard (1: 基本信息与行程, 2: 时间与预算, 3: 凭据与照片)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSavedTip, setDraftSavedTip] = useState<string | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState<boolean>(initialValues.isLoadedFromPrevious);

  // Form State initialized from previous values or initialData
  const [applicantName, setApplicantName] = useState(initialValues.applicantName);
  const [department, setDepartment] = useState(initialValues.department);
  const [activityType, setActivityType] = useState<ActivityType>(initialValues.activityType);
  const [title, setTitle] = useState(initialValues.title);
  const [destinations, setDestinations] = useState<string[]>(initialValues.destinations);

  const [startTime, setStartTime] = useState(initialValues.startTime || defaultTimes.start);
  const [endTime, setEndTime] = useState(initialValues.endTime || defaultTimes.end);
  const [durationDays, setDurationDays] = useState<number>(
    initialValues.durationDays ||
      computeDays(
        initialValues.startTime || defaultTimes.start,
        initialValues.endTime || defaultTimes.end
      )
  );

  const [budgetBreakdown, setBudgetBreakdown] = useState<BudgetBreakdown>(
    initialValues.budgetBreakdown
  );

  // Derive totalBudget from breakdown
  const totalBudget = useMemo(() => {
    return (
      (Number(budgetBreakdown.transport) || 0) +
      (Number(budgetBreakdown.accommodation) || 0) +
      (Number(budgetBreakdown.meals) || 0) +
      (Number(budgetBreakdown.other) || 0)
    );
  }, [budgetBreakdown]);

  const [status, setStatus] = useState<ApprovalStatus>(initialValues.status);
  const [notes, setNotes] = useState(initialValues.notes);
  const [files, setFiles] = useState<FileAttachment[]>(initialData?.files || []);
  const [photos, setPhotos] = useState<PhotoAttachment[]>(initialData?.photos || []);

  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Drag-and-drop states for WeChat & file dragging
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const showUploadFeedback = (msg: string) => {
    setUploadFeedback(msg);
    setTimeout(() => setUploadFeedback(null), 3500);
  };

  // Helper to persist current form state to localStorage
  const persistCurrentForm = (overrides?: Partial<FormPersistenceState>) => {
    if (typeof window === 'undefined') return;
    try {
      const stateToSave: FormPersistenceState = {
        applicantName,
        department,
        activityType,
        title,
        destinations: destinations.filter((d) => d.trim()),
        startTime,
        endTime,
        durationDays,
        budgetBreakdown,
        status,
        notes,
        ...overrides,
      };
      localStorage.setItem(LAST_FORM_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // ignore
    }
  };

  // Reset form to blank template
  const handleResetToClean = () => {
    const times = getDefaultTimes();
    setApplicantName('张伟');
    setDepartment('技术研发中心');
    setActivityType('出差');
    setTitle('');
    setDestinations(['耿棚', '颍上']);
    setStartTime(times.start);
    setEndTime(times.end);
    setDurationDays(times.days);
    setBudgetBreakdown({
      transport: 1800,
      accommodation: 1400,
      meals: 600,
      other: 200,
    });
    setStatus('待审批');
    setNotes('');
    setIsAutoFilled(false);
    setDraftSavedTip('已清空表单并重置为初始模板');
    setTimeout(() => setDraftSavedTip(null), 2000);
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const newDays = computeDays(val, endTime);
    setDurationDays(newDays);
    persistCurrentForm({ startTime: val, durationDays: newDays });
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    const newDays = computeDays(startTime, val);
    setDurationDays(newDays);
    persistCurrentForm({ endTime: val, durationDays: newDays });
  };

  const handleDestinationChange = (index: number, value: string) => {
    const updated = [...destinations];
    updated[index] = value;
    setDestinations(updated);
    persistCurrentForm({ destinations: updated });
  };

  const addDestination = () => {
    const updated = [...destinations, ''];
    setDestinations(updated);
    persistCurrentForm({ destinations: updated });
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 2) return;
    const updated = destinations.filter((_, i) => i !== index);
    setDestinations(updated);
    persistCurrentForm({ destinations: updated });
  };

  // Batch process files (from file input, WeChat drag, or clipboard paste)
  const processFiles = (fileList: File[]) => {
    if (!fileList || fileList.length === 0) return;

    let processedCount = 0;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newFile: FileAttachment = {
          id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name || `通知附件_${Date.now()}`,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
        setFiles((prev) => [...prev, newFile]);
        processedCount++;
        if (processedCount === fileList.length) {
          showUploadFeedback(`已成功导入 ${fileList.length} 个文件/批复通知`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Batch process photos (from file input, WeChat drag, or clipboard paste)
  const processPhotos = (fileList: File[]) => {
    if (!fileList || fileList.length === 0) return;

    // Filter image files
    const validImages = fileList.filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(f.name)
    );

    if (validImages.length === 0) {
      alert('请拖入或选择图片格式文件（JPG/PNG/WEBP 等）');
      return;
    }

    let processedCount = 0;
    validImages.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newPhoto: PhotoAttachment = {
          id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name || `现场照片_${Date.now()}`,
          size: file.size,
          type: file.type || 'image/jpeg',
          dataUrl,
          takenAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
        setPhotos((prev) => [...prev, newPhoto]);
        processedCount++;
        if (processedCount === validImages.length) {
          showUploadFeedback(`已成功导入 ${validImages.length} 张现场照片`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Native input change handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processPhotos(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  // Drag & Drop handlers for Files (WeChat / desktop)
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFile(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const droppedFiles = extractFiles(e.dataTransfer);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleFilePaste = (e: React.ClipboardEvent) => {
    const pastedFiles = extractFiles(e.clipboardData);
    if (pastedFiles.length > 0) {
      e.preventDefault();
      processFiles(pastedFiles);
    }
  };

  // Drag & Drop handlers for Photos (WeChat / desktop)
  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingPhoto) setIsDraggingPhoto(true);
  };

  const handlePhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingPhoto(false);
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    const droppedFiles = extractFiles(e.dataTransfer);
    if (droppedFiles.length > 0) {
      processPhotos(droppedFiles);
    }
  };

  const handlePhotoPaste = (e: React.ClipboardEvent) => {
    const pastedFiles = extractFiles(e.clipboardData);
    if (pastedFiles.length > 0) {
      e.preventDefault();
      processPhotos(pastedFiles);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveDraft = async () => {
    persistCurrentForm();

    const draftPayload: Partial<OutingRecord> = {
      applicantName,
      department,
      activityType,
      title: title || '未命名外出活动草稿',
      destinations: destinations.filter((d) => d.trim()),
      startTime,
      endTime,
      durationDays,
      budget: totalBudget,
      budgetBreakdown,
      status: '草稿',
      notes,
      files,
      photos,
      isDraft: true,
    };

    if (onAutoSaveDraft) {
      onAutoSaveDraft(draftPayload);
    }

    try {
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPayload),
      }).catch(() => null);

      setDraftSavedTip('草稿已安全保存！并已同步记录表单数据');
      setTimeout(() => setDraftSavedTip(null), 2500);
    } catch {
      setDraftSavedTip('草稿已存储于本地');
      setTimeout(() => setDraftSavedTip(null), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('请填写活动主题/事由');
      setCurrentStep(1);
      return;
    }

    const validDestinations = destinations.filter((d) => d.trim().length > 0);
    if (validDestinations.length === 0) {
      alert('请至少填写一个目的地');
      setCurrentStep(1);
      return;
    }

    // Always remember this submission as the last filled content
    persistCurrentForm({
      applicantName,
      department,
      activityType,
      title: title.trim(),
      destinations: validDestinations,
      startTime,
      endTime,
      durationDays,
      budgetBreakdown,
      status: status === '草稿' ? '待审批' : status,
      notes: notes.trim(),
    });

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialData?.id,
        applicantName,
        department,
        activityType,
        title: title.trim(),
        destinations: validDestinations,
        startTime,
        endTime,
        durationDays,
        budget: totalBudget,
        budgetBreakdown,
        status: status === '草稿' ? '待审批' : status,
        notes: notes.trim(),
        files,
        photos,
        isDraft: false,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || '保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
      {/* Modal Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/40 flex items-center justify-center text-blue-200 font-bold text-xs">
            {currentStep}/3
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              {initialData ? '编辑外出事务记录' : '新建外出事务记录'}
            </h2>
            <p className="text-[11px] text-blue-200">
              {currentStep === 1 && '第 1 步：基本信息与多段行程路线'}
              {currentStep === 2 && '第 2 步：外出时间与差旅预算'}
              {currentStep === 3 && '第 3 步：凭据与微信文件拖拽上传'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="text-xs bg-white/10 hover:bg-white/20 active:scale-95 text-blue-100 px-2.5 py-1 rounded-md flex items-center gap-1 transition-all"
            title="暂存草稿"
          >
            <Save className="w-3.5 h-3.5" />
            <span>暂存草稿</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Auto-filled memory prompt banner */}
      {isAutoFilled && !initialData && (
        <div className="bg-blue-50 border-b border-blue-100 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-blue-800">
          <div className="flex items-center space-x-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              已自动预填上一次外出信息（出发地：<strong>{destinations[0] || '耿棚'}</strong>，路线、预算等）
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetToClean}
            className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium shrink-0 ml-2 flex items-center gap-0.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>清空重填</span>
          </button>
        </div>
      )}

      {/* Draft save or upload toast notification */}
      {(draftSavedTip || uploadFeedback) && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {draftSavedTip || uploadFeedback}
          </span>
        </div>
      )}

      {/* Step Indicator Tabs (3 steps) */}
      <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-xs">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className={`py-2 text-center font-medium border-b-2 transition-colors ${
            currentStep === 1
              ? 'border-blue-600 text-blue-800 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          1. 行程事由
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className={`py-2 text-center font-medium border-b-2 transition-colors ${
            currentStep === 2
              ? 'border-blue-600 text-blue-800 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          2. 时间与预算
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className={`py-2 text-center font-medium border-b-2 transition-colors ${
            currentStep === 3
              ? 'border-blue-600 text-blue-800 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          3. 微信文件/凭据
        </button>
      </div>

      {/* Form Body Scrollable Area */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-800">
        {/* STEP 1: 行程基本信息 */}
        {currentStep === 1 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Activity Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                活动类型 <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['出差', '学习培训', '其他'] as ActivityType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setActivityType(type);
                      persistCurrentForm({ activityType: type });
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                      activityType === type
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Title / Main Theme */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                活动主题 / 主要事由 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  persistCurrentForm({ title: e.target.value });
                }}
                placeholder="例如：华东区核心客户云架构部署及技术验收"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Multi-Segment Destinations */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    行程路线（默认沿用上一次出发地与途经站）
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addDestination}
                  className="flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>添加途经城市</span>
                </button>
              </div>

              <div className="space-y-2">
                {destinations.map((dest, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-[11px] font-medium text-slate-500 w-14 shrink-0">
                      {idx === 0 ? '出发地' : idx === destinations.length - 1 ? '最终目的地' : `途经段 ${idx}`}
                    </span>
                    <input
                      type="text"
                      value={dest}
                      onChange={(e) => handleDestinationChange(idx, e.target.value)}
                      placeholder={idx === 0 ? '出发城市（如耿棚）' : '到达城市（如颍上）'}
                      className="flex-1 text-xs px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {destinations.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeDestination(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title="删除该站点"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview Route arrow visual */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center flex-wrap gap-1 text-[11px] text-slate-600">
                <span className="text-slate-400">路线预览：</span>
                {destinations.filter(Boolean).map((city, idx, arr) => (
                  <React.Fragment key={idx}>
                    <span className="bg-white font-medium text-blue-800 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                      {city}
                    </span>
                    {idx < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Applicant & Department */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  申请人姓名
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => {
                    setApplicantName(e.target.value);
                    persistCurrentForm({ applicantName: e.target.value });
                  }}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  所属部门
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    persistCurrentForm({ department: e.target.value });
                  }}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: 时间与预算 */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Date & Time Range */}
            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-blue-900">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>时间区间与自动计算时长</span>
                </div>
                <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  合计：{durationDays} 天
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    出发时间 (开始) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    返回时间 (结束) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span>支持手动微调天数：</span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const d = Math.max(0.5, durationDays - 0.5);
                      setDurationDays(d);
                      persistCurrentForm({ durationDays: d });
                    }}
                    className="w-6 h-6 rounded bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    -
                  </button>
                  <span className="font-semibold text-slate-800 min-w-8 text-center">
                    {durationDays}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = durationDays + 0.5;
                      setDurationDays(d);
                      persistCurrentForm({ durationDays: d });
                    }}
                    className="w-6 h-6 rounded bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Budget Estimation */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  差旅费用预算（沿用上一次设置）
                </span>
                <span className="text-xs font-bold text-blue-700 font-mono">
                  总计：¥{totalBudget.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">城际交通费 (¥)</label>
                  <input
                    type="number"
                    min="0"
                    value={budgetBreakdown.transport || ''}
                    onChange={(e) => {
                      const updated = {
                        ...budgetBreakdown,
                        transport: parseFloat(e.target.value) || 0,
                      };
                      setBudgetBreakdown(updated);
                      persistCurrentForm({ budgetBreakdown: updated });
                    }}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">住宿费 (¥)</label>
                  <input
                    type="number"
                    min="0"
                    value={budgetBreakdown.accommodation || ''}
                    onChange={(e) => {
                      const updated = {
                        ...budgetBreakdown,
                        accommodation: parseFloat(e.target.value) || 0,
                      };
                      setBudgetBreakdown(updated);
                      persistCurrentForm({ budgetBreakdown: updated });
                    }}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">餐饮补助 (¥)</label>
                  <input
                    type="number"
                    min="0"
                    value={budgetBreakdown.meals || ''}
                    onChange={(e) => {
                      const updated = {
                        ...budgetBreakdown,
                        meals: parseFloat(e.target.value) || 0,
                      };
                      setBudgetBreakdown(updated);
                      persistCurrentForm({ budgetBreakdown: updated });
                    }}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">其他杂费 (¥)</label>
                  <input
                    type="number"
                    min="0"
                    value={budgetBreakdown.other || ''}
                    onChange={(e) => {
                      const updated = {
                        ...budgetBreakdown,
                        other: parseFloat(e.target.value) || 0,
                      };
                      setBudgetBreakdown(updated);
                      persistCurrentForm({ budgetBreakdown: updated });
                    }}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                当前审批状态
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const s = e.target.value as ApprovalStatus;
                  setStatus(s);
                  persistCurrentForm({ status: s });
                }}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="待审批">待审批（提交领导审核）</option>
                <option value="已审批">已审批（已获准出发）</option>
                <option value="已归档">已归档（完成行程及核销）</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 3: 凭据与照片（支持从微信聊天记录直接拖入） */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 1. Notification Files Upload with Direct WeChat Drag Support */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    通知文件 / 批复函件
                  </span>
                </div>
                <div className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  <WeChatIcon className="w-3 h-3 text-emerald-600" />
                  <span>支持微信直接拖入</span>
                </div>
              </div>

              {/* WeChat & File Drag Drop Zone */}
              <div
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
                onPaste={handleFilePaste}
                tabIndex={0}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all outline-none ${
                  isDraggingFile
                    ? 'border-emerald-500 bg-emerald-50/90 scale-[1.01] ring-4 ring-emerald-100 shadow-md'
                    : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx,.zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                      isDraggingFile
                        ? 'bg-emerald-600 text-white scale-110 animate-bounce'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {isDraggingFile ? (
                      <Upload className="w-5 h-5" />
                    ) : (
                      <div className="relative">
                        <Paperclip className="w-5 h-5" />
                        <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                          <WeChatIcon className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    )}
                  </div>

                  {isDraggingFile ? (
                    <p className="text-xs font-bold text-emerald-700">
                      松开鼠标，直接导入微信文件/通知附件！
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-slate-800">
                        拖入文件至此处，或 <span className="text-blue-600">点击上传</span>
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                        <WeChatIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>可从<strong>微信聊天记录</strong>中直接将文件拖拽到此窗口，亦支持复制后 Ctrl+V 粘贴</span>
                      </p>
                      <div className="flex items-center gap-1 pt-1 text-[10px] text-slate-400">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">PDF</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Word</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">公函图片</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Excel/ZIP</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Uploaded File List */}
              {files.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>已上传文件 ({files.length})</span>
                  </div>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs shadow-2xs"
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate font-medium text-slate-800">{file.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded"
                        title="删除此文件"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Scene Photos Upload with Direct WeChat Drag Support */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">
                    现场照片（多张上传）
                  </span>
                </div>
                <div className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  <WeChatIcon className="w-3 h-3 text-emerald-600" />
                  <span>支持微信图片拖拽</span>
                </div>
              </div>

              {/* WeChat & Photo Drag Drop Zone */}
              <div
                onDragOver={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
                onPaste={handlePhotoPaste}
                tabIndex={0}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all outline-none ${
                  isDraggingPhoto
                    ? 'border-indigo-500 bg-indigo-50/90 scale-[1.01] ring-4 ring-indigo-100 shadow-md'
                    : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
                }`}
                onClick={() => photoInputRef.current?.click()}
              >
                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                      isDraggingPhoto
                        ? 'bg-indigo-600 text-white scale-110 animate-bounce'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {isDraggingPhoto ? (
                      <Upload className="w-5 h-5" />
                    ) : (
                      <div className="relative">
                        <Camera className="w-5 h-5" />
                        <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                          <WeChatIcon className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    )}
                  </div>

                  {isDraggingPhoto ? (
                    <p className="text-xs font-bold text-indigo-700">
                      松开鼠标，直接导入微信现场照片！
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-slate-800">
                        拖入照片至此处，或 <span className="text-indigo-600">点击拍照/相册</span>
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                        <WeChatIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>可从<strong>微信聊天记录</strong>批量拖拽图片到此窗口，亦支持复制后 Ctrl+V 粘贴</span>
                      </p>
                      <div className="flex items-center gap-1 pt-1 text-[10px] text-slate-400">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">支持多张批量</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">JPG / PNG / WEBP</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">无缝剪贴板粘贴</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Uploaded Photos Grid */}
              {photos.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 px-1">
                    <span>已导入现场照片 ({photos.length} 张)</span>
                    <span className="text-[10px] text-indigo-600">点击图片可放大预览</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhotoUrl(photo.dataUrl);
                            }}
                            className="p-1 rounded bg-white/90 hover:bg-white text-slate-900 shadow-sm"
                            title="查看大图"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto(photo.id);
                            }}
                            className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                补充备注说明
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  persistCurrentForm({ notes: e.target.value });
                }}
                placeholder="可补充同行人员、客户对接人、重要备忘或验收说明等"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                上一步
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !title.trim()) {
                    alert('请填写活动主题/主要事由');
                    return;
                  }
                  setCurrentStep(currentStep + 1);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                下一步
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 active:scale-95 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <span>正在保存...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>完成并保存记录</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Large photo modal preview */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-sm max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhotoUrl}
              alt="预览照片"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RecordFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  latestRecord,
  onAutoSaveDraft,
}: RecordFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <RecordFormContent
        key={initialData?.id || 'new-record-modal'}
        onClose={onClose}
        onSave={onSave}
        initialData={initialData}
        latestRecord={latestRecord}
        onAutoSaveDraft={onAutoSaveDraft}
      />
    </div>
  );
}
