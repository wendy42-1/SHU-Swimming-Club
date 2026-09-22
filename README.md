---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '2d49e9bb-e0e6-4ed3-9daf-d270c59ea453'
  PropagateID: '2d49e9bb-e0e6-4ed3-9daf-d270c59ea453'
  ReservedCode1: 'e7bdde50-511c-4f32-90a4-1043a72e3c7a'
  ReservedCode2: 'e7bdde50-511c-4f32-90a4-1043a72e3c7a'
---

# SHU Swimming Club - 游泳成绩管理系统

> 上海大学游泳队成绩管理系统 MVP — 基于 GitHub Pages + JSON + 原生 JavaScript

## 项目简介

本系统是一个面向大学游泳队内部使用的成绩管理工具，采用纯前端技术栈实现多人共享数据查看。不使用任何第三方数据库或后端服务器，仅依靠 **GitHub + HTML + JSON + GitHub Pages** 实现轻量级共享数据方案。

## 功能

- 运动员信息管理
- 比赛信息管理
- 游泳项目配置化
- 成绩录入与查看
- 基础排名计算
- 角色权限区分（SUPER_ADMIN / SCORE_ADMIN / VIEWER）
- 响应式移动端界面（手机 / iPad / 电脑）

## 项目结构

```
SHU-Swimming-Club/
├── index.html              # 首页入口
├── pages/                  # 各功能页面
│   ├── results.html        # 成绩查询
│   ├── swimmers.html       # 运动员列表
│   ├── meets.html          # 比赛列表
│   ├── events.html         # 项目列表
│   ├── ranking.html        # 排名
│   └── admin.html          # 管理员页面
├── data/                   # JSON 数据
│   ├── swimmers.json
│   ├── events.json
│   ├── meets.json
│   ├── results.json
│   └── users.json
├── src/
│   ├── services/           # 数据访问层
│   │   ├── dataService.js
│   │   ├── swimmerService.js
│   │   ├── eventService.js
│   │   ├── meetService.js
│   │   ├── resultService.js
│   │   └── authService.js
│   ├── utils/              # 工具函数
│   │   └── time.js         # 时间解析/格式化
│   ├── algorithms/         # 算法层
│   │   ├── ranking.js      # 排名算法
│   │   └── relay.js        # 接力算法（预留接口）
│   └── components/         # 可复用组件
├── assets/
│   ├── css/
│   │   └── style.css       # 全局样式
│   └── js/
│       └── app.js          # 全局应用逻辑
├── .github/workflows/      # GitHub Actions
│   ├── deploy.yml          # GitHub Pages 部署
│   └── validate-data.yml   # 数据验证
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

## 用户角色

| 角色 | 查看数据 | 录入成绩 | 修改成绩 | 管理运动员 | 系统配置 |
|------|---------|---------|---------|-----------|---------|
| VIEWER | ✅ | ❌ | ❌ | ❌ | ❌ |
| SCORE_ADMIN | ✅ | ✅ | ✅ | ❌ | ❌ |
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |

## 数据更新机制

当前版本的数据更新通过以下流程：
1. 管理员通过管理员界面录入成绩（前端演示级）
2. 数据以 JSON 文件形式存储在 GitHub 仓库中
3. 所有用户通过 GitHub Pages 读取同一份 JSON 数据
4. 后续可通过 GitHub Actions 或后端服务实现真正的受保护写入

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

1. 管理员写入操作是前端演示级，刷新后不持久化（需后续集成 GitHub API 或后端）
2. 角色控制仅在前端 UI 层面，不构成安全认证
3. 无实时数据同步（需手动刷新获取最新数据）
4. 无用户注册/登录系统
5. 接力算法仅预留接口，未实现

## 后续开发计划

1. **Phase 2**: 集成 GitHub API 实现真正的受保护写入
2. **Phase 2**: 用户认证系统（GitHub OAuth / GitHub App）
3. **Phase 2**: 接力优化算法
4. **Phase 3**: 复杂统计分析与可视化
5. **Phase 3**: 比赛管理系统