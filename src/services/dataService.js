/**
 * dataService.js - 基础数据访问层
 * 
 * 负责从 JSON 文件加载所有数据，提供缓存。
 * 同时集成 localStorage 读取层：如果 localStorage 中有修改后的数据，
 * 优先使用 localStorage 中的版本（合并原始 JSON + localStorage 新增/修改）。
 * 
 * 所有具体 Service 继承或引用此模块。
 * 
 * 后续如果从 JSON 迁移到真正数据库（如 Supabase / PostgreSQL），
 * 只需替换此层，而不用重写整个前端。
 */

const cache = new Map();

/**
 * 动态计算 data 目录的基准路径
 * - index.html 在根目录，路径为 ./data/
 * - pages/*.html 在 pages/ 目录，路径为 ../data/
 */
function getBasePath() {
  const depth = window.location.pathname.split('/').filter(s => s).length;
  // 如果最后一项是 index.html 或为空（根路径），则在根目录
  // 如果路径中包含 pages/，则需要返回上一级
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
 * @param {string} fileName - 文件名（不含路径前缀，如 'swimmers.json'）
 * @returns {Promise<Array|Object>} 解析后的 JSON 数据
 */
export async function fetchData(fileName) {
  if (cache.has(fileName)) {
    return cache.get(fileName);
  }

  // 优先尝试 localStorage 中的覆盖数据
  const localData = getLocalOverrides(fileName);
  if (localData !== null) {
    cache.set(fileName, localData);
    return localData;
  }

  // 回退到 fetch JSON 文件
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
 * 清除缓存（用于手动刷新数据）
 */
export function clearCache() {
  cache.clear();
}

/**
 * 刷新所有数据（清除缓存 + 重新加载）
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
