/**
 * time.js - 游泳成绩时间工具
 * 
 * 成绩内部统一使用毫秒整数（ms），不使用浮点数
 * 例如：58.32秒 → 58320，1分02.35秒 → 62350
 * 
 * 提供：解析、毫秒转换、显示格式化、时间比较
 */

/**
 * 将用户输入的成绩字符串解析为毫秒整数
 * 支持格式：
 *   "58.32"     → 58320  (秒.毫秒)
 *   "1:02.35"   → 62350  (分:秒.毫秒)
 *   "1:02"      → 62000  (分:秒)
 *   "58320"     → 58320  (直接传毫秒整数)
 * 
 * @param {string} input - 用户输入的成绩字符串
 * @returns {number} 毫秒整数
 * @throws {Error} 如果输入不合法
 */
export function parseTime(input) {
  if (typeof input === 'number') {
    if (input < 0 || !Number.isInteger(input)) {
      throw new Error('成绩必须是非负整数（毫秒）');
    }
    return input;
  }

  const str = String(input).trim();
  if (!str) throw new Error('请输入合法成绩，例如 58.32 或 1:02.35');

  // 如果是纯整数，直接作为毫秒
  if (/^\d+$/.test(str)) {
    const ms = parseInt(str, 10);
    if (ms < 0) throw new Error('成绩不能为负数');
    return ms;
  }

  // 匹配 分:秒.毫秒 格式 (如 1:02.35)
  const colonMatch = str.match(/^(\d+):(\d{1,2})\.(\d{1,3})$/);
  if (colonMatch) {
    const min = parseInt(colonMatch[1], 10);
    const sec = parseInt(colonMatch[2], 10);
    const ms = parseInt(colonMatch[3].padEnd(3, '0'), 10);
    if (sec >= 60) throw new Error('秒数不能超过59');
    return min * 60000 + sec * 1000 + ms;
  }

  // 匹配 分:秒 格式 (如 1:02)
  const colonNoMsMatch = str.match(/^(\d+):(\d{1,2})$/);
  if (colonNoMsMatch) {
    const min = parseInt(colonNoMsMatch[1], 10);
    const sec = parseInt(colonNoMsMatch[2], 10);
    if (sec >= 60) throw new Error('秒数不能超过59');
    return min * 60000 + sec * 1000;
  }

  // 匹配 秒.毫秒 格式 (如 58.32, 58.3, 58.321)
  const secMatch = str.match(/^(\d{1,3})\.(\d{1,3})$/);
  if (secMatch) {
    const sec = parseInt(secMatch[1], 10);
    const ms = parseInt(secMatch[2].padEnd(3, '0'), 10);
    return sec * 1000 + ms;
  }

  throw new Error('请输入合法成绩，例如 58.32 或 1:02.35');
}

/**
 * 将毫秒整数格式化为显示用字符串
 * 58320  → "58.32"
 * 62350  → "1:02.35"
 * 
 * @param {number} ms - 毫秒整数
 * @returns {string} 格式化后的成绩字符串
 */
export function formatTime(ms) {
  if (ms == null || ms === undefined || isNaN(ms)) return '--';
  if (ms < 0) return 'DQ';

  const totalSec = Math.floor(ms / 1000);
  const millis = ms % 1000;

  if (totalSec >= 60) {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
  }
  return `${totalSec}.${String(millis).padStart(2, '0')}`;
}

/**
 * 比较两个成绩（毫秒），用于排序
 * @param {number} a - 成绩A（毫秒）
 * @param {number} b - 成绩B（毫秒）
 * @returns {number} 负数表示A更快（更好），正数表示B更快
 */
export function compareTime(a, b) {
  return a - b;
}

/**
 * 校验成绩是否合法
 * @param {number} ms - 毫秒整数
 * @returns {boolean}
 */
export function isValidTime(ms) {
  return typeof ms === 'number' && Number.isInteger(ms) && ms >= 0;
}
