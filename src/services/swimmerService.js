/**
 * swimmerService.js - 运动员数据服务
 */
import { fetchData, findById } from './dataService.js';

const FILE = 'swimmers.json';

/**
 * 获取所有运动员
 * @returns {Promise<Array>}
 */
export async function getAllSwimmers() {
  return fetchData(FILE);
}

/**
 * 按 ID 获取运动员
 * @param {string} id - 运动员 ID
 * @returns {Promise<Object|undefined>}
 */
export async function getSwimmerById(id) {
  const swimmers = await getAllSwimmers();
  return findById(swimmers, id);
}

/**
 * 按性别筛选运动员
 * @param {string} gender - 'male' | 'female'
 * @returns {Promise<Array>}
 */
export async function getSwimmersByGender(gender) {
  const swimmers = await getAllSwimmers();
  return swimmers.filter(s => s.gender === gender);
}

/**
 * 按状态筛选运动员
 * @param {string} status - 'active' | 'inactive'
 * @returns {Promise<Array>}
 */
export async function getSwimmersByStatus(status) {
  const swimmers = await getAllSwimmers();
  return swimmers.filter(s => s.status === status);
}

/**
 * 获取运动员姓名映射 { id: name }
 * @returns {Promise<Object>}
 */
export async function getSwimmerNameMap() {
  const swimmers = await getAllSwimmers();
  const map = {};
  swimmers.forEach(s => { map[s.id] = s.name; });
  return map;
}
