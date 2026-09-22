/**
 * app.js - 全局应用逻辑
 *
 * 负责：管理员认证、导航栏渲染、数据刷新、通用工具
 *
 * 架构（P2 更新）：
 *   普通用户：直接浏览数据，导航栏无管理入口
 *   管理员：输入密码 2022 进入管理模式，导航栏显示管理入口
 *   退出管理模式：点击导航栏"退出"按钮
 *
 *   数据刷新：
 *   - 导航栏"刷新"按钮：清除缓存从 GitHub Pages 重新拉取最新 JSON
 *   - 显示"最后同步时间"
 */

import { isAdminMode, loginAdmin, logoutAdmin, getCurrentRole, hasPermission, ROLES, getRoleDisplayName } from '../../src/services/authService.js';
import { syncFromGitHub, getLastSyncDisplay, hasLocalOverrides } from '../../src/services/syncService.js';
import { clearCache, refreshAll } from '../../src/services/dataService.js';

/** 品牌名称 */
const BRAND_NAME = '鼠智赛事通';

/** 应用名称（含副标题） */
const APP_TITLE = '鼠智赛事通 · 上海大学游泳队';

/**
 * 判断当前页面是否在 pages/ 子目录下
 */
function isSubPage() {
  return window.location.pathname.includes('/pages/');
}

/**
 * 获取相对于根目录的路径前缀
 */
function pathPrefix() {
  return isSubPage() ? '../' : './';
}

/**
 * 初始化页面：设置角色、渲染导航栏
 */
export function initPage() {
  const role = getCurrentRole();
  document.body.setAttribute('data-role', role);
  renderNavbar(role);
  updatePageTitle();
}

/**
 * 更新页面标题（title 标签）
 */
function updatePageTitle() {
  if (document.title && !document.title.includes(BRAND_NAME)) {
    document.title = document.title.replace('游泳成绩管理系统', BRAND_NAME);
  }
}

/**
 * 渲染导航栏
 * @param {string} role - 当前角色
 */
function renderNavbar(role) {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const prefix = pathPrefix();
  const admin = isAdminMode();

  const pages = [
    { href: `${prefix}index.html`, label: '首页', always: true },
    { href: `${prefix}pages/results.html`, label: '成绩', always: true },
    { href: `${prefix}pages/swimmers.html`, label: '运动员', always: true },
    { href: `${prefix}pages/meets.html`, label: '比赛', always: true },
    { href: `${prefix}pages/events.html`, label: '项目', always: true },
    { href: `${prefix}pages/ranking.html`, label: '排名', always: true },
    { href: `${prefix}pages/athlete-grade.html`, label: '等级查询', always: true },
    { href: `${prefix}pages/admin-results-add.html`, label: '录入成绩', adminOnly: true },
    { href: `${prefix}pages/admin.html`, label: '管理', adminOnly: true },
  ];

  const navItems = pages
    .filter(p => p.always || (p.adminOnly && admin))
    .map(p => {
      let href = p.href;
      if (isSubPage() && p.href.includes('pages/')) {
        href = p.href.replace(`${prefix}pages/`, '');
      }
      return `<a href="${href}">${p.label}</a>`;
    })
    .join('');

  // 右侧操作区
  let rightSection;
  if (admin) {
    rightSection = `
      <div class="role-switcher">
        <button class="btn-refresh" id="btnRefresh" title="从 GitHub 刷新数据">刷新</button>
        <span class="sync-time" id="syncTime">${getLastSyncDisplay()}</span>
        <button class="btn-logout" id="btnLogout">退出</button>
      </div>
    `;
  } else {
    rightSection = `
      <div class="role-switcher">
        <button class="btn-refresh" id="btnRefresh" title="从 GitHub 刷新数据">刷新</button>
        <button class="btn-login" id="btnLogin">管理员</button>
      </div>
    `;
  }

  navbar.innerHTML = `
    <a href="${prefix}index.html" class="navbar-brand">${BRAND_NAME}</a>
    <nav class="navbar-nav">
      ${navItems}
    </nav>
    ${rightSection}
  `;

  // 绑定事件
  const btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', handleRefresh);
  }

  const btnLogin = document.getElementById('btnLogin');
  if (btnLogin) {
    btnLogin.addEventListener('click', showLoginModal);
  }

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }
}

/**
 * 处理刷新数据
 */
async function handleRefresh() {
  const btn = document.getElementById('btnRefresh');
  if (btn) {
    btn.textContent = '刷新中...';
    btn.disabled = true;
  }

  try {
    // 清除 localStorage 覆盖（如果有），从 GitHub 拉取最新数据
    const overrides = hasLocalOverrides();
    const hasOverrides = Object.values(overrides).some(v => v);

    if (hasOverrides) {
      // 有本地未同步数据，提示用户
      if (!confirm('本地有尚未同步到 GitHub 的修改数据。刷新将从 GitHub 拉取最新数据，本地未同步的修改将被清除。是否继续？')) {
        if (btn) { btn.textContent = '刷新'; btn.disabled = false; }
        return;
      }
      // 清除本地覆盖
      const files = ['swimmers.json', 'meets.json', 'events.json', 'results.json'];
      const prefix = 'swim_data_';
      files.forEach(f => localStorage.removeItem(prefix + f));
    }

    await syncFromGitHub();
    clearCache();

    // 更新同步时间显示
    const syncTime = document.getElementById('syncTime');
    if (syncTime) {
      syncTime.textContent = getLastSyncDisplay();
    }

    if (btn) { btn.textContent = '刷新'; btn.disabled = false; }

    // 刷新页面以加载新数据
    location.reload();
  } catch (err) {
    if (btn) { btn.textContent = '刷新'; btn.disabled = false; }
    alert('刷新失败: ' + err.message);
  }
}

/**
 * 显示管理员登录弹窗
 */
function showLoginModal() {
  // 如果已存在模态框，不重复创建
  if (document.getElementById('loginModal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'loginModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>管理员登录</h2>
        <button class="modal-close" id="closeLoginModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>管理员密码</label>
          <input type="password" id="adminPassword" placeholder="请输入管理员密码" autofocus>
        </div>
        <div id="loginError" class="alert alert-error" style="display:none;margin-top:8px;">
          密码错误，请重试
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="cancelLogin">取消</button>
        <button class="btn btn-primary" id="confirmLogin">登录</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeBtn = document.getElementById('closeLoginModal');
  const cancelBtn = document.getElementById('cancelLogin');
  const confirmBtn = document.getElementById('confirmLogin');
  const passwordInput = document.getElementById('adminPassword');
  const errorDiv = document.getElementById('loginError');

  function closeModal() {
    modal.remove();
  }

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;

  confirmBtn.onclick = () => {
    const password = passwordInput.value;
    if (loginAdmin(password)) {
      closeModal();
      location.reload();
    } else {
      errorDiv.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  };

  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    }
  });
}

/**
 * 处理退出管理员模式
 */
function handleLogout() {
  if (confirm('确定退出管理员模式？')) {
    logoutAdmin();
    location.reload();
  }
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

/**
 * 获取品牌名称
 * @returns {string}
 */
export function getBrandName() {
  return BRAND_NAME;
}
