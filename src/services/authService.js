/**
 * authService.js - 演示级权限服务
 * 
 * ⚠️ 重要安全声明：
 * 当前版本的角色控制属于前端演示级权限，
 * 不能视为真正安全的生产级身份认证。
 * 前端角色控制仅用于 UI 层面的显示/隐藏，
 * 不构成真正的安全权限控制。
 * 
 * 后续如需真正安全的身份认证，必须增加：
 * - 受保护的后端服务
 * - GitHub OAuth / GitHub App
 * - 或其他安全认证机制
 */

import { fetchData } from './dataService.js';

const FILE = 'users.json';

/**
 * 角色常量
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCORE_ADMIN: 'SCORE_ADMIN',
  VIEWER: 'VIEWER'
};

/**
 * 角色权限矩阵
 */
export const PERMISSIONS = {
  SUPER_ADMIN: {
    viewData: true,
    addSwimmer: true,
    editSwimmer: true,
    createMeet: true,
    createEvent: true,
    addResult: true,
    editResult: true,
    deleteResult: true,
    manageAdmins: true,
    manageConfig: true
  },
  SCORE_ADMIN: {
    viewData: true,
    addSwimmer: false,
    editSwimmer: false,
    createMeet: false,
    createEvent: false,
    addResult: true,
    editResult: true,
    deleteResult: false,
    manageAdmins: false,
    manageConfig: false
  },
  VIEWER: {
    viewData: true,
    addSwimmer: false,
    editSwimmer: false,
    createMeet: false,
    createEvent: false,
    addResult: false,
    editResult: false,
    deleteResult: false,
    manageAdmins: false,
    manageConfig: false
  }
};

/** 当前角色（存储在 sessionStorage，刷新不丢失） */
const STORAGE_KEY = 'swim_current_role';

/**
 * 获取当前角色
 * @returns {string} 角色常量
 */
export function getCurrentRole() {
  return sessionStorage.getItem(STORAGE_KEY) || ROLES.VIEWER;
}

/**
 * 设置当前角色（演示用，直接切换）
 * @param {string} role
 */
export function setCurrentRole(role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error('无效的角色: ' + role);
  }
  sessionStorage.setItem(STORAGE_KEY, role);
}

/**
 * 检查当前角色是否有指定权限
 * @param {string} permission - 权限名
 * @returns {boolean}
 */
export function hasPermission(permission) {
  const role = getCurrentRole();
  const perms = PERMISSIONS[role];
  return !!(perms && perms[permission]);
}

/**
 * 检查是否是管理员
 * @returns {boolean}
 */
export function isAdmin() {
  const role = getCurrentRole();
  return role === ROLES.SUPER_ADMIN || role === ROLES.SCORE_ADMIN;
}

/**
 * 获取所有用户（演示用）
 * @returns {Promise<Array>}
 */
export async function getAllUsers() {
  return fetchData(FILE);
}

/**
 * 获取角色显示名
 * @param {string} role
 * @returns {string}
 */
export function getRoleDisplayName(role) {
  const names = {
    SUPER_ADMIN: '超级管理员',
    SCORE_ADMIN: '成绩管理员',
    VIEWER: '普通用户'
  };
  return names[role] || '未知';
}
