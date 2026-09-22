/**
 * dataService.js - 基础数据访问层
 * 
 * 负责从 JSON 文件加载所有数据，提供缓存。
 * 所有具体 Service 继承或引用此模块。
 * 
 * 后续如果从 JSON 迁移到真正数据库（如 Supabase / PostgreSQL），
 * 只需替换此层，而不用重写整个前端。
 */

const cache = new Map();
const BASE_PATH = './data/';

/**
 * 获取 JSON 数据（带缓存）
 * @param {string} fileName - 文件名（不含路径前缀，如 'swimmers.json'）
 * @returns {Promise<Array|Object>} 解析后的 JSON 数据
 */
export async function fetchData(fileName) {
  if (cache.has(fileName)) {
    return cache.get(fileName);
  }
  const url = `${BASE_PATH}${fileName}?t=${Date.now()}`;
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
 * 刷新所有数据
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
