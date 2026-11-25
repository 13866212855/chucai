import { ActivityType } from '@/types/outing';

export interface HistoryContextItem {
  applicantName?: string;
  department?: string;
  activityType?: string;
  title?: string;
  destinations?: string[];
  startTime?: string;
  endTime?: string;
  durationDays?: number;
  budget?: number;
  budgetBreakdown?: {
    transport?: number;
    accommodation?: number;
    meals?: number;
    other?: number;
  };
  notes?: string;
}

export interface InferredOutingPayload {
  activityType: ActivityType;
  title: string;
  destinations: string[];
  startTime: string;
  endTime: string;
  durationDays: number;
  budgetBreakdown: {
    transport: number;
    accommodation: number;
    meals: number;
    other: number;
  };
  applicantName: string;
  department: string;
  notes: string;
  reasoning: string;
}

/**
 * Clean local rule + historical record heuristic parser.
 * Used as fallback if the backend-configured LLM API fails (e.g. HTTP 403 / network error).
 */
export function inferLocallyFromTextAndHistory(
  files: Array<{ name: string; extractedText?: string }>,
  history: HistoryContextItem[]
): InferredOutingPayload {
  const combinedSource = files
    .map((f) => `${f.name || ''}\n${f.extractedText || ''}`)
    .join('\n');

  // 1. Most common applicantName, department, and departure from history
  const latest = history[0] || {};
  const applicantName = latest.applicantName || '张伟';
  const department = latest.department || '技术研发中心';
  const departure =
    (latest.destinations && latest.destinations[0]) || '耿棚';

  // 2. Activity type detection
  let activityType: ActivityType = '出差';
  if (/培训|研修|教研|讲座|学习|观摩|沙龙|研学/.test(combinedSource)) {
    activityType = '学习培训';
  } else if (/出差|会议|通知|考察|调研|汇报|验收|比赛|竞赛|评比/.test(combinedSource)) {
    activityType = '出差';
  } else if (latest.activityType === '学习培训' || latest.activityType === '其他') {
    activityType = latest.activityType;
  }

  // 3. Title extraction from filename or document content
  const primaryName = (files[0]?.name || '')
    .replace(/\.(pdf|docx?|png|jpe?g|webp|txt)$/i, '')
    .replace(/[(（]\d+[)）]$/g, '')
    .trim();

  let title = '';
  const aboutMatch = combinedSource.match(/关于(?:开展|举办|召开|组织|参加)?([^。\n]{4,45}?)的通知/);
  if (aboutMatch && aboutMatch[1]) {
    title = `参加${aboutMatch[1].replace(/^“|”$/g, '').trim()}`;
  } else if (primaryName) {
    title = primaryName
      .replace(/^智能纪要[:：]?\s*/i, '')
      .replace(/\s*\d{4}年\d{1,2}月\d{1,2}日.*$/, '')
      .trim();
    if (!title) title = primaryName;
    if (!title.startsWith('参加') && /培训|会议|交流|教研|活动|研修/.test(title)) {
      title = `参加${title}`;
    }
  } else {
    title = '外出公务及培训活动';
  }

  // 4. Destination extraction
  let destination = '';
  const placeMatch = combinedSource.match(
    /(?:培训地点|会议地点|活动地点|报到地点|地点|地址)[：:]\s*([^\n。；;，,]{2,35})/
  );
  if (placeMatch && placeMatch[1]) {
    destination = placeMatch[1].trim();
  } else {
    const cityMatch = combinedSource.match(/(颍上[^\s，。；;]{1,18}|阜阳[^\s，。；;]{1,18})/);
    if (cityMatch && cityMatch[1]) {
      destination = cityMatch[1].trim();
    } else if (latest.destinations && latest.destinations.length >= 2) {
      destination = latest.destinations[latest.destinations.length - 1];
    } else {
      destination = '颍上';
    }
  }

  // 5. Date and time extraction
  const pad = (n: number | string) => String(n).padStart(2, '0');
  const now = new Date();
  let startDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  let endDateStr = startDateStr;

  const dateMatches = Array.from(
    combinedSource.matchAll(/(\d{4})\s*[年\-/.]\s*(\d{1,2})\s*[月\-/.]\s*(\d{1,2})\s*日?/g)
  );
  if (dateMatches.length > 0) {
    // Prefer date near 培训时间 / 会议时间 / 时间 / 文件名
    const timeContextMatch = combinedSource.match(
      /(?:培训时间|会议时间|活动时间|时间)[：:][^\n]*?(\d{4})\s*[年\-/.]\s*(\d{1,2})\s*[月\-/.]\s*(\d{1,2})/
    );
    const chosen = timeContextMatch || dateMatches[0];
    startDateStr = `${chosen[1]}-${pad(chosen[2])}-${pad(chosen[3])}`;
    endDateStr = startDateStr;

    // Check if there is a date range like "11月25日至27日" or "2026年11月25日-2026年11月27日"
    const rangeMatch = combinedSource.match(
      /(\d{4})年(\d{1,2})月(\d{1,2})日\s*(?:至|到|\-|—|~)\s*(?:(\d{4})年)?(?:(\d{1,2})月)?(\d{1,2})日/
    );
    if (rangeMatch) {
      const y1 = rangeMatch[1];
      const m1 = rangeMatch[2];
      const d1 = rangeMatch[3];
      const y2 = rangeMatch[4] || y1;
      const m2 = rangeMatch[5] || m1;
      const d2 = rangeMatch[6];
      startDateStr = `${y1}-${pad(m1)}-${pad(d1)}`;
      endDateStr = `${y2}-${pad(m2)}-${pad(d2)}`;
    }
  }

  let startHm = '08:30';
  let endHm = '17:30';
  const timeRangeMatch = combinedSource.match(
    /(\d{1,2})[:：](\d{2})\s*[-~—至到]\s*(\d{1,2})[:：](\d{2})/
  );
  if (timeRangeMatch) {
    startHm = `${pad(timeRangeMatch[1])}:${timeRangeMatch[2]}`;
    endHm = `${pad(timeRangeMatch[3])}:${timeRangeMatch[4]}`;
  }

  const startTime = `${startDateStr}T${startHm}`;
  const endTime = `${endDateStr}T${endHm}`;

  const sDate = new Date(startTime);
  const eDate = new Date(endTime);
  const diffDays =
    !isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate > sDate
      ? Math.max(1, Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

  // 6. Budget inference based on historical similar records
  const similar =
    history.find(
      (h) =>
        h.durationDays === diffDays &&
        h.destinations?.some((d) => destination.includes(d) || d.includes(destination))
    ) ||
    history.find((h) => h.durationDays === diffDays) ||
    latest;

  const baseBreakdown = similar?.budgetBreakdown || {
    transport: 50,
    accommodation: 0,
    meals: 50 * diffDays,
    other: 0,
  };

  const budgetBreakdown = {
    transport: Number(baseBreakdown.transport) || 0,
    accommodation: diffDays <= 1 ? 0 : Number(baseBreakdown.accommodation) || 0,
    meals: Number(baseBreakdown.meals) || 0,
    other: Number(baseBreakdown.other) || 0,
  };

  // 7. Notes extraction
  const docNoMatch = combinedSource.match(/([^\s\n]{2,8}〔\d{4}〕\d+号)/);
  const notesParts: string[] = [];
  if (docNoMatch) notesParts.push(`文号：${docNoMatch[1]}`);
  if (files[0]?.name) notesParts.push(`依据文件：${files[0].name}`);

  const destinations =
    departure === destination ? [departure, '颍上'] : [departure, destination];

  return {
    activityType,
    title,
    destinations,
    startTime,
    endTime,
    durationDays: diffDays,
    budgetBreakdown,
    applicantName,
    department,
    notes: notesParts.join('；'),
    reasoning: `已从文件《${files[0]?.name || '上传附件'}》提取日期（${startDateStr}）、地点（${destination}）与类型（${activityType}），并结合历史记录沿用出发地“${departure}”及同类行程预算标准。`,
  };
}
