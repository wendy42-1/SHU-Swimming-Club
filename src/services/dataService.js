/**
 * dataService.js - 基础数据访问层
 *
 * 架构（P1 更新）：
 *   GitHub JSON = 最终共享数据源（所有设备读取同一份数据）
 *   localStorage = 本地缓存 / 临时覆盖层
 *
 * 读取优先级：
 *   1. localStorage 临时覆盖（管理员写入但尚未同步到 GitHub 的数据）→ 立即显示
 *   2. GitHub Pages JSON 文件（带时间戳防缓存）→ 共享数据源
 *
 * 管理员写入流程：
 *   writeService → 先写 localStorage（即时显示）→ 生成 Issue URL → 管理员提交到 GitHub
 *   → Actions 自动更新 JSON → 下次刷新时从 GitHub 拉取最新数据
 */

const cache = new Map();

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
 * localStorage 前缀
 */
const LS_PREFIX = 'swim_data_';

/**
 * 获取 localStorage 中的覆盖数据
 * @param {string} fileName - 文件名（如 'swimmers.json'）
 * @returns {Array|Object|null} 覆盖数据或 null
 */
function getLocalOverrides(fileName) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + fileName);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('读取 localStorage 覆盖数据失败:', fileName, e);
    return null;
  }
}

/**
 * 获取 JSON 数据（带缓存，优先使用 localStorage 覆盖）
 *
 * 读取优先级：
 *   1. 内存缓存（同一页面会话内不重复请求）
 *   2. localStorage 覆盖（管理员尚未同步的临时数据）
 *   3. GitHub Pages JSON 文件（带时间戳防缓存）
 *
 * @param {string} fileName - 文件名（不含路径前缀，如 'swimmers.json'）
 * @returns {Promise<Array|Object>} 解析后的 JSON 数据
 */
export async function fetchData(fileName) {
  if (cache.has(fileName)) {
    return cache.get(fileName);
  }

  // 优先尝试 localStorage 中的覆盖数据（管理员临时写入）
  const localData = getLocalOverrides(fileName);
  if (localData !== null) {
    cache.set(fileName, localData);
    return localData;
  }

  // 回退到 fetch JSON 文件（GitHub Pages 共享数据源）
  const basePath = getBasePath();
  const url = `${basePath}${fileName}?t=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`加载 ${fileName} 失败: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  cache.set(fileName, data);
  return data;
}

/**
 * 清除缓存（用于手动刷新数据或写入后失效缓存）
 */
export function clearCache() {
  cache.clear();
}

/**
 * 刷新所有数据（清除缓存 + 重新加载）
 * 注意：此函数不清除 localStorage 覆盖，仅清除内存缓存。
 * 如需从 GitHub 拉取最新数据并清除本地覆盖，使用 syncService.syncFromGitHub()。
 */
export async function refreshAll() {
  clearCache();
}

/**
 * 按 ID 从数组中查找单个元素
 * @param {Array} arr - 数据数组
 * @param {string} id - 要查找的 ID
 * @returns {Object|undefined}
 */
export function findById(arr, id) {
  return arr.find(item => item.id === id);
}

/**
 * 按 ID 数组批量查找
 * @param {Array} arr - 数据数组
 * @param {string[]} ids - ID 数组
 * @returns {Array}
 */
export function findByIds(arr, ids) {
  if (!Array.isArray(ids)) return [];
  return arr.filter(item => ids.includes(item.id));
}
