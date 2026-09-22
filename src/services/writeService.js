/**
 * writeService.js - 数据写入层
 *
 * 架构（P1 更新）：
 *   写入流程：管理员操作 → 先写入 localStorage（即时显示）→ 生成 Issue URL
 *   → 管理员点击 → 浏览器打开 GitHub 新建 Issue 页面 → 管理员点 Submit
 *   → GitHub Actions 自动触发 → 修改 data/*.json → commit → push
 *   → GitHub Pages 重新部署 → 所有设备刷新即可看到新数据
 *
 *   安全：Token 绝不暴露到前端。写入操作通过 GitHub Issue 提交，
 *         由 GitHub Actions 使用自带的 GITHUB_TOKEN 执行。
 *
 *   localStorage = 本地临时覆盖层（写入后立即在当前设备可见）
 *   GitHub JSON = 最终共享数据源（Issue 同步后所有设备可见）
 */

import { fetchData, clearCache } from './dataService.js';
import { buildIssueUrl, writeLocalOverride, readLocalOverride } from './syncService.js';
import { isAdmin, getOperatorName } from './authService.js';

const LS_PREFIX = 'swim_data_';
const FILES = {
  swimmers: 'swimmers.json',
  meets: 'meets.json',
  events: 'events.json',
  results: 'results.json'
};

/**
 * 获取当前数据（优先 localStorage，回退到 JSON 文件）
 */
async function getCurrentData(fileKey) {
  const local = readLocalOverride(fileKey);
  if (local !== null) return local;
  return await fetchData(FILES[fileKey]);
}

/**
 * 写入 localStorage 并清除 dataService 缓存
 */
function writeLocal(fileKey, data) {
  writeLocalOverride(fileKey, data);
  clearCache();
}

/**
 * 生成自动 ID
 * @param {string} prefix - ID 前缀（如 'S', 'M', 'E', 'R'）
 * @param {Array} existing - 现有数据数组
 * @returns {string} 新的 ID
 */
function generateId(prefix, existing) {
  const existingIds = new Set(existing.map(item => item.id));
  let id;
  do {
    const ts = Date.now().toString(36).toUpperCase().slice(-6);
    const rand = Math.random().toString(36).toUpperCase().slice(2, 4);
    id = `${prefix}${ts}${rand}`;
  } while (existingIds.has(id));
  return id;
}

/**
 * 获取当前操作者信息
 */
function getOperator() {
  return getOperatorName();
}

/**
 * 获取当前时间 ISO 字符串
 */
function now() {
  return new Date().toISOString();
}

// ============================================
// 同步状态跟踪
// ============================================

/** 待同步的操作列表（存在 sessionStorage，刷新后保留） */
const PENDING_KEY = 'swim_pending_sync';

/**
 * 获取待同步操作列表
 * @returns {Array}
 */
export function getPendingSyncs() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 添加待同步操作
 * @param {Object} payload - 同步请求
 */
function addPendingSync(payload) {
  const list = getPendingSyncs();
  list.push({
    ...payload,
    timestamp: now()
  });
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

/**
 * 清除待同步操作列表
 */
export function clearPendingSyncs() {
  sessionStorage.removeItem(PENDING_KEY);
}

/**
 * 生成 Issue URL 并在新标签页打开
 * 同时将操作记录到待同步列表
 * @param {Object} payload - 同步请求
 * @returns {string} Issue URL
 */
export function submitToGitHub(payload) {
  const url = buildIssueUrl(payload);
  addPendingSync(payload);
  window.open(url, '_blank');
  return url;
}

// ============================================
// 运动员管理
// ============================================

/**
 * 新增运动员
 * @param {Object} swimmer - { name, gender, group, status }
 * @returns {Promise<Object>} 新增的运动员对象
 */
export async function createSwimmer(swimmer) {
  const swimmers = await getCurrentData('swimmers');

  if (!swimmer.name || !swimmer.name.trim()) {
    throw new Error('运动员姓名不能为空');
  }

  const id = generateId('S', swimmers);
  const newSwimmer = {
    id,
    name: swimmer.name.trim(),
    gender: swimmer.gender || 'male',
    group: swimmer.group || (swimmer.gender === 'female' ? '女子组' : '男子组'),
    status: swimmer.status || 'active',
    createdAt: now(),
    createdBy: getOperator()
  };

  swimmers.push(newSwimmer);
  writeLocal('swimmers', swimmers);
  return newSwimmer;
}

/**
 * 更新运动员信息
 * @param {string} id - 运动员 ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<Object>} 更新后的运动员对象
 */
export async function updateSwimmer(id, updates) {
  const swimmers = await getCurrentData('swimmers');
  const idx = swimmers.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('运动员不存在: ' + id);

  swimmers[idx] = {
    ...swimmers[idx],
    ...updates,
    updatedAt: now(),
    updatedBy: getOperator()
  };

  writeLocal('swimmers', swimmers);
  return swimmers[idx];
}

/**
 * 软删除运动员（仅停用，不物理删除）
 *
 * 规则：
 * - 有历史成绩的运动员禁止物理删除，只能停用（status=inactive）
 * - 停用后历史成绩必须保留
 *
 * @param {string} id - 运动员 ID
 * @param {string} reason - 停用原因
 * @returns {Promise<Object>} 更新后的运动员对象
 */
export async function softDeleteSwimmer(id, reason) {
  const swimmers = await getCurrentData('swimmers');
  const idx = swimmers.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('运动员不存在: ' + id);
  if (swimmers[idx].status === 'inactive') throw new Error('该运动员已处于停用状态');

  swimmers[idx] = {
    ...swimmers[idx],
    status: 'inactive',
    updatedAt: now(),
    updatedBy: getOperator(),
    updateReason: reason || '运动员停用'
  };

  writeLocal('swimmers', swimmers);
  return swimmers[idx];
}

/**
 * 检查运动员是否有历史成绩
 * @param {string} swimmerId - 运动员 ID
 * @returns {Promise<boolean>}
 */
export async function hasSwimmerResults(swimmerId) {
  const results = await getCurrentData('results');
  return results.some(r => r.swimmerId === swimmerId);
}

// ============================================
// 比赛管理
// ============================================

/**
 * 新增比赛
 * @param {Object} meet - { name, date, location, status }
 * @returns {Promise<Object>} 新增的比赛对象
 */
export async function createMeet(meet) {
  const meets = await getCurrentData('meets');

  if (!meet.name || !meet.name.trim()) {
    throw new Error('比赛名称不能为空');
  }
  if (!meet.date) {
    throw new Error('比赛日期不能为空');
  }

  const id = generateId('M', meets);
  const newMeet = {
    id,
    name: meet.name.trim(),
    date: meet.date,
    location: (meet.location || '').trim(),
    status: meet.status || 'scheduled',
    createdAt: now(),
    createdBy: getOperator()
  };

  meets.push(newMeet);
  writeLocal('meets', meets);
  return newMeet;
}

/**
 * 更新比赛信息
 * @param {string} id - 比赛 ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<Object>} 更新后的比赛对象
 */
export async function updateMeet(id, updates) {
  const meets = await getCurrentData('meets');
  const idx = meets.findIndex(m => m.id === id);
  if (idx === -1) throw new Error('比赛不存在: ' + id);

  meets[idx] = {
    ...meets[idx],
    ...updates,
    updatedAt: now(),
    updatedBy: getOperator()
  };

  writeLocal('meets', meets);
  return meets[idx];
}

/**
 * 软删除比赛（停用，保留历史）
 * @param {string} id - 比赛 ID
 * @param {string} reason - 停用原因
 * @returns {Promise<Object>} 更新后的比赛对象
 */
export async function softDeleteMeet(id, reason) {
  const meets = await getCurrentData('meets');
  const idx = meets.findIndex(m => m.id === id);
  if (idx === -1) throw new Error('比赛不存在: ' + id);
  if (meets[idx].status === 'inactive') throw new Error('该比赛已处于停用状态');

  meets[idx] = {
    ...meets[idx],
    status: 'inactive',
    updatedAt: now(),
    updatedBy: getOperator(),
    updateReason: reason || '比赛停用'
  };

  writeLocal('meets', meets);
  return meets[idx];
}

/**
 * 物理删除比赛（仅限无成绩的比赛）
 *
 * 规则：
 * - 有成绩的比赛禁止物理删除，只能停用（status=inactive）
 * - 无成绩的比赛可物理删除，但需前端二次确认
 *
 * @param {string} id - 比赛 ID
 * @returns {Promise<boolean>} 是否删除成功
 */
export async function deleteMeet(id) {
  const meets = await getCurrentData('meets');
  const idx = meets.findIndex(m => m.id === id);
  if (idx === -1) throw new Error('比赛不存在: ' + id);

  // 检查是否有成绩
  const results = await getCurrentData('results');
  const hasResults = results.some(r => r.meetId === id);
  if (hasResults) {
    throw new Error('该比赛已有成绩记录，禁止物理删除，只能停用');
  }

  meets.splice(idx, 1);
  writeLocal('meets', meets);
  return true;
}

/**
 * 检查比赛是否有成绩
 * @param {string} meetId - 比赛 ID
 * @returns {Promise<boolean>}
 */
export async function hasMeetResults(meetId) {
  const results = await getCurrentData('results');
  return results.some(r => r.meetId === meetId);
}

// ============================================
// 项目管理
// ============================================

/**
 * 新增项目
 * @param {Object} event - { name, distance, stroke, gender, type, status }
 * @returns {Promise<Object>} 新增的项目对象
 */
export async function createEvent(event) {
  const events = await getCurrentData('events');

  if (!event.name || !event.name.trim()) {
    throw new Error('项目名称不能为空');
  }
  if (!event.distance || event.distance <= 0) {
    throw new Error('项目距离必须大于 0');
  }

  const id = generateId('E', events);
  const newEvent = {
    id,
    name: event.name.trim(),
    distance: parseInt(event.distance, 10),
    stroke: event.stroke || 'freestyle',
    gender: event.gender || 'male',
    type: event.type || 'individual',
    status: event.status || 'active',
    createdAt: now(),
    createdBy: getOperator()
  };

  events.push(newEvent);
  writeLocal('events', events);
  return newEvent;
}

/**
 * 更新项目信息
 * @param {string} id - 项目 ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<Object>} 更新后的项目对象
 */
export async function updateEvent(id, updates) {
  const events = await getCurrentData('events');
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('项目不存在: ' + id);

  events[idx] = {
    ...events[idx],
    ...updates,
    updatedAt: now(),
    updatedBy: getOperator()
  };

  writeLocal('events', events);
  return events[idx];
}

// ============================================
// 成绩管理
// ============================================

/**
 * 新增成绩
 * @param {Object} result - { swimmerId, eventId, meetId, timeMs, status }
 * @returns {Promise<Object>} 新增的成绩对象
 */
export async function createResult(result) {
  const results = await getCurrentData('results');

  if (!result.swimmerId) throw new Error('请选择运动员');
  if (!result.eventId) throw new Error('请选择项目');
  if (!result.meetId) throw new Error('请选择比赛');
  if (result.timeMs == null || result.timeMs < 0) {
    throw new Error('成绩数据无效');
  }

  const id = generateId('R', results);
  const newResult = {
    id,
    swimmerId: result.swimmerId,
    eventId: result.eventId,
    meetId: result.meetId,
    timeMs: result.timeMs,
    status: result.status || 'official',
    createdAt: now(),
    createdBy: getOperator(),
    updatedAt: null,
    updatedBy: null,
    updateReason: null
  };

  results.push(newResult);
  writeLocal('results', results);
  return newResult;
}

/**
 * 更新成绩
 * @param {string} id - 成绩 ID
 * @param {Object} updates - { timeMs?, status?, updateReason? }
 * @returns {Promise<Object>} 更新后的成绩对象
 */
export async function updateResult(id, updates) {
  const results = await getCurrentData('results');
  const idx = results.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('成绩记录不存在: ' + id);

  const oldValues = {};
  if (updates.timeMs !== undefined) oldValues.timeMs = results[idx].timeMs;
  if (updates.status !== undefined) oldValues.status = results[idx].status;

  results[idx] = {
    ...results[idx],
    ...updates,
    updatedAt: now(),
    updatedBy: getOperator(),
    updateReason: updates.updateReason || '',
    previousValues: oldValues
  };

  writeLocal('results', results);
  return results[idx];
}

/**
 * 软删除成绩（设置 status 为 DQ 或 invalid）
 * @param {string} id - 成绩 ID
 * @param {string} reason - 删除原因
 * @returns {Promise<Object>} 更新后的成绩对象
 */
export async function softDeleteResult(id, reason) {
  return updateResult(id, {
    status: 'DQ',
    updateReason: reason || '成绩标记为 DQ'
  });
}

/**
 * 删除成绩（标记 status=deleted，保留完整历史，不物理删除）
 * @param {string} id - 成绩 ID
 * @param {string} reason - 删除原因
 * @returns {Promise<Object>} 更新后的成绩对象
 */
export async function deleteResult(id, reason) {
  return updateResult(id, {
    status: 'deleted',
    updateReason: reason || '成绩删除'
  });
}

// ============================================
// 工具方法
// ============================================

/**
 * 检查 localStorage 中是否有修改数据
 * @returns {Object} 各文件是否有覆盖数据
 */
export function hasLocalOverrides() {
  const result = {};
  Object.keys(FILES).forEach(key => {
    result[key] = readLocalOverride(key) !== null;
  });
  return result;
}

/**
 * 清除所有 localStorage 覆盖数据（恢复到 JSON 原始数据）
 */
export function clearLocalOverrides() {
  Object.keys(FILES).forEach(key => {
    localStorage.removeItem(LS_PREFIX + FILES[key]);
  });
  clearCache();
}

/**
 * 导出 localStorage 数据（用于调试或备份）
 * @returns {Object} 所有 localStorage 覆盖数据
 */
export function exportLocalData() {
  const result = {};
  Object.keys(FILES).forEach(key => {
    const data = readLocalOverride(key);
    if (data !== null) result[key] = data;
  });
  return result;
}
