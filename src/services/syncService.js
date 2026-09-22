/**
 * syncService.js - 跨设备数据同步服务
 *
 * 架构：浏览器 → 生成预填 Issue URL → 管理员在 GitHub 创建 Issue
 *       → GitHub Actions (sync-data.yml) 自动触发 → 解析 Issue body JSON
 *       → apply_data_change.py 修改 data/*.json → commit → push
 *       → GitHub Pages 自动重新部署 → 所有设备刷新即可看到新数据
 *
 * 安全：Token 绝不暴露到前端。写入操作通过 GitHub Issue 提交，
 *       由 GitHub Actions 使用自带的 GITHUB_TOKEN 执行。
 *
 * localStorage 新定位：本地缓存 / 临时覆盖层
 *   - 页面打开时优先从 GitHub JSON 拉取最新数据
 *   - 管理员写入时先存 localStorage（即时显示），再生成 Issue URL 提交到 GitHub
 *   - 同步成功后清除对应的 localStorage 覆盖
 */

const REPO_OWNER = 'wendy42-1';
const REPO_NAME = 'SHU-Swimming-Club';
const REPO_FULL = `${REPO_OWNER}/${REPO_NAME}`;
const ISSUE_LABEL = 'data-sync';

/** GitHub Pages 数据源 URL（带时间戳防缓存） */
const PAGES_BASE = `https://${REPO_OWNER}.github.io/${REPO_NAME}/`;

/** localStorage 前缀 */
const LS_PREFIX = 'swim_data_';

/** 最后同步时间 localStorage key */
const LS_LAST_SYNC = 'swim_last_sync';

/**
 * 动态计算 data 目录的基准路径
 * - index.html 在根目录，路径为 ./data/
 * - pages/*.html 在 pages/ 目录，路径为 ../data/
 */
function getBasePath() {
  if (window.location.pathname.includes('/pages/')) {
    return '../data/';
  }
  return './data/';
}

/**
 * 从 GitHub Pages 拉取最新 JSON 数据（绕过缓存）
 * @param {string} fileName - 文件名（如 'swimmers.json'）
 * @returns {Promise<Array|Object>}
 */
export async function fetchGitHubData(fileName) {
  const basePath = getBasePath();
  const url = `${basePath}${fileName}?t=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`加载 ${fileName} 失败: ${response.status}`);
  }
  return response.json();
}

/**
 * 生成 GitHub Issue 创建 URL（预填 title + body + label）
 * @param {Object} payload - 数据同步请求
 *   {
 *     action: 'create'|'update'|'softDelete'|'delete',
 *     entity: 'swimmer'|'meet'|'event'|'result',
 *     data: { ... },       // create/update 时
 *     id: 'S001',          // update/softDelete/delete 时
 *     operator: 'admin',
 *     reason: '停用原因'    // softDelete/delete 时可选
 *   }
 * @returns {string} GitHub Issue URL
 */
export function buildIssueUrl(payload) {
  const jsonStr = JSON.stringify({
    type: 'data-sync',
    ...payload
  });

  // 用 HTML 注释包裹 JSON，避免 Issue body 被 Markdown 渲染干扰
  const body = `<!-- ${jsonStr} -->`;

  const title = `数据同步: ${payload.action} ${payload.entity}` +
    (payload.id ? ` ${payload.id}` : '');

  const url = new URL(`https://github.com/${REPO_FULL}/issues/new`);
  url.searchParams.set('title', title);
  url.searchParams.set('body', body);
  url.searchParams.set('labels', ISSUE_LABEL);

  return url.toString();
}

/**
 * 生成批量操作的 GitHub Issue 创建 URL
 * 将多个操作合并为一个 Issue，避免并发同步问题
 * @param {Array} operations - 操作列表，每个元素格式同 buildIssueUrl 的 payload
 * @param {string} operator - 操作者
 * @returns {string} GitHub Issue URL
 */
export function buildBatchIssueUrl(operations, operator = 'admin') {
  const batchId = `batch-${Date.now()}`;
  const jsonStr = JSON.stringify({
    type: 'batch',
    batchId,
    operator,
    operations
  });

  // 用 HTML 注释包裹 JSON，避免 Issue body 被 Markdown 渲染干扰
  const body = `<!-- ${jsonStr} -->`;

  const summary = operations.length === 1
    ? `${operations[0].action} ${operations[0].entity}${operations[0].id ? ' ' + operations[0].id : ''}`
    : `${operations.length} 项操作`;

  const title = `数据同步(批量): ${summary} [${batchId}]`;

  const url = new URL(`https://github.com/${REPO_FULL}/issues/new`);
  url.searchParams.set('title', title);
  url.searchParams.set('body', body);
  url.searchParams.set('labels', ISSUE_LABEL);

  return url.toString();
}

/**
 * 获取当前 GitHub 仓库的最新 commit SHA（用于乐观锁检测）
 * 通过 GitHub API 获取 refs/heads/main 的 SHA
 * @returns {Promise<string|null>} commit SHA 或 null（匿名 API 限制 60次/小时）
 */
export async function getLatestCommitSha() {
  try {
    const url = `https://api.github.com/repos/${REPO_FULL}/commits/main`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.sha || null;
  } catch {
    return null;
  }
}

/**
 * 获取最后同步时间
 * @returns {string|null} ISO 时间字符串或 null
 */
export function getLastSyncTime() {
  return localStorage.getItem(LS_LAST_SYNC);
}

/**
 * 更新最后同步时间为当前
 */
export function updateLastSyncTime() {
  const now = new Date().toISOString();
  localStorage.setItem(LS_LAST_SYNC, now);
  return now;
}

/**
 * 格式化最后同步时间为可读字符串
 * @returns {string}
 */
export function getLastSyncDisplay() {
  const iso = getLastSyncTime();
  if (!iso) return '尚未同步';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '尚未同步';
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

/**
 * 检查 localStorage 中是否有临时覆盖数据（未同步到 GitHub）
 * @returns {Object} 各文件是否有覆盖数据
 */
export function hasLocalOverrides() {
  const files = ['swimmers.json', 'meets.json', 'events.json', 'results.json'];
  const result = {};
  files.forEach(f => {
    result[f.replace('.json', '')] = localStorage.getItem(LS_PREFIX + f) !== null;
  });
  return result;
}

/**
 * 清除所有 localStorage 覆盖数据
 */
export function clearLocalOverrides() {
  const files = ['swimmers.json', 'meets.json', 'events.json', 'results.json'];
  files.forEach(f => localStorage.removeItem(LS_PREFIX + f));
}

/**
 * 写入 localStorage 覆盖数据
 * @param {string} fileKey - 文件键名（如 'swimmers'）
 * @param {Array|Object} data - 数据
 */
export function writeLocalOverride(fileKey, data) {
  localStorage.setItem(LS_PREFIX + fileKey + '.json', JSON.stringify(data));
}

/**
 * 读取 localStorage 覆盖数据
 * @param {string} fileKey - 文件键名
 * @returns {Array|Object|null}
 */
export function readLocalOverride(fileKey) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + fileKey + '.json');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 导出所有 localStorage 覆盖数据（备份用）
 * @returns {Object}
 */
export function exportLocalData() {
  const result = {};
  const files = ['swimmers', 'meets', 'events', 'results'];
  files.forEach(key => {
    const data = readLocalOverride(key);
    if (data !== null) result[key] = data;
  });
  return result;
}

/**
 * 从 GitHub Pages 拉取全部数据并更新本地缓存
 * 调用后清除 localStorage 覆盖（因为已获取最新远端数据）
 * @returns {Promise<Object>} 所有数据
 */
export async function syncFromGitHub() {
  const files = ['swimmers.json', 'meets.json', 'events.json', 'results.json'];
  const result = {};

  await Promise.all(files.map(async (f) => {
    result[f.replace('.json', '')] = await fetchGitHubData(f);
  }));

  // 更新同步时间
  updateLastSyncTime();

  return result;
}

/**
 * 打开 GitHub Issue 创建页面（在新标签页）
 * @param {Object} payload - 数据同步请求
 */
export function openIssuePage(payload) {
  const url = buildIssueUrl(payload);
  window.open(url, '_blank');
}

/**
 * 获取仓库链接
 * @returns {string}
 */
export function getRepoUrl() {
  return `https://github.com/${REPO_FULL}`;
}

/**
 * 获取 Issue 列表链接（用于查看同步状态）
 * @returns {string}
 */
export function getIssuesUrl() {
  return `https://github.com/${REPO_FULL}/issues?q=is%3Aissue+label%3A${ISSUE_LABEL}`;
}
