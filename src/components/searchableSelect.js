/**
 * searchableSelect.js - 统一搜索下拉组件
 *
 * 设计原则（渐进增强）：
 *   保留页面中已有的原生 <select> 元素，将其隐藏，在其位置注入
 *   “搜索输入框 + 下拉面板”。所有选择操作最终写回原生 select.value，
 *   并派发原生 'change' 事件——页面现有 JS（读 select.value、监听
 *   change 联动）完全无需改动。
 *
 * 特性：
 *   - 输入实时过滤（支持中文、按编号搜索）
 *   - 点击选中；空结果显示“无匹配项”；可清空搜索
 *   - 已选状态在输入框内清晰展示
 *   - 支持键盘操作（上下键移动高亮、Enter 选中、Esc 关闭）
 *   - 支持移动端（触摸友好）
 *
 * 用法：
 *   import { initAllSearchableSelects } from '../src/components/searchableSelect.js';
 *   initAllSearchableSelects({ minLength: 8, excludeIds: ['formStatus'] });
 */

/**
 * 初始化一个可搜索 select
 * @param {HTMLSelectElement} selectEl - 原生 select 元素
 * @param {Object} opts
 * @param {string}  opts.placeholder - 搜索框占位提示，默认“搜索或点击选择…”
 * @param {string}  opts.emptyText   - 搜索无结果的提示文案
 * @param {number}  opts.minLength   - 选项数下限，短列表不启用（force 时忽略）
 * @param {boolean} opts.force       - 强制启用，忽略 minLength
 * @returns {Object|null} 组件实例（含 refresh/destroy 方法）
 */
export function initSearchableSelect(selectEl, opts = {}) {
  if (!selectEl || selectEl.tagName !== 'SELECT') return null;
  if (selectEl.dataset.searchable === 'true') return null; // 已初始化

  const config = {
    placeholder: opts.placeholder || '搜索或点击选择…',
    emptyText: opts.emptyText || '无匹配项',
    minLength: opts.minLength != null ? opts.minLength : 0,
    force: !!opts.force
  };

  // 选项太少时不启用（除非 force）
  if (!config.force && selectEl.options.length < config.minLength) return null;

  selectEl.dataset.searchable = 'true';
  // 隐藏原生 select，但保持其参与表单与 JS 读取
  selectEl.classList.add('ss-hidden-select');

  // --- 构建 DOM ---
  const wrapper = document.createElement('div');
  wrapper.className = 'ss-wrapper';
  wrapper.setAttribute('role', 'combobox');
  wrapper.setAttribute('aria-expanded', 'false');
  wrapper.setAttribute('aria-haspopup', 'listbox');

  wrapper.innerHTML = `
    <input type="text" class="ss-input" placeholder="${escapeHtmlOptions(config.placeholder)}"
           autocomplete="off" role="textbox" aria-autocomplete="list">
    <button type="button" class="ss-clear-btn" title="清空" aria-label="清空选择"
            style="display:none;">&times;</button>
    <div class="ss-dropdown" role="listbox"></div>
  `;

  selectEl.parentNode.insertBefore(wrapper, selectEl);

  const input = wrapper.querySelector('.ss-input');
  const dropdown = wrapper.querySelector('.ss-dropdown');
  const clearBtn = wrapper.querySelector('.ss-clear-btn');

  let isOpen = false;
  let highlightIndex = -1;
  let visibleOptions = []; // 过滤后可见的 option 列表

  // --- 工具函数 ---
  function updateClearBtn() {
    clearBtn.style.display = input.value ? 'flex' : 'none';
  }

  /** 空占位选项（value 为空串）不算真实选择 */
  function isPlaceholderOption(o) {
    return o && o.value === '';
  }

  /** select.value 变化 → 同步输入框显示 */
  function syncFromSelect() {
    const sel = selectEl.selectedOptions[0];
    if (!sel) return;
    // 用户正在输入搜索词时不打断
    if (document.activeElement === input && isOpen) return;
    input.value = isPlaceholderOption(sel) ? '' : sel.textContent;
    updateClearBtn();
  }

  /** 读取 select 全部选项（跳过 disabled） */
  function getAllOptions() {
    return Array.from(selectEl.options).filter(o => !o.disabled);
  }

  /** 打开下拉并按当前输入过滤 */
  function openDropdown() {
    isOpen = true;
    wrapper.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('open');
    filterAndRender(input.value);
    input.focus();
  }

  function closeDropdown() {
    isOpen = false;
    wrapper.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('open');
    highlightIndex = -1;
  }

  /** 核心过滤逻辑：按选项文本或值实时过滤 */
  function filterAndRender(query) {
    query = (query || '').trim().toLowerCase();
    const all = getAllOptions();
    visibleOptions = query
      ? all.filter(o =>
          o.textContent.toLowerCase().includes(query) ||
          String(o.value).toLowerCase().includes(query))
      : all;

    if (visibleOptions.length === 0) {
      dropdown.innerHTML = `<div class="ss-empty">${escapeHtmlOptions(config.emptyText)}</div>`;
      return;
    }
    dropdown.innerHTML = visibleOptions.map((o, i) => `
      <div class="ss-option${o.selected ? ' ss-selected' : ''}" data-index="${i}" role="option">
        ${escapeHtmlOptions(o.textContent)}
      </div>
    `).join('');
    // 默认高亮已选项，否则第一项
    const selIdx = visibleOptions.findIndex(o => o.selected);
    highlightIndex = selIdx >= 0 ? selIdx : 0;
    applyHighlight(false);
  }

  /** 键盘高亮辅助：next 为新索引，scroll 控制是否滚动 */
  function applyHighlight(scroll = true) {
    const nodes = dropdown.querySelectorAll('.ss-option');
    nodes.forEach(el => el.classList.remove('ss-highlight'));
    if (nodes[highlightIndex]) {
      nodes[highlightIndex].classList.add('ss-highlight');
      if (scroll) nodes[highlightIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  /** 选中一个选项：写回原生 select 并触发 change */
  function selectOption(index) {
    const opt = visibleOptions[index];
    if (!opt) return;
    selectEl.value = opt.value;
    // 触发原生 change，让页面现有逻辑联动
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    input.value = opt.textContent;
    updateClearBtn();
    closeDropdown();
  }

  /** 清空选择（回到空占位项） */
  function clearSelection() {
    selectEl.value = '';
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    input.value = '';
    updateClearBtn();
    closeDropdown();
  }

  // --- 事件绑定 ---
  input.addEventListener('focus', openDropdown);
  input.addEventListener('click', openDropdown);
  input.addEventListener('input', () => {
    updateClearBtn();
    if (!isOpen) openDropdown();
    filterAndRender(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) { openDropdown(); return; }
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const next = highlightIndex + dir;
      if (next >= 0 && next < visibleOptions.length) {
        highlightIndex = next;
        applyHighlight();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < visibleOptions.length) {
        selectOption(highlightIndex);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  // 下拉面板点击选择
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.ss-option');
    if (item) {
      selectOption(parseInt(item.dataset.index, 10));
    }
  });

  // 点击组件外部关闭
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target) && e.target !== selectEl) {
      closeDropdown();
    }
  });

  // 清空按钮
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelection();
  });

  // 监听 select 选项增删（页面动态填充选项后自动同步显示）
  const mo = new MutationObserver(() => { syncFromSelect(); });
  mo.observe(selectEl, { childList: true });

  // 初始同步
  syncFromSelect();

  // 返回实例，供页面在重新填充选项后调用
  return {
    refresh() {
      syncFromSelect();
    },
    destroy() {
      mo.disconnect();
      wrapper.remove();
      delete selectEl.dataset.searchable;
      selectEl.classList.remove('ss-hidden-select');
    }
  };
}

/**
 * 批量初始化页面内所有符合条件的 select
 * @param {Object} opts
 * @param {number}  opts.minLength  - 选项数下限（默认 8），短列表不启用
 * @param {string[]} opts.excludeIds - 排除的 select id 列表
 * @returns {number} 成功初始化的数量
 */
export function initAllSearchableSelects(opts = {}) {
  const all = document.querySelectorAll('select');
  let count = 0;
  all.forEach(sel => {
    if (opts.excludeIds && opts.excludeIds.includes(sel.id)) return;
    if (initSearchableSelect(sel, {
      minLength: opts.minLength != null ? opts.minLength : 8,
      force: opts.force
    })) {
      count++;
    }
  });
  return count;
}

function escapeHtmlOptions(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
