/**
 * app.js - 全局应用逻辑
 * 
 * 负责：角色管理、导航栏渲染、通用工具
 */

import { getCurrentRole, setCurrentRole, getRoleDisplayName, isAdmin, ROLES } from '../src/services/authService.js';

/**
 * 初始化页面：设置角色、渲染导航栏
 */
export function initPage() {
  const role = getCurrentRole();
  document.body.setAttribute('data-role', role);
  renderNavbar(role);
}

/**
 * 渲染导航栏
 * @param {string} role - 当前角色
 */
function renderNavbar(role) {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const pages = [
    { href: 'index.html', label: '首页', always: true },
    { href: 'pages/results.html', label: '成绩', always: true },
    { href: 'pages/swimmers.html', label: '运动员', always: true },
    { href: 'pages/meets.html', label: '比赛', always: true },
    { href: 'pages/events.html', label: '项目', always: true },
    { href: 'pages/ranking.html', label: '排名', always: true },
    { href: 'pages/admin.html', label: '管理', adminOnly: true },
  ];

  const navItems = pages
    .filter(p => p.always || (p.adminOnly && isAdmin()))
    .map(p => `<a href="${p.href}">${p.label}</a>`)
    .join('');

  const roleOptions = Object.values(ROLES)
    .map(r => `<option value="${r}" ${r === role ? 'selected' : ''}>${getRoleDisplayName(r)}</option>`)
    .join('');

  navbar.innerHTML = `
    <a href="../index.html" class="navbar-brand">游泳成绩系统</a>
    <nav class="navbar-nav">
      ${navItems}
    </nav>
    <div class="role-switcher">
      <select id="roleSelect" aria-label="切换角色">
        ${roleOptions}
      </select>
    </div>
  `;

  document.getElementById('roleSelect').addEventListener('change', (e) => {
    setCurrentRole(e.target.value);
    location.reload();
  });
}

/**
 * 显示消息提示
 * @param {string} elementId - 容器元素 ID
 * @param {string} message - 消息内容
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 */
export function showAlert(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.style.display = 'block';
}

/**
 * 清除消息提示
 * @param {string} elementId
 */
export function clearAlert(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = 'none';
}

/**
 * 获取 URL 查询参数
 * @param {string} param - 参数名
 * @returns {string|null}
 */
export function getUrlParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

/**
 * 转义 HTML 防止 XSS
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * 格式化日期显示
 * @param {string} dateStr - ISO 日期字符串
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 泳姿中文映射
 * @param {string} stroke
 * @returns {string}
 */
export function strokeName(stroke) {
  const map = {
    freestyle: '自由泳',
    breaststroke: '蛙泳',
    backstroke: '仰泳',
    butterfly: '蝶泳',
    medley: '混合泳'
  };
  return map[stroke] || stroke;
}

/**
 * 性别中文映射
 * @param {string} gender
 * @returns {string}
 */
export function genderName(gender) {
  return gender === 'male' ? '男' : gender === 'female' ? '女' : gender;
}
