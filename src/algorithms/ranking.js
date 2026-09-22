/**
 * ranking.js - 排名算法
 * 
 * 负责：成绩排序、排名计算、并列处理、筛选
 */

import { compareTime } from '../utils/time.js';

/**
 * 对成绩数组排序（升序，最快在前）
 * @param {Array} results - 成绩数组
 * @param {boolean} ascending - true=升序（最快在前），false=降序
 * @returns {Array} 排序后的新数组（不修改原数组）
 */
export function sortResults(results, ascending = true) {
  const sorted = [...results];
  sorted.sort((a, b) => {
    const cmp = compareTime(a.timeMs, b.timeMs);
    return ascending ? cmp : -cmp;
  });
  return sorted;
}

/**
 * 计算排名（支持并列）
 * 规则：相同成绩获得相同名次，下一名次跳过
 * 例如：成绩 58.32, 58.32, 59.01 → 名次 1, 1, 3
 * 
 * @param {Array} results - 成绩数组（已排序或未排序）
 * @returns {Array} 带排名的结果数组，每项附加 .rank 字段
 */
export function calculateRanks(results) {
  const sorted = sortResults(results, true);
  const ranked = [];
  let prevTime = null;
  let prevRank = 0;
  let count = 0;

  for (const result of sorted) {
    count++;
    if (prevTime === null || result.timeMs !== prevTime) {
      prevRank = count;
      prevTime = result.timeMs;
    }
    ranked.push({ ...result, rank: prevRank });
  }

  return ranked;
}

/**
 * 按指定字段筛选成绩并排名
 * @param {Array} results - 成绩数组
 * @param {Object} filters - { eventId, meetId, swimmerId, gender, status }
 * @param {Object} context - { events, swimmers } 用于辅助筛选
 * @returns {Array} 带排名的筛选后成绩数组
 */
export function filterAndRank(results, filters = {}, context = {}) {
  let filtered = [...results];

  if (filters.eventId) {
    filtered = filtered.filter(r => r.eventId === filters.eventId);
  }
  if (filters.meetId) {
    filtered = filtered.filter(r => r.meetId === filters.meetId);
  }
  if (filters.swimmerId) {
    filtered = filtered.filter(r => r.swimmerId === filters.swimmerId);
  }
  if (filters.status) {
    filtered = filtered.filter(r => r.status === filters.status);
  }
  if (filters.gender && context.swimmers) {
    const swimmerIds = context.swimmers
      .filter(s => s.gender === filters.gender)
      .map(s => s.id);
    filtered = filtered.filter(r => swimmerIds.includes(r.swimmerId));
  }

  // 只排 official 成绩
  filtered = filtered.filter(r => r.status === 'official');

  return calculateRanks(filtered);
}

/**
 * 获取某运动员在某项目中的个人最好成绩
 * @param {Array} results - 所有成绩
 * @param {string} swimmerId
 * @param {string} eventId
 * @returns {Object|null} 最佳成绩或 null
 */
export function getPersonalBest(results, swimmerId, eventId) {
  const filtered = results.filter(r =>
    r.swimmerId === swimmerId &&
    r.eventId === eventId &&
    r.status === 'official'
  );
  if (filtered.length === 0) return null;
  const sorted = sortResults(filtered, true);
  return sorted[0];
}
