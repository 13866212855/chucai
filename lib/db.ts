import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { OutingRecord, OutingFilterParams, OutingStats, ActivityType } from '@/types/outing';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'outings.sqlite');

// Ensure database file directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Persist the in-memory SQLite database to disk
function saveDb() {
  if (!dbInstance) return;
  try {
    ensureDataDir();
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

// Initial seed data with realistic business outings
const INITIAL_RECORDS: OutingRecord[] = [
  {
    id: 'OUT-202505-001',
    applicantName: '张伟',
    department: '技术研发中心',
    activityType: '出差',
    title: '华东区核心客户云架构部署及技术验收',
    destinations: ['北京', '上海', '杭州'],
    startTime: '2025-05-12T08:30',
    endTime: '2025-05-16T18:00',
    durationDays: 4.5,
    budget: 4800,
    budgetBreakdown: {
      transport: 2200,
      accommodation: 1800,
      meals: 600,
      other: 200,
    },
    status: '已审批',
    approvalNo: 'OA-TRIP-20250510-092',
    approvalDate: '2025-05-10',
    approverName: '李建华（部门总监）',
    approverNote: '同意出差，请务必保证验收质量与交付节点。',
    notes: '与上海分公司团队配合现场部署，并前往杭州客户总部现场述职。',
    files: [
      {
        id: 'f-1',
        name: '客户系统联调及技术验收任务书.pdf',
        size: 1024 * 350,
        type: 'application/pdf',
        dataUrl: '',
        uploadedAt: '2025-05-09 14:20',
      },
    ],
    photos: [],
    isDraft: false,
    createdAt: '2025-05-09T14:20:00Z',
    updatedAt: '2025-05-10T16:00:00Z',
  },
  {
    id: 'OUT-202505-002',
    applicantName: '张伟',
    department: '技术研发中心',
    activityType: '学习培训',
    title: '2025全国企业级数字化转型与AI应用高峰培训',
    destinations: ['北京', '深圳'],
    startTime: '2025-05-22T09:00',
    endTime: '2025-05-24T17:30',
    durationDays: 2.5,
    budget: 3200,
    budgetBreakdown: {
      transport: 1600,
      accommodation: 1000,
      meals: 400,
      other: 200,
    },
    status: '待审批',
    approvalNo: 'OA-TRIP-20250518-015',
    approvalDate: '2025-05-18',
    approverName: '李建华（部门总监）',
    approverNote: '待分管副总裁复核审批',
    notes: '参加工信部主办的数字化领军人才高级研修班，获得结业认证。',
    files: [
      {
        id: 'f-2',
        name: '培训日程安排与会议邀请函.png',
        size: 1024 * 180,
        type: 'image/png',
        dataUrl: '',
        uploadedAt: '2025-05-18 10:15',
      },
    ],
    photos: [],
    isDraft: false,
    createdAt: '2025-05-18T10:15:00Z',
    updatedAt: '2025-05-18T10:15:00Z',
  },
  {
    id: 'OUT-202506-003',
    applicantName: '张伟',
    department: '技术研发中心',
    activityType: '出差',
    title: '西南大区智慧政务项目阶段汇报及需求调研',
    destinations: ['北京', '成都', '重庆'],
    startTime: '2025-06-05T09:00',
    endTime: '2025-06-09T18:00',
    durationDays: 4.5,
    budget: 5200,
    budgetBreakdown: {
      transport: 2400,
      accommodation: 1900,
      meals: 700,
      other: 200,
    },
    status: '已归档',
    approvalNo: 'OA-TRIP-20250601-044',
    approvalDate: '2025-06-02',
    approverName: '李建华（部门总监）',
    approverNote: '已顺利完成归档与财务报销核对。',
    notes: '圆满完成阶段成果汇报，已取得客户盖章认可备忘录。',
    files: [],
    photos: [],
    isDraft: false,
    createdAt: '2025-06-01T11:00:00Z',
    updatedAt: '2025-06-12T09:30:00Z',
  },
  {
    id: 'OUT-202506-004',
    applicantName: '张伟',
    department: '技术研发中心',
    activityType: '其他',
    title: '代表公司参加华南开源技术开发者沙龙演讲',
    destinations: ['北京', '广州'],
    startTime: '2025-06-18T13:00',
    endTime: '2025-06-20T12:00',
    durationDays: 2.0,
    budget: 2500,
    budgetBreakdown: {
      transport: 1400,
      accommodation: 700,
      meals: 300,
      other: 100,
    },
    status: '待审批',
    approvalNo: 'OA-TRIP-20250615-081',
    approvalDate: '2025-06-15',
    notes: '受邀发表30分钟主题技术分享，提升品牌行业影响力。',
    files: [],
    photos: [],
    isDraft: false,
    createdAt: '2025-06-15T15:00:00Z',
    updatedAt: '2025-06-15T15:00:00Z',
  },
];

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!SQL) {
    SQL = await initSqlJs();
  }

  ensureDataDir();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Failed to load existing SQLite database file, re-initializing fresh DB:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Create table if not exists
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS outings (
      id TEXT PRIMARY KEY,
      applicant_name TEXT NOT NULL,
      department TEXT,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      destinations TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_days REAL NOT NULL,
      budget REAL DEFAULT 0,
      budget_breakdown TEXT,
      status TEXT NOT NULL,
      approval_no TEXT,
      approval_date TEXT,
      approver_name TEXT,
      approver_note TEXT,
      notes TEXT,
      files TEXT,
      photos TEXT,
      is_draft INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Check if table is empty, then seed initial data
  const checkResult = dbInstance.exec('SELECT COUNT(*) as count FROM outings');
  const count = checkResult.length > 0 && checkResult[0].values.length > 0 ? (checkResult[0].values[0][0] as number) : 0;

  if (count === 0) {
    for (const item of INITIAL_RECORDS) {
      insertRecordToDb(dbInstance, item);
    }
    saveDb();
  }

  return dbInstance;
}

function insertRecordToDb(db: Database, record: OutingRecord) {
  const stmt = db.prepare(`
    INSERT INTO outings (
      id, applicant_name, department, activity_type, title,
      destinations, start_time, end_time, duration_days, budget,
      budget_breakdown, status, approval_no, approval_date, approver_name,
      approver_note, notes, files, photos, is_draft, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run([
    record.id,
    record.applicantName,
    record.department || '',
    record.activityType,
    record.title,
    JSON.stringify(record.destinations || []),
    record.startTime,
    record.endTime,
    record.durationDays,
    record.budget || 0,
    JSON.stringify(record.budgetBreakdown || {}),
    record.status,
    record.approvalNo || '',
    record.approvalDate || '',
    record.approverName || '',
    record.approverNote || '',
    record.notes || '',
    JSON.stringify(record.files || []),
    JSON.stringify(record.photos || []),
    record.isDraft ? 1 : 0,
    record.createdAt,
    record.updatedAt,
  ]);
  stmt.free();
}

function rowToRecord(columns: string[], values: any[]): OutingRecord {
  const obj: Record<string, any> = {};
  columns.forEach((col, idx) => {
    obj[col] = values[idx];
  });

  return {
    id: obj.id,
    applicantName: obj.applicant_name,
    department: obj.department || '',
    activityType: obj.activity_type as ActivityType,
    title: obj.title,
    destinations: safeJsonParse(obj.destinations, []),
    startTime: obj.start_time,
    endTime: obj.end_time,
    durationDays: Number(obj.duration_days) || 0,
    budget: Number(obj.budget) || 0,
    budgetBreakdown: safeJsonParse(obj.budget_breakdown, {
      transport: 0,
      accommodation: 0,
      meals: 0,
      other: 0,
    }),
    status: obj.status,
    approvalNo: obj.approval_no || '',
    approvalDate: obj.approval_date || '',
    approverName: obj.approver_name || '',
    approverNote: obj.approver_note || '',
    notes: obj.notes || '',
    files: safeJsonParse(obj.files, []),
    photos: safeJsonParse(obj.photos, []),
    isDraft: Boolean(obj.is_draft),
    createdAt: obj.created_at,
    updatedAt: obj.updated_at,
  };
}

function safeJsonParse(jsonString: any, fallback: any) {
  if (typeof jsonString !== 'string') return fallback;
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

export async function getAllRecords(filters?: OutingFilterParams): Promise<OutingRecord[]> {
  const db = await getDatabase();
  let sql = 'SELECT * FROM outings WHERE is_draft = 0';
  const params: any[] = [];

  if (filters?.type && filters.type !== '全部') {
    sql += ' AND activity_type = ?';
    params.push(filters.type);
  }

  if (filters?.status && filters.status !== '全部') {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.keyword && filters.keyword.trim()) {
    const kw = `%${filters.keyword.trim()}%`;
    sql += ' AND (title LIKE ? OR applicant_name LIKE ? OR destinations LIKE ? OR notes LIKE ?)';
    params.push(kw, kw, kw, kw);
  }

  if (filters?.city && filters.city.trim()) {
    sql += ' AND destinations LIKE ?';
    params.push(`%${filters.city.trim()}%`);
  }

  if (filters?.month && filters.month.trim()) {
    sql += ' AND start_time LIKE ?';
    params.push(`${filters.month.trim()}%`);
  }

  sql += ' ORDER BY start_time DESC, created_at DESC';

  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const records: OutingRecord[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    const cols = stmt.getColumnNames();
    records.push(rowToRecord(cols, row));
  }
  stmt.free();

  return records;
}

export async function getDraftRecord(): Promise<OutingRecord | null> {
  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM outings WHERE is_draft = 1 ORDER BY updated_at DESC LIMIT 1');
  if (stmt.step()) {
    const row = stmt.get();
    const cols = stmt.getColumnNames();
    const draft = rowToRecord(cols, row);
    stmt.free();
    return draft;
  }
  stmt.free();
  return null;
}

export async function getRecordById(id: string): Promise<OutingRecord | null> {
  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM outings WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.get();
    const cols = stmt.getColumnNames();
    const rec = rowToRecord(cols, row);
    stmt.free();
    return rec;
  }
  stmt.free();
  return null;
}

export async function createRecord(data: Partial<OutingRecord>): Promise<OutingRecord> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = data.id || `OUT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
  const approvalNo = data.approvalNo || `OA-OUT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

  const record: OutingRecord = {
    id,
    applicantName: data.applicantName || '张伟',
    department: data.department || '技术研发中心',
    activityType: data.activityType || '出差',
    title: data.title || '',
    destinations: data.destinations && data.destinations.length > 0 ? data.destinations : ['北京'],
    startTime: data.startTime || now.slice(0, 16),
    endTime: data.endTime || now.slice(0, 16),
    durationDays: data.durationDays !== undefined ? data.durationDays : 1,
    budget: data.budget || 0,
    budgetBreakdown: data.budgetBreakdown || {
      transport: 0,
      accommodation: 0,
      meals: 0,
      other: 0,
    },
    status: data.isDraft ? '草稿' : (data.status || '待审批'),
    approvalNo,
    approvalDate: data.approvalDate || now.slice(0, 10),
    approverName: data.approverName || '李建华（部门总监）',
    approverNote: data.approverNote || '',
    notes: data.notes || '',
    files: data.files || [],
    photos: data.photos || [],
    isDraft: Boolean(data.isDraft),
    createdAt: now,
    updatedAt: now,
  };

  // If creating or replacing a draft, clean old drafts
  if (record.isDraft) {
    db.run('DELETE FROM outings WHERE is_draft = 1');
  }

  insertRecordToDb(db, record);
  saveDb();
  return record;
}

export async function updateRecord(id: string, data: Partial<OutingRecord>): Promise<OutingRecord | null> {
  const existing = await getRecordById(id);
  if (!existing) return null;

  const db = await getDatabase();
  const now = new Date().toISOString();

  const updated: OutingRecord = {
    ...existing,
    ...data,
    updatedAt: now,
    destinations: data.destinations || existing.destinations,
    files: data.files || existing.files,
    photos: data.photos || existing.photos,
    budgetBreakdown: data.budgetBreakdown || existing.budgetBreakdown,
  };

  const stmt = db.prepare(`
    UPDATE outings SET
      applicant_name = ?,
      department = ?,
      activity_type = ?,
      title = ?,
      destinations = ?,
      start_time = ?,
      end_time = ?,
      duration_days = ?,
      budget = ?,
      budget_breakdown = ?,
      status = ?,
      approval_no = ?,
      approval_date = ?,
      approver_name = ?,
      approver_note = ?,
      notes = ?,
      files = ?,
      photos = ?,
      is_draft = ?,
      updated_at = ?
    WHERE id = ?
  `);

  stmt.run([
    updated.applicantName,
    updated.department,
    updated.activityType,
    updated.title,
    JSON.stringify(updated.destinations),
    updated.startTime,
    updated.endTime,
    updated.durationDays,
    updated.budget,
    JSON.stringify(updated.budgetBreakdown),
    updated.status,
    updated.approvalNo || '',
    updated.approvalDate || '',
    updated.approverName || '',
    updated.approverNote || '',
    updated.notes || '',
    JSON.stringify(updated.files),
    JSON.stringify(updated.photos),
    updated.isDraft ? 1 : 0,
    updated.updatedAt,
    id,
  ]);
  stmt.free();

  saveDb();
  return updated;
}

export async function deleteRecord(id: string): Promise<boolean> {
  const db = await getDatabase();
  db.run('DELETE FROM outings WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function getStats(): Promise<OutingStats> {
  const records = await getAllRecords();

  const totalCount = records.length;
  let totalDays = 0;
  let totalBudget = 0;
  let pendingCount = 0;
  let approvedCount = 0;

  const cityCountMap: Record<string, number> = {};
  const typeMap: Record<ActivityType, { count: number; days: number }> = {
    出差: { count: 0, days: 0 },
    学习培训: { count: 0, days: 0 },
    其他: { count: 0, days: 0 },
  };

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  let currentMonthCount = 0;
  let currentMonthDays = 0;

  const monthTrendMap: Record<string, { count: number; days: number }> = {};

  records.forEach((rec) => {
    totalDays += rec.durationDays;
    totalBudget += rec.budget || 0;
    if (rec.status === '待审批') pendingCount++;
    if (rec.status === '已审批' || rec.status === '已归档') approvedCount++;

    if (rec.activityType && typeMap[rec.activityType]) {
      typeMap[rec.activityType].count++;
      typeMap[rec.activityType].days += rec.durationDays;
    }

    // Destinations
    rec.destinations.forEach((city) => {
      const trimmed = city.trim();
      if (trimmed) {
        cityCountMap[trimmed] = (cityCountMap[trimmed] || 0) + 1;
      }
    });

    // Month trend
    const month = rec.startTime.slice(0, 7);
    if (!monthTrendMap[month]) {
      monthTrendMap[month] = { count: 0, days: 0 };
    }
    monthTrendMap[month].count++;
    monthTrendMap[month].days += rec.durationDays;

    if (month === currentMonthStr) {
      currentMonthCount++;
      currentMonthDays += rec.durationDays;
    }
  });

  const cityDistribution = Object.entries(cityCountMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  const typeDistribution = (Object.keys(typeMap) as ActivityType[]).map((type) => ({
    type,
    count: typeMap[type].count,
    days: Number(typeMap[type].days.toFixed(1)),
  }));

  const monthlyTrend = Object.entries(monthTrendMap)
    .map(([month, data]) => ({
      month,
      count: data.count,
      days: Number(data.days.toFixed(1)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalCount,
    totalDays: Number(totalDays.toFixed(1)),
    totalBudget,
    pendingCount,
    approvedCount,
    currentMonthCount,
    currentMonthDays: Number(currentMonthDays.toFixed(1)),
    cityDistribution,
    typeDistribution,
    monthlyTrend,
  };
}
