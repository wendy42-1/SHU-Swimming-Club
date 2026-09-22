#!/usr/bin/env python3
"""
apply_data_change.py - GitHub Actions 数据同步脚本

从 Issue body 中解析数据变更请求，修改 data/*.json 文件。

Issue body 包含一段 JSON 代码块，格式如下:
{
  "type": "data-sync",
  "action": "create | update | softDelete | delete",
  "entity": "swimmer | meet | event | result",
  "data": { ... },          # create/update 时提供
  "id": "S001",             # update/softDelete/delete 时提供
  "operator": "admin",      # 操作者标识
  "reason": "停用原因"       # softDelete/delete 时可选
}

工作流程:
1. 从 ISSUE_BODY 环境变量提取 JSON
2. 根据 entity 加载对应的 data/*.json
3. 根据 action 执行变更（含校验）
4. 写回文件
5. 后续 workflow step 验证 JSON → commit → push → 关闭 Issue
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

# ============================================
# 数据文件映射
# ============================================
DATA_FILES = {
    'swimmer': 'data/swimmers.json',
    'meet': 'data/meets.json',
    'event': 'data/events.json',
    'result': 'data/results.json',
}

# ============================================
# 工具函数
# ============================================

def now_iso():
    """返回当前 UTC 时间的 ISO 8601 字符串"""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def load_data(filepath):
    """加载 JSON 数据文件"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(filepath, data):
    """保存 JSON 数据文件（UTF-8、2 空格缩进、末尾换行）"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def generate_id(prefix, existing):
    """根据前缀和现有数据生成递增 ID（如 S006, M004, E014, R013）"""
    max_num = 0
    for item in existing:
        item_id = item.get('id', '')
        if item_id.startswith(prefix):
            try:
                num = int(item_id[len(prefix):])
                if num > max_num:
                    max_num = num
            except ValueError:
                continue
    return f"{prefix}{max_num + 1:03d}"

def find_index(data_list, item_id):
    """在列表中查找指定 ID 的索引，找不到返回 None"""
    for i, item in enumerate(data_list):
        if item.get('id') == item_id:
            return i
    return None

def extract_json_from_body(body):
    """从 Issue body 中提取数据同步 JSON"""
    # 优先尝试从 ```json 代码块中提取
    match = re.search(r'```json\s*(\{.*?\})\s*```', body, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    # 尝试从 HTML 注释中提取
    match = re.search(r'<!--\s*(\{.*?"type"\s*:\s*"data-sync".*?\})\s*-->', body, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    # 尝试直接解析整个 body
    try:
        data = json.loads(body.strip())
        if data.get('type') == 'data-sync':
            return data
    except json.JSONDecodeError:
        pass

    # 尝试查找包含 "type":"data-sync" 的 JSON 片段
    match = re.search(r'(\{[^{}]*"type"\s*:\s*"data-sync"[^{}]*\})', body, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    raise ValueError("无法从 Issue body 中解析数据同步 JSON")

# ============================================
# 运动员变更
# ============================================

def apply_swimmer_change(data_list, change):
    action = change['action']
    item_data = change.get('data', {})
    operator = change.get('operator', 'admin')
    ts = now_iso()

    if action == 'create':
        name = (item_data.get('name') or '').strip()
        if not name:
            raise ValueError('运动员姓名不能为空')
        new_id = item_data.get('id') or generate_id('S', data_list)
        if find_index(data_list, new_id) is not None:
            raise ValueError(f'运动员 ID 已存在: {new_id}')
        gender = item_data.get('gender', 'male')
        group = item_data.get('group') or ('女子组' if gender == 'female' else '男子组')
        new_swimmer = {
            'id': new_id,
            'name': name,
            'gender': gender,
            'group': group,
            'status': item_data.get('status', 'active'),
            'createdAt': ts,
            'createdBy': operator
        }
        data_list.append(new_swimmer)
        print(f"  Created swimmer: {new_id} - {name}")

    elif action == 'update':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('更新运动员需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'运动员不存在: {item_id}')
        # 不允许修改 id
        update_data = {k: v for k, v in item_data.items() if k != 'id'}
        data_list[idx].update(update_data)
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        print(f"  Updated swimmer: {item_id}")

    elif action == 'softDelete':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('停用运动员需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'运动员不存在: {item_id}')
        if data_list[idx].get('status') == 'inactive':
            raise ValueError(f'运动员 {item_id} 已处于停用状态')
        data_list[idx]['status'] = 'inactive'
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        data_list[idx]['updateReason'] = change.get('reason', '运动员停用')
        print(f"  Deactivated swimmer: {item_id}")

    else:
        raise ValueError(f'不支持的操作: {action} (运动员仅支持 create/update/softDelete)')

# ============================================
# 比赛变更
# ============================================

def apply_meet_change(data_list, results_list, change):
    action = change['action']
    item_data = change.get('data', {})
    operator = change.get('operator', 'admin')
    ts = now_iso()

    if action == 'create':
        name = (item_data.get('name') or '').strip()
        if not name:
            raise ValueError('比赛名称不能为空')
        date = item_data.get('date')
        if not date:
            raise ValueError('比赛日期不能为空')
        new_id = item_data.get('id') or generate_id('M', data_list)
        if find_index(data_list, new_id) is not None:
            raise ValueError(f'比赛 ID 已存在: {new_id}')
        new_meet = {
            'id': new_id,
            'name': name,
            'date': date,
            'location': (item_data.get('location') or '').strip(),
            'status': item_data.get('status', 'scheduled'),
            'createdAt': ts,
            'createdBy': operator
        }
        data_list.append(new_meet)
        print(f"  Created meet: {new_id} - {name}")

    elif action == 'update':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('更新比赛需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'比赛不存在: {item_id}')
        update_data = {k: v for k, v in item_data.items() if k != 'id'}
        data_list[idx].update(update_data)
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        print(f"  Updated meet: {item_id}")

    elif action == 'softDelete':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('停用比赛需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'比赛不存在: {item_id}')
        if data_list[idx].get('status') == 'inactive':
            raise ValueError(f'比赛 {item_id} 已处于停用状态')
        data_list[idx]['status'] = 'inactive'
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        data_list[idx]['updateReason'] = change.get('reason', '比赛停用')
        print(f"  Deactivated meet: {item_id}")

    elif action == 'delete':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('删除比赛需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'比赛不存在: {item_id}')
        # 检查是否有成绩
        has_results = any(r.get('meetId') == item_id for r in results_list)
        if has_results:
            raise ValueError(f'比赛 {item_id} 已有成绩记录，禁止物理删除，只能停用')
        data_list.pop(idx)
        print(f"  Deleted meet: {item_id}")

    else:
        raise ValueError(f'不支持的操作: {action}')

# ============================================
# 项目变更
# ============================================

def apply_event_change(data_list, change):
    action = change['action']
    item_data = change.get('data', {})
    operator = change.get('operator', 'admin')
    ts = now_iso()

    if action == 'create':
        name = (item_data.get('name') or '').strip()
        if not name:
            raise ValueError('项目名称不能为空')
        distance = item_data.get('distance')
        if not distance or int(distance) <= 0:
            raise ValueError('项目距离必须大于 0')
        new_id = item_data.get('id') or generate_id('E', data_list)
        if find_index(data_list, new_id) is not None:
            raise ValueError(f'项目 ID 已存在: {new_id}')
        new_event = {
            'id': new_id,
            'name': name,
            'distance': int(distance),
            'stroke': item_data.get('stroke', 'freestyle'),
            'gender': item_data.get('gender', 'male'),
            'type': item_data.get('type', 'individual'),
            'status': item_data.get('status', 'active'),
            'createdAt': ts,
            'createdBy': operator
        }
        data_list.append(new_event)
        print(f"  Created event: {new_id} - {name}")

    elif action == 'update':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('更新项目需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'项目不存在: {item_id}')
        update_data = {k: v for k, v in item_data.items() if k != 'id'}
        if 'distance' in update_data:
            update_data['distance'] = int(update_data['distance'])
        data_list[idx].update(update_data)
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        print(f"  Updated event: {item_id}")

    elif action == 'softDelete':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('停用项目需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'项目不存在: {item_id}')
        data_list[idx]['status'] = 'inactive'
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        data_list[idx]['updateReason'] = change.get('reason', '项目停用')
        print(f"  Deactivated event: {item_id}")

    else:
        raise ValueError(f'不支持的操作: {action}')

# ============================================
# 成绩变更
# ============================================

def apply_result_change(data_list, change):
    action = change['action']
    item_data = change.get('data', {})
    operator = change.get('operator', 'admin')
    ts = now_iso()

    if action == 'create':
        swimmer_id = item_data.get('swimmerId')
        if not swimmer_id:
            raise ValueError('请选择运动员')
        event_id = item_data.get('eventId')
        if not event_id:
            raise ValueError('请选择项目')
        meet_id = item_data.get('meetId')
        if not meet_id:
            raise ValueError('请选择比赛')
        time_ms = item_data.get('timeMs')
        if time_ms is None or int(time_ms) < 0:
            raise ValueError('成绩数据无效')
        new_id = item_data.get('id') or generate_id('R', data_list)
        if find_index(data_list, new_id) is not None:
            raise ValueError(f'成绩 ID 已存在: {new_id}')
        new_result = {
            'id': new_id,
            'swimmerId': swimmer_id,
            'eventId': event_id,
            'meetId': meet_id,
            'timeMs': int(time_ms),
            'status': item_data.get('status', 'official'),
            'createdAt': ts,
            'createdBy': operator,
            'updatedAt': None,
            'updatedBy': None,
            'updateReason': None
        }
        data_list.append(new_result)
        print(f"  Created result: {new_id}")

    elif action == 'update':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('更新成绩需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'成绩记录不存在: {item_id}')
        old_values = {}
        if 'timeMs' in item_data:
            old_values['timeMs'] = data_list[idx].get('timeMs')
            item_data['timeMs'] = int(item_data['timeMs'])
        if 'status' in item_data:
            old_values['status'] = data_list[idx].get('status')
        update_data = {k: v for k, v in item_data.items() if k != 'id'}
        data_list[idx].update(update_data)
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        data_list[idx]['updateReason'] = item_data.get('updateReason', '')
        data_list[idx]['previousValues'] = old_values
        print(f"  Updated result: {item_id}")

    elif action == 'softDelete':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('标记 DQ 需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'成绩记录不存在: {item_id}')
        old_values = {'status': data_list[idx].get('status')}
        data_list[idx]['status'] = 'DQ'
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        data_list[idx]['updateReason'] = change.get('reason', '成绩标记为 DQ')
        data_list[idx]['previousValues'] = old_values
        print(f"  DQ result: {item_id}")

    elif action == 'delete':
        item_id = change.get('id')
        if not item_id:
            raise ValueError('删除成绩需要提供 ID')
        idx = find_index(data_list, item_id)
        if idx is None:
            raise ValueError(f'成绩记录不存在: {item_id}')
        old_values = {'status': data_list[idx].get('status')}
        data_list[idx]['status'] = 'deleted'
        data_list[idx]['updatedAt'] = ts
        data_list[idx]['updatedBy'] = operator
        data_list[idx]['updateReason'] = change.get('reason', '成绩删除')
        data_list[idx]['previousValues'] = old_values
        print(f"  Deleted result: {item_id}")

    else:
        raise ValueError(f'不支持的操作: {action}')

# ============================================
# 主函数
# ============================================

def main():
    body = os.environ.get('ISSUE_BODY', '')
    issue_number = os.environ.get('ISSUE_NUMBER', '')

    print(f"=== Data Sync: Issue #{issue_number} ===")
    print(f"  Body length: {len(body)} chars")

    if not body:
        print("ERROR: ISSUE_BODY environment variable is empty")
        sys.exit(1)

    # 提取 JSON
    try:
        change = extract_json_from_body(body)
    except (ValueError, json.JSONDecodeError) as e:
        print(f"ERROR: Failed to parse JSON: {e}")
        sys.exit(1)

    entity = change.get('entity')
    action = change.get('action')

    print(f"  Entity: {entity}")
    print(f"  Action: {action}")
    print(f"  Operator: {change.get('operator', 'admin')}")

    if entity not in DATA_FILES:
        print(f"ERROR: Unknown entity type: {entity}")
        print(f"  Valid types: {', '.join(DATA_FILES.keys())}")
        sys.exit(1)

    valid_actions = ('create', 'update', 'softDelete', 'delete')
    if action not in valid_actions:
        print(f"ERROR: Unknown action: {action}")
        print(f"  Valid actions: {', '.join(valid_actions)}")
        sys.exit(1)

    # 加载数据
    filepath = DATA_FILES[entity]
    data_list = load_data(filepath)
    print(f"  Loaded {len(data_list)} records from {filepath}")

    # 应用变更
    try:
        if entity == 'swimmer':
            apply_swimmer_change(data_list, change)
        elif entity == 'meet':
            results = load_data(DATA_FILES['result'])
            apply_meet_change(data_list, results, change)
        elif entity == 'event':
            apply_event_change(data_list, change)
        elif entity == 'result':
            apply_result_change(data_list, change)
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # 保存数据
    save_data(filepath, data_list)
    print(f"  Saved {len(data_list)} records to {filepath}")
    print(f"=== Data sync complete ===")

if __name__ == '__main__':
    main()
