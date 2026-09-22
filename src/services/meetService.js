/**
 * meetService.js - 比赛数据服务
 */
import { fetchData, findById } from './dataService.js';

const FILE = 'meets.json';

/**
 * 获取所有比赛
 * @returns {Promise<Array>}
 */
export async function getAllMeets() {
  return fetchData(FILE);
}

/**
 * 按 ID 获取比赛
 * @param {string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getMeetById(id) {
  const meets = await getAllMeets();
  return findById(meets, id);
}

/**
 * 按状态筛选比赛
 * @param {string} status
 * @returns {Promise<Array>}
 */
export async function getMeetsByStatus(status) {
  const meets = await getAllMeets();
  return meets.filter(m => m.status === status);
}

/**
 * 获取比赛名称映射 { id: name }
 * @returns {Promise<Object>}
 */
export async function getMeetNameMap() {
  const meets = await getAllMeets();
  const map = {};
  meets.forEach(m => { map[m.id] = m.name; });
  return map;
}
