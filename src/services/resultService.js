/**
 * resultService.js - 成绩数据服务
 */
import { fetchData, findById } from './dataService.js';

const FILE = 'results.json';

/**
 * 获取所有成绩
 * @returns {Promise<Array>}
 */
export async function getAllResults() {
  return fetchData(FILE);
}

/**
 * 按 ID 获取成绩
 * @param {string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getResultById(id) {
  const results = await getAllResults();
  return findById(results, id);
}

/**
 * 按运动员 ID 筛选成绩
 * @param {string} swimmerId
 * @returns {Promise<Array>}
 */
export async function getResultsBySwimmer(swimmerId) {
  const results = await getAllResults();
  return results.filter(r => r.swimmerId === swimmerId);
}

/**
 * 按项目 ID 筛选成绩
 * @param {string} eventId
 * @returns {Promise<Array>}
 */
export async function getResultsByEvent(eventId) {
  const results = await getAllResults();
  return results.filter(r => r.eventId === eventId);
}

/**
 * 按比赛 ID 筛选成绩
 * @param {string} meetId
 * @returns {Promise<Array>}
 */
export async function getResultsByMeet(meetId) {
  const results = await getAllResults();
  return results.filter(r => r.meetId === meetId);
}

/**
 * 多条件筛选成绩
 * @param {Object} filters - { swimmerId, eventId, meetId, gender, status }
 * @param {Array} results - 可选，传入已有成绩数组避免重复加载
 * @returns {Promise<Array>}
 */
export async function filterResults(filters = {}, results = null) {
  let data = results || await getAllResults();
  if (filters.swimmerId) data = data.filter(r => r.swimmerId === filters.swimmerId);
  if (filters.eventId) data = data.filter(r => r.eventId === filters.eventId);
  if (filters.meetId) data = data.filter(r => r.meetId === filters.meetId);
  if (filters.status) data = data.filter(r => r.status === filters.status);
  return data;
}
