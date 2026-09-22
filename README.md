---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '20ef2a8a-b1ff-4cac-9bf0-7a629b67ddd8'
  PropagateID: '20ef2a8a-b1ff-4cac-9bf0-7a629b67ddd8'
  ReservedCode1: '42dc7154-cf46-4aae-8e10-a32f0e57f129'
  ReservedCode2: '42dc7154-cf46-4aae-8e10-a32f0e57f129'
---

# 鼠智赛事通 - 上海大学游泳队成绩管理系统

> 基于 GitHub Pages + JSON + 原生 JavaScript 的轻量级游泳成绩管理平台

## 项目简介

本系统是一个面向大学游泳队内部使用的成绩管理工具，采用纯前端技术栈实现多人共享数据查看。不使用任何第三方数据库或后端服务器，仅依靠 **GitHub + HTML + JSON + GitHub Pages** 实现轻量级共享数据方案。

## 功能

### 查看功能（所有角色可用）
- 成绩查询（按比赛/运动员/项目/性别筛选+排序）
- 运动员信息查看
- 比赛信息查看
- 游泳项目配置查看
- 动态排名计算（支持并列处理）

### 管理功能（管理员可用）
- **成绩录入**：支持 58.32 与 1:02.35 两种时间格式，动态读取下拉选项
- **成绩记录管理**：筛选+搜索+编辑+软删除（标记 DQ）
- **运动员管理**：新增/编辑/搜索/状态切换（SUPER_ADMIN）
- **比赛管理**：新增/编辑（SUPER_ADMIN）
- **项目管理**：新增/编辑，保持配置化（SUPER_ADMIN）

### 其他特性
- 三角色 UI 权限区分（SUPER_ADMIN / SCORE_ADMIN / VIEWER）
- 导航栏角色切换器
- Mobile First 响应式设计（360px / 390px / 430px / 768px / 1024px / 1280px）
- 成绩统一毫秒整数存储，显示时格式化

## 项目结构

```
SHU-Swimming-Club/
├── index.html                  # 首页入口
├── pages/
│   ├── results.html            # 成绩查询
│   ├── swimmers.html           # 运动员列表
│   ├── meets.html              # 比赛列表
│   ├── events.html             # 项目列表
│   ├── ranking.html            # 排名
│   ├── admin.html              # 管理中心（功能卡片导航）
│   ├── admin-swimmers.html     # 运动员管理（新增/编辑/搜索）
│   ├── admin-meets.html        # 比赛管理（新增/编辑）
│   ├── admin-events.html       # 项目管理（新增/编辑）
│   ├── admin-results-add.html  # 成绩录入
│   └── admin-results-edit.html # 成绩记录（查看/修改/标记DQ）
├── data/                       # JSON 原始数据
│   ├── swimmers.json
│   ├── events.json
│   ├── meets.json
│   ├── results.json
│   └── users.json
├── src/
│   ├── services/
│   │   ├── dataService.js      # 数据读取层（含路径修复+localStorage集成）
│   │   ├── writeService.js     # 数据写入层（localStorage）
│   │   ├── swimmerService.js
│   │   ├── eventService.js
│   │   ├── meetService.js
│   │   ├── resultService.js
│   │   └── authService.js
│   ├── utils/
│   │   └── time.js             # 时间解析/格式化
│   └── algorithms/
│       ├── ranking.js          # 排名算法
│       └── relay.js            # 接力算法（预留）
├── assets/
│   ├── css/
│   │   └── style.css           # 全局样式（含管理界面样式）
│   └── js/
│       └── app.js              # 全局应用逻辑
├── .github/workflows/
│   ├── deploy.yml              # GitHub Pages 部署
│   └── validate-data.yml       # 数据验证
├── .gitignore
└── README.md
```

## 数据结构

### swimmers.json
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 运动员ID（S001, S002...） |
| name | string | 姓名 |
| gender | string | 性别（male/female） |
| group | string | 分组（男子组/女子组） |
| status | string | 状态（active/inactive） |

### events.json
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 项目ID（E001...） |
| name | string | 项目名称 |
| distance | number | 距离（米） |
| stroke | string | 泳姿（freestyle/breaststroke/backstroke/butterfly/medley） |
| gender | string | 性别 |
| type | string | 类型（individual/relay） |
| status | string | 状态 |

### meets.json
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 比赛ID（M001...） |
| name | string | 比赛名称 |
| date | string | 日期（YYYY-MM-DD） |
| location | string | 地点 |
| status | string | 状态 |

### results.json
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 成绩ID（R001...） |
| swimmerId | string | 运动员ID |
| eventId | string | 项目ID |
| meetId | string | 比赛ID |
| timeMs | number | 成绩（毫秒整数） |
| status | string | 成绩状态（official/unofficial/DQ） |
| createdAt | string | 创建时间（ISO 8601） |
| createdBy | string | 创建者 |
| updatedAt | string | 修改时间（修改时写入） |
| updatedBy | string | 修改者（修改时写入） |
| updateReason | string | 修改原因（修改时写入） |

## 数据读写架构

### 读取层（dataService.js）
- 优先从 localStorage 读取覆盖数据
- 回退到 fetch JSON 文件
- 提供缓存机制

### 写入层（writeService.js）
- 所有写入操作保存到浏览器 localStorage
- 自动清除读取缓存，确保数据一致性
- 支持：createSwimmer / updateSwimmer / createMeet / updateMeet / createEvent / updateEvent / createResult / updateResult / softDeleteResult

### localStorage 限制（重要）

> **localStorage 数据仅在当前浏览器/设备上有效。**
>
> - 在设备 A 上新增的运动员/比赛/成绩，在设备 B 上不可见
> - 清除浏览器数据会导致 localStorage 数据丢失
> - 不同浏览器（Chrome / Firefox / Edge）之间的 localStorage 不共享
> - 如需永久保存数据并让所有用户可见，需要将 localStorage 中的数据导出并提交到 GitHub 仓库的 JSON 文件

## 用户角色

| 角色 | 查看数据 | 录入成绩 | 修改成绩 | 管理运动员 | 管理比赛/项目 | 系统配置 |
|------|---------|---------|---------|-----------|-------------|---------|
| VIEWER | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| SCORE_ADMIN | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> **注意：当前前端角色控制不是生产级安全认证。** 前端角色控制仅用于 UI 层面的显示/隐藏，不构成真正的安全权限控制。

## 本地运行方式

```bash
# 方式一：使用 Python 内置 HTTP 服务器
python -m http.server 8000

# 方式二：使用 npx serve
npx serve

# 然后在浏览器打开 http://localhost:8000
```

## GitHub Pages 部署方式

1. 推送代码到 `main` 分支
2. GitHub Actions 自动部署到 GitHub Pages
3. 访问 `https://wendy42-1.github.io/SHU-Swimming-Club/`

## 安全限制

> **重要：当前版本采用 GitHub + JSON + GitHub Pages 的轻量级共享数据方案，不是传统数据库架构。**
>
> **当前前端角色控制不是生产级安全认证。** 前端角色控制仅用于 UI 层面的显示/隐藏，不构成真正的安全权限控制。如果需要真正安全的远程写入和身份认证，必须增加受保护的后端服务或 GitHub OAuth / GitHub App 等机制。

绝对禁止在以下位置存储 Token / 密码 / API Key：
- HTML / CSS / JavaScript
- JSON 数据文件
- README / 文档
- Git commit
- GitHub Pages 部署文件

## 当前版本限制

1. **localStorage 不跨设备共享**：管理员新增/修改的数据仅保存在当前浏览器，其他设备不可见
2. **角色控制仅在前端 UI 层面**，不构成安全认证
3. **无实时数据同步**：需手动刷新获取最新数据
4. **无用户注册/登录系统**：角色通过导航栏下拉菜单切换
5. **接力算法仅预留接口**，未实现
6. **无数据导出/导入功能**：localStorage 数据无法自动同步到 GitHub 仓库

## 后续开发计划

1. **GitHub API 集成**：通过 GitHub Actions 实现受保护的数据写入（不暴露 Token）
2. **用户认证系统**：GitHub OAuth / GitHub App
3. **接力优化算法**
4. **复杂数据统计分析与可视化**
5. **数据导出/导入功能**：将 localStorage 数据导出为 JSON 并提交到仓库