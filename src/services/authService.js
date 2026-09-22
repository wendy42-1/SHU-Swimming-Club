/**
 * authService.js - 管理员认证服务
 *
 * 架构（P2 更新）：
 *   普通用户无需登录，直接浏览数据。
 *   管理员输入密码 2022 进入管理模式，获得全部管理权限。
 *   不建账号系统、不做 OAuth/JWT。
 *
 *   安全声明：
 *   前端密码验证属于演示级权限控制，不能视为真正安全的生产级身份认证。
 *   真正的安全由 GitHub Issue 提交机制保障——只有拥有仓库写权限的人
 *   才能创建 Issue 并触发 Actions。
 *
 *   兼容性：
 *   保留 ROLES 常量和 hasPermission() 函数签名，使现有管理页面无需大改。
 *   管理模式下所有权限均为 true（相当于原 SUPER_ADMIN）。
 */

/** 角色常量（保留兼容性） */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCORE_ADMIN: 'SCORE_ADMIN',
  VIEWER: 'VIEWER'
};

/** 角色权限矩阵（管理员模式 = 全权限，普通用户 = 只读） */
export const PERMISSIONS = {
  SUPER_ADMIN: {
    viewData: true, addSwimmer: true, editSwimmer: true, deleteSwimmer: true,
    createMeet: true, deleteMeet: true, createEvent: true,
    addResult: true, editResult: true, deleteResult: true,
    manageAdmins: true, manageConfig: true
  },
  SCORE_ADMIN: {
    viewData: true, addSwimmer: true, editSwimmer: true, deleteSwimmer: true,
    createMeet: true, deleteMeet: true, createEvent: true,
    addResult: true, editResult: true, deleteResult: true,
    manageAdmins: true, manageConfig: true
  },
  VIEWER: {
    viewData: true, addSwimmer: false, editSwimmer: false, deleteSwimmer: false,
    createMeet: false, deleteMeet: false, createEvent: false,
    addResult: false, editResult: false, deleteResult: false,
    manageAdmins: false, manageConfig: false
  }
};

/** 管理员密码 */
const ADMIN_PASSWORD = '2022';

/** sessionStorage key */
const STORAGE_KEY = 'swim_admin_mode';
const STORAGE_ROLE = 'swim_current_role';

/**
 * 登录管理员模式
 * @param {string} password - 管理员密码
 * @returns {boolean} 是否登录成功
 */
export function loginAdmin(password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    sessionStorage.setItem(STORAGE_ROLE, ROLES.SUPER_ADMIN);
    return true;
  }
  return false;
}

/**
 * 退出管理员模式
 */
export function logoutAdmin() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_ROLE);
}

/**
 * 检查是否处于管理员模式
 * @returns {boolean}
 */
export function isAdminMode() {
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * 获取当前角色（兼容旧代码）
 * 管理模式 → SUPER_ADMIN，普通模式 → VIEWER
 * @returns {string} 角色常量
 */
export function getCurrentRole() {
  if (isAdminMode()) {
    return ROLES.SUPER_ADMIN;
  }
  return ROLES.VIEWER;
}

/**
 * 设置当前角色（兼容旧代码，管理模式下切换无实际效果）
 * @param {string} role
 */
export function setCurrentRole(role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error('无效的角色: ' + role);
  }
  sessionStorage.setItem(STORAGE_ROLE, role);
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
 * 检查是否是管理员（兼容旧代码）
 * @returns {boolean}
 */
export function isAdmin() {
  return isAdminMode();
}

/**
 * 获取管理员操作者名称（用于数据审计字段）
 * @returns {string}
 */
export function getOperatorName() {
  return isAdminMode() ? 'admin' : 'viewer';
}

/**
 * 获取角色显示名
 * @param {string} role
 * @returns {string}
 */
export function getRoleDisplayName(role) {
  const names = {
    SUPER_ADMIN: '管理员',
    SCORE_ADMIN: '管理员',
    VIEWER: '普通用户'
  };
  return names[role] || '未知';
}
