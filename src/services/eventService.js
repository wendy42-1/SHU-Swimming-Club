/**
 * eventService.js - 游泳项目数据服务
 */
import { fetchData, findById } from './dataService.js';

const FILE = 'events.json';

/**
 * 获取所有项目
 * @returns {Promise<Array>}
 */
export async function getAllEvents() {
  return fetchData(FILE);
}

/**
 * 按 ID 获取项目
 * @param {string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getEventById(id) {
  const events = await getAllEvents();
  return findById(events, id);
}

/**
 * 按性别筛选项目
 * @param {string} gender
 * @returns {Promise<Array>}
 */
export async function getEventsByGender(gender) {
  const events = await getAllEvents();
  return events.filter(e => e.gender === gender);
}

/**
 * 按类型筛选项目
 * @param {string} type - 'individual' | 'relay'
 * @returns {Promise<Array>}
 */
export async function getEventsByType(type) {
  const events = await getAllEvents();
  return events.filter(e => e.type === type);
}

/**
 * 获取项目名称映射 { id: name }
 * @returns {Promise<Object>}
 */
export async function getEventNameMap() {
  const events = await getAllEvents();
  const map = {};
  events.forEach(e => { map[e.id] = e.name; });
  return map;
}
