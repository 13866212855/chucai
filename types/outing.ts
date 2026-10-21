export type ActivityType = '出差' | '学习培训' | '其他';

export type ApprovalStatus = '待审批' | '已审批' | '已归档' | '草稿';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // Base64 data for local storage and preview
  uploadedAt: string;
}

export interface PhotoAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  caption?: string;
  takenAt?: string;
}

export interface BudgetBreakdown {
  transport: number; // 交通费
  accommodation: number; // 住宿费
  meals: number; // 餐饮补助
  other: number; // 其他杂费
}

export interface OutingRecord {
  id: string;
  applicantName: string;
  department: string;
  activityType: ActivityType;
  title: string; // 活动主题 / 主要事由
  destinations: string[]; // 出发地与途经/目的地列表，例如 ["北京", "上海", "杭州"]
  startTime: string; // YYYY-MM-DDTHH:mm
  endTime: string; // YYYY-MM-DDTHH:mm
  durationDays: number; // 计算天数，如 3.5
  budget: number; // 费用预算总额
  budgetBreakdown?: BudgetBreakdown;
  status: ApprovalStatus;
  approvalNo?: string; // 审批单号
  approvalDate?: string;
  approverName?: string;
  approverNote?: string;
  notes?: string; // 补充说明
  files: FileAttachment[];
  photos: PhotoAttachment[];
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutingFilterParams {
  type?: string;
  status?: string;
  keyword?: string;
  city?: string;
  month?: string; // YYYY-MM
}

export interface OutingStats {
  totalCount: number;
  totalDays: number;
  totalBudget: number;
  pendingCount: number;
  approvedCount: number;
  currentMonthCount: number;
  currentMonthDays: number;
  cityDistribution: { city: string; count: number }[];
  typeDistribution: { type: ActivityType; count: number; days: number }[];
  monthlyTrend: { month: string; count: number; days: number }[];
}
