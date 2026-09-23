/**
 * confirmModal.js - 两步式危险操作确认组件
 *
 * 用于"永久删除"类操作：
 *   第一步：展示对象信息与级联影响（该运动员存在 N 条成绩记录…），
 *           按钮明确写"永久删除"
 *   第二步：再次确认，按钮写"确认永久删除"
 *   只有完成两步才 resolve(true)
 *
 * 用法：
 *   import { showHardDeleteConfirm } from '../src/components/confirmModal.js';
 *   const ok = await showHardDeleteConfirm({
 *     entityLabel: '运动员',
 *     name: '张三',
 *     id: 'S001',
 *     resultCount: 12
 *   });
 */

/**
 * 显示两步式永久删除确认弹窗
 * @param {Object} opts
 * @param {string} opts.entityLabel - 实体中文名（运动员/比赛/项目）
 * @param {string} opts.name       - 对象名称
 * @param {string} opts.id         - 对象 ID
 * @param {number} opts.resultCount - 关联成绩数量（级联删除数）
 * @returns {Promise<boolean>} 用户完成两步确认返回 true，否则 false
 */
export function showHardDeleteConfirm(opts) {
  const { entityLabel, name, id, resultCount } = opts;

  return new Promise((resolve) => {
    // 若已存在弹窗，先移除
    const old = document.getElementById('hardDeleteModal');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'hardDeleteModal';
    overlay.style.zIndex = '3000';

    // ---- 第一步内容 ----
    const cascadeLine = resultCount > 0
      ? `<div style="background:rgba(220,53,69,0.08);border:1px solid rgba(220,53,69,0.3);border-radius:8px;padding:10px 12px;margin:12px 0;font-size:0.9rem;color:#c62828;">
           该${escapeHtmlModal(entityLabel)}存在 <strong>${resultCount}</strong> 条成绩记录，删除后相关数据也将被<strong>永久删除</strong>。
         </div>`
      : `<div style="background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.4);border-radius:8px;padding:10px 12px;margin:12px 0;font-size:0.9rem;color:#856404;">
           该${escapeHtmlModal(entityLabel)}没有关联成绩记录。
         </div>`;

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 style="color:var(--danger,#dc3545);">永久删除${escapeHtmlModal(entityLabel)}</h2>
          <button class="modal-close" id="hdmClose">&times;</button>
        </div>
        <div class="modal-body" id="hdmBody">
          <div style="font-size:1rem;line-height:1.8;">
            <strong>${escapeHtmlModal(name)}</strong>（${escapeHtmlModal(id)}）
          </div>
          ${cascadeLine}
          <div style="font-size:0.85rem;color:var(--text-secondary);">
            删除将同步到 GitHub（一次批量提交），同步后所有设备生效。
            Git 历史中旧版本仍可追溯，但当前正式数据将被移除且不可恢复。
          </div>
        </div>
        <div class="modal-footer" id="hdmFooter">
          <button class="btn btn-outline" id="hdmCancel">取消</button>
          <button class="btn btn-danger" id="hdmConfirm1">永久删除</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('#hdmClose').addEventListener('click', () => close(false));
    overlay.querySelector('#hdmCancel').addEventListener('click', () => close(false));
    // 点击遮罩不关闭（危险操作防误触）

    overlay.querySelector('#hdmConfirm1').addEventListener('click', () => {
      // ---- 切换到第二步：再次确认 ----
      const body = overlay.querySelector('#hdmBody');
      const footer = overlay.querySelector('#hdmFooter');
      body.innerHTML = `
        <div style="font-size:1.05rem;font-weight:700;color:#c62828;margin-bottom:10px;">
          ⚠️ 再次确认
        </div>
        <div style="font-size:0.95rem;line-height:1.8;">
          确定要永久删除 <strong>${escapeHtmlModal(name)}</strong>（${escapeHtmlModal(id)}）
          ${resultCount > 0 ? `及其 <strong>${resultCount}</strong> 条关联成绩` : ''}吗？
          <br>此操作同步后<strong>不可恢复</strong>。
        </div>
      `;
      footer.innerHTML = `
        <button class="btn btn-outline" id="hdmCancel2">取消</button>
        <button class="btn btn-danger" id="hdmConfirm2">确认永久删除</button>
      `;
      footer.querySelector('#hdmCancel2').addEventListener('click', () => close(false));
      footer.querySelector('#hdmConfirm2').addEventListener('click', () => close(true));
    });
  });
}

function escapeHtmlModal(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
