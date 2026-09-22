/**
 * athleteGrade.js - 运动员技术等级查询算法
 * 
 * 基于国家体育总局《运动员技术等级标准》（体竞字〔2024〕121号，2025年1月1日施行）
 * 数据文件：data/athlete-grade-standards/swimming-2024.json
 * 
 * 判定规则：
 * - 成绩方向：时间越短越好，timeMs <= standardTimeMs 为达标
 * - 从最高等级（国际级运动健将）到最低等级（三级运动员）依次判断
 * - 100米混合泳仅在25米池设项（50米池无国际级运动健将标准）
 * 
 * 未来版本预留：
 * - swimming-2027.json 等新版标准可通过 version 参数切换
 */

import { fetchData } from '../services/dataService.js';

const DEFAULT_VERSION = '2024';

/**
 * 项目 key 映射：distance_stroke → 标准文件中的事件 key
 */
const EVENT_KEY_MAP = {
  '50_freestyle': '50_freestyle',
  '100_freestyle': '100_freestyle',
  '200_freestyle': '200_freestyle',
  '400_freestyle': '400_freestyle',
  '800_freestyle': '800_freestyle',
  '1500_freestyle': '1500_freestyle',
  '50_backstroke': '50_backstroke',
  '100_backstroke': '100_backstroke',
  '200_backstroke': '200_backstroke',
  '50_breaststroke': '50_breaststroke',
  '100_breaststroke': '100_breaststroke',
  '200_breaststroke': '200_breaststroke',
  '50_butterfly': '50_butterfly',
  '100_butterfly': '100_butterfly',
  '200_butterfly': '200_butterfly',
  '100_medley': '100_medley',
  '200_medley': '200_medley',
  '400_medley': '400_medley'
};

/** stroke 归一化映射（兼容中文名） */
const STROKE_KEY_MAP = {
  freestyle: 'freestyle',
  '自由泳': 'freestyle',
  backstroke: 'backstroke',
  '仰泳': 'backstroke',
  breaststroke: 'breaststroke',
  '蛙泳': 'breaststroke',
  butterfly: 'butterfly',
  '蝶泳': 'butterfly',
  medley: 'medley',
  '混合泳': 'medley',
  '个人混合泳': 'medley'
};

/** 标准数据缓存 */
let standardsCache = null;
let standardsVersion = null;

/**
 * 加载等级标准数据（带缓存）
 * @param {string} version - 标准版本（默认 '2024'）
 * @returns {Promise<Object>} 标准数据对象
 */
export async function loadStandards(version = DEFAULT_VERSION) {
  if (standardsCache && standardsVersion === version) {
    return standardsCache;
  }
  const fileName = `athlete-grade-standards/swimming-${version}.json`;
  const data = await fetchData(fileName);
  standardsCache = data;
  standardsVersion = version;
  return data;
}

/**
 * 根据距离和泳姿构建标准事件 key
 * @param {number} distance - 距离（米）
 * @param {string} stroke - 泳姿
 * @returns {string|null} 标准 key 或 null（不支持）
 */
function buildEventKey(distance, stroke) {
  if (distance == null || !stroke) return null;
  const strokeKey = STROKE_KEY_MAP[String(stroke).toLowerCase()] || STROKE_KEY_MAP[stroke];
  if (!strokeKey) return null;
  const key = `${distance}_${strokeKey}`;
  return EVENT_KEY_MAP[key] || null;
}

/**
 * 从事件文件查询事件对象
 * @param {string} eventId - 项目 ID（如 'E001'）
 * @returns {Promise<Object|null>}
 */
async function findEvent(eventId) {
  if (!eventId) return null;
  // 如果传入的是事件编码（如 '50_freestyle'），直接可用
  if (EVENT_KEY_MAP[eventId]) return { distance: null, stroke: null, eventKey: eventId };
  const events = await fetchData('events.json');
  const ev = events.find(e => e.id === eventId);
  return ev || null;
}

/**
 * 毫秒格式化为标准显示字符串
 * @param {number|null} ms
 * @returns {string}
 */
export function formatStandardTime(ms) {
  if (ms == null) return '—';
  const totalSec = Math.floor(ms / 1000);
  const millis = ms % 1000;
  const two = String(millis).padStart(2, '0');
  if (totalSec >= 60) {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}.${two}`;
  }
  return `${totalSec}.${two}`;
}

/**
 * 查询某成绩可达到的技术等级
 * 
 * @param {Object} params
 * @param {string} params.gender - 'male' | 'female'
 * @param {string} params.eventId - 项目 ID（如 'E001'）或事件编码（如 '50_freestyle'）
 * @param {number} params.timeMs - 成绩（毫秒）
 * @param {string} [params.meetDate] - 比赛日期（ISO，预留：用于按日期选择标准版本）
 * @param {string} [params.meetType] - 比赛类型（预留）
 * @param {string} [params.meetLevel] - 比赛级别（预留）
 * @param {string} [params.poolType] - '50m_pool' | '25m_pool'，默认 '50m_pool'
 * @param {string} [params.version] - 标准版本（默认 '2024'）
 * @param {Object} [params.event] - 可选：直接传入事件对象（{ distance, stroke }）
 * @returns {Promise<Object>}
 */
export async function getEligibleGrades({
  gender,
  eventId,
  timeMs,
  meetDate,
  meetType,
  meetLevel,
  poolType = '50m_pool',
  version = DEFAULT_VERSION,
  event
}) {
  // 参数校验
  if (!gender) throw new Error('请选择性别');
  if (timeMs == null || timeMs < 0 || !Number.isInteger(timeMs)) {
    throw new Error('成绩无效（需为非负整数毫秒）');
  }
  if (!event && !eventId) throw new Error('请选择项目');

  const standards = await loadStandards(version);

  // 确定事件 key
  let eventKey = null;
  if (event && event.distance && event.stroke) {
    eventKey = buildEventKey(event.distance, event.stroke);
  } else if (eventId) {
    const ev = await findEvent(eventId);
    if (ev) {
      if (ev.eventKey) {
        eventKey = ev.eventKey;
      } else if (ev.distance && ev.stroke) {
        eventKey = buildEventKey(ev.distance, ev.stroke);
      }
    }
  }

  if (!eventKey) {
    throw new Error('无法识别的项目，请检查项目是否存在于系统');
  }

  // 性别数据
  const genderData = gender === 'female' ? standards.women : standards.men;
  if (!genderData) throw new Error('性别数据不存在');

  const poolData = genderData[poolType] || genderData['50m_pool'];
  if (!poolData) throw new Error('池型数据不存在');

  const eventStandards = poolData[eventKey];
  if (!eventStandards || Object.keys(eventStandards).length === 0) {
    return {
      eligibleGrades: [],
      highestGrade: null,
      details: [],
      standards: null,
      note: '该项目在该池型下无技术等级标准'
    };
  }

  const gradeOrder = standards.metadata.gradeOrder;
  const gradeNames = standards.metadata.gradeNames;

  const details = gradeOrder.map(grade => {
    const std = eventStandards[grade];
    if (std == null) {
      return {
        grade,
        label: gradeNames[grade] || grade,
        standardTimeMs: null,
        standardText: '—',
        eligible: false,
        differenceMs: null,
        differenceText: ''
      };
    }
    const eligible = timeMs <= std;
    const diff = timeMs - std; // 负数=比标准快
    return {
      grade,
      label: gradeNames[grade] || grade,
      standardTimeMs: std,
      standardText: formatStandardTime(std),
      eligible,
      differenceMs: diff,
      differenceText: diff <= 0 ? `快 ${formatStandardTime(-diff)}` : `差 ${formatStandardTime(diff)}`
    };
  });

  const eligibleGrades = details.filter(d => d.eligible);
  const highestGrade = eligibleGrades.length > 0 ? eligibleGrades[0] : null;

  return {
    eventKey,
    poolType,
    eligibleGrades,
    highestGrade,
    details,
    standards: eventStandards,
    note: null
  };
}

/**
 * 获取所有支持的项目编码列表（用于页面下拉框）
 * @returns {Promise<Object>} { events: [{key, distance, stroke, strokeZh}], metadata }
 */
export async function getSupportedEvents(version = DEFAULT_VERSION) {
  const standards = await loadStandards(version);
  // 从男子 50m 池的标准键提取事件列表
  const events = Object.keys(standards.men['50m_pool']).map(key => {
    const [distance, strokeKey] = key.split('_');
    const strokeZh = {
      freestyle: '自由泳',
      backstroke: '仰泳',
      breaststroke: '蛙泳',
      butterfly: '蝶泳',
      medley: '混合泳'
    }[strokeKey] || strokeKey;
    return { key, distance: parseInt(distance, 10), stroke: strokeKey, strokeText: strokeZh };
  });
  return { events, metadata: standards.metadata };
}