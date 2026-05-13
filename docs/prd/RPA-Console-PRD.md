# RPA Console 产品需求文档（PRD）

**版本：** v1.4  
**日期：** 2026-05-08  
**作者：** 产品设计团队  
**状态：** 草稿

---

## 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-05-08 | 初稿 |
| v1.1 | 2026-05-08 | 基于影刀开放 API 文档修正数据模型中的字段命名；补充 Job 停止/重试/云日志/云录屏/回调/优先级/机器人分组等功能 |
| v1.2 | 2026-05-08 | 新增标签管理模块；新增功能建议章节；完善调度配置参数 |
| v1.3 | 2026-05-08 | 修正 RPA 应用存储字段命名（`xybot_robot_uuid` → `app_uuid`）；移除第 8 章功能扩展建议 |
| v1.4 | 2026-05-09 | 调度任务向导：合并「选择应用」与「配置应用参数」为同一步，新增 file 类型参数文件上传支持；账号/应用/机器人列表页增加「手动同步」按钮 |

---

## 目录

1. [产品概述](#1-产品概述)
2. [目标用户与角色定义](#2-目标用户与角色定义)
3. [组织结构模型](#3-组织结构模型)
4. [功能模块详细需求](#4-功能模块详细需求)
   - 4.1 [登录模块](#41-登录模块)
   - 4.2 [组织结构管理](#42-组织结构管理)
   - 4.3 [账号管理](#43-账号管理)
   - 4.4 [RPA 应用管理](#44-rpa-应用管理)
   - 4.5 [机器人管理](#45-机器人管理)
   - 4.6 [标签管理](#46-标签管理)
   - 4.7 [调度任务配置](#47-调度任务配置)
   - 4.8 [调度执行与监控](#48-调度执行与监控)
   - 4.9 [机器人排班看板](#49-机器人排班看板)
   - 4.10 [调度运行数据](#410-调度运行数据)
5. [数据模型设计](#5-数据模型设计)
6. [权限矩阵](#6-权限矩阵)
7. [接口对接说明（影刀 RPA 开放 API）](#7-接口对接说明影刀-rpa-开放-api)
8. [非功能性需求](#8-非功能性需求)
9. [名词说明](#9-名词说明)

---

## 1. 产品概述

### 1.1 背景

影刀 RPA 现有控制台能满足中小客户的日常需求，但对于**中大型企业客户**（制造业、政府、金融及大型集团型企业），其组织结构复杂（集团 → 子公司 → 部门），对 RPA 资源的精细化管理（按组织归属隔离数据、分层授权）有更高诉求，现有控制台无法满足。

**RPA Console** 是基于影刀 RPA 开放 API 构建的一套**面向中大型企业的定制化管理平台**，每套系统在企业内部独立部署，通过多租户+部门层级对组织、账号、应用、机器人及调度任务进行精细化管理。

### 1.2 产品目标

| 目标 | 说明 |
|------|------|
| 组织隔离 | 支持子公司（租户）和部门两级隔离，数据不跨边界可见 |
| 资源归属 | 账号、应用、机器人均可归属到租户或部门 |
| 分级授权 | 超级管理员 → 租户管理员 → 员工，权限逐层缩小 |
| 调度闭环 | 任务配置、触发执行、停止/重试、结果追踪在同一平台完成 |
| 可审计 | 所有调度执行记录留存，支持追溯；云日志可下载 |
| 标签化管理 | 账号、应用、机器人、调度任务均支持多标签，便于分类检索 |

### 1.3 部署模式

- 每家企业**独立部署一套** RPA Console 实例
- 集团层级在系统内**不体现**，仅体现子公司（租户）和部门
- 数据同步来源：影刀 RPA 开放 API（账号、应用、机器人的原始数据）

---

## 2. 目标用户与角色定义

### 2.1 目标客户

- 制造业集团客户
- 政府/事业单位
- 金融机构（银行、保险、证券）
- 其他大型集团型企业

### 2.2 角色定义

系统共定义 **3 类角色**，每类角色的权限严格隔离：

#### 角色 A：超级管理员（Super Admin）

- **归属**：不归属任何租户或部门，具有全局视角
- **核心能力**：
  - 管理租户（新建、编辑、停用）
  - 将账号关联到任意租户
  - 将 RPA 应用关联到任意租户
  - 查看全部租户、全部部门的数据（默认视角为全局）
  - 可切换到某个具体租户视角查看该租户数据
  - 查看全部调度执行记录

#### 角色 B：租户管理员（Tenant Admin）

- **归属**：归属于某一个租户，不归属某个具体部门
- **核心能力**：
  - 在本租户下新建/编辑/删除部门
  - 将账号关联到本租户下的具体部门
  - 将 RPA 应用关联到本租户下的具体部门
  - 查看本租户的全部数据（默认视角为租户全局）
  - 可切换到本租户某个具体部门视角查看数据
  - 管理本租户的标签、调度任务、查看本租户的调度执行记录

#### 角色 C：员工（Member）

- **归属**：归属于某一个租户下的某个部门（或直接归属租户）
  - **挂在部门下**：仅能看到该部门的数据
  - **挂在租户下（无部门）**：能看到该租户的全部数据
- **核心能力**：
  - 查看自己有权限范围内的账号、应用、机器人
  - 配置调度任务（限本部门/租户范围内的资源）
  - 触发和查看本范围内的调度执行记录

---

## 3. 组织结构模型

### 3.1 层级说明

```
企业（集团）—— 系统外部，不在系统中体现
  └── 子公司 A（在系统中对应 租户 Tenant A）
        ├── 部门 A1（Department A1）
        ├── 部门 A2（Department A2）
        └── 部门 A3（Department A3）
  └── 子公司 B（在系统中对应 租户 Tenant B）
        ├── 部门 B1
        └── 部门 B2
```

- **租户（Tenant）= 子公司**：系统顶层隔离单元，由超级管理员创建
- **部门（Department）**：隶属于某个租户，由租户管理员创建
- **系统初始化时默认有一个默认租户**，可用于未分配子公司的情况

### 3.2 账号归属规则

| 归属 | 说明 | 数据可见范围 |
|------|------|------|
| 归属于某租户（无具体部门） | 该账号是租户层级成员 | 该租户全部数据 |
| 归属于某租户下的某部门 | 该账号是部门层级成员 | 仅该部门数据 |

**约束**：
- 一个账号只能归属于**一个租户**和（可选）**该租户下的一个部门**
- 账号不可直接挂在集团层级（系统内不存在集团层级）

---

## 4. 功能模块详细需求

---

### 4.1 登录模块

#### 4.1.1 模块说明

系统支持两种登录方式：
1. **OAuth 2.0 企业免登（正式方式）**：企业内部 SSO 系统通过 OAuth 2.0 协议接入
2. **账号密码登录（测试/初期方式）**：用于开发调试，账号来自影刀 RPA 同步，密码为演示口令（示例：`demo-password`）

#### 4.1.2 功能需求

**登录页面**

| 元素 | 说明 |
|------|------|
| 产品 Logo | RPA Console 品牌标识 |
| 登录方式切换 | 「企业 SSO 登录」/「账号密码登录」两个 Tab |
| 账号密码输入框 | 用户名（邮箱或工号）+ 密码 |
| 登录按钮 | 点击触发认证 |
| 错误提示 | 账号不存在 / 密码错误 / 账号被停用 |

**OAuth 2.0 免登流程**

```
用户访问系统 → 跳转企业 SSO → 用户授权 → 回调携带 code
→ 后端用 code 换取 access_token → 获取用户信息
→ 匹配系统内账号 → 登录成功，写入 Session/JWT
```

**账号密码登录流程**

```
输入账号密码 → 后端查询影刀 RPA 同步的账号表
→ 校验账号存在且密码为 "demo-password" → 登录成功
→ 写入 Session/JWT（含角色、租户/部门归属信息）
```

**登录后跳转规则**

| 角色 | 默认落地页 |
|------|------|
| 超级管理员 | 全局数据概览页 / 组织管理页 |
| 租户管理员 | 本租户数据概览页 |
| 员工 | 本部门（或租户）数据概览页 |

---

### 4.2 组织结构管理

#### 4.2.1 功能概述

提供租户（子公司）和部门的全生命周期管理，仅超级管理员和租户管理员有操作权限。

---

#### 4.2.2 租户管理（超级管理员专属）

**租户列表页**

| 字段 | 说明 |
|------|------|
| 租户名称 | 子公司名称 |
| 租户 ID | 系统唯一标识 |
| 租户管理员 | 展示已绑定的租户管理员账号 |
| 部门数量 | 当前租户下部门数 |
| 账号数量 | 当前租户下账号总数 |
| 状态 | 启用 / 停用 |
| 创建时间 | 创建日期 |
| 操作 | 编辑、停用/启用、查看详情 |

**新建租户**

| 字段 | 是否必填 | 校验规则 |
|------|------|------|
| 租户名称 | 必填 | 不超过 50 字，同一系统内唯一 |
| 租户描述 | 选填 | 不超过 200 字 |
| 租户管理员账号 | 选填 | 从已同步账号中选择，可设置多个 |

**交互细节**：
- 新建时系统自动生成租户 ID（不可修改）
- 停用租户后，该租户下所有账号无法登录，所有调度任务暂停
- 不可删除租户（软删除，仅停用），防止历史数据丢失

---

#### 4.2.3 部门管理（租户管理员专属，在本租户内操作）

**部门列表页**（展示当前租户下所有部门）

| 字段 | 说明 |
|------|------|
| 部门名称 | — |
| 部门 ID | 系统唯一标识 |
| 账号数量 | 当前部门下账号总数 |
| 创建时间 | — |
| 操作 | 编辑、删除（部门为空时才可删除） |

**新建部门**

| 字段 | 是否必填 | 校验规则 |
|------|------|------|
| 部门名称 | 必填 | 不超过 50 字，同一租户内唯一 |
| 部门描述 | 选填 | 不超过 200 字 |

**约束**：
- 部门下存在账号时不可删除，需先将账号移出
- 超级管理员可查看所有租户的部门，但不可在此操作部门（仅查看）

---

### 4.3 账号管理

#### 4.3.1 账号同步

账号数据通过 **`GET /oapi/rpa/user/v1/list`** 定时同步（或手动触发同步）。

同步字段映射：

| 影刀字段 | Console 字段 | 说明 |
|------|------|------|
| `userUuid` | `xybot_user_uuid` | 影刀用户主键 |
| `loginAccount` | `login_account` | 登录账号 |
| `name` | `name` | 用户名 |
| `phone` | `phone` | 手机号 |
| `role` | `xybot_role` | 影刀侧角色（e_admin/e_user） |
| `accountType` | `xybot_account_type` | 账号类型（basic/senior） |
| `expiredTime` | `expired_at` | 账号过期时间 |

同步规则：
- 新增账号：同步入库，`console_role` 默认为 `MEMBER`，未关联任何租户/部门
- 已有账号：更新基本信息，不覆盖已设置的租户/部门归属
- 影刀侧已删除账号：标记为「已失效」，保留历史数据

#### 4.3.2 账号列表（超级管理员视角）

列表页右上角提供「手动同步」按钮，点击后立即触发一次全量同步（调用 `GET /oapi/rpa/user/v1/list`），完成后刷新列表并提示「同步成功，共同步 N 条账号」；同步中按钮 loading，防止重复触发。列表页展示「最后同步时间」。

展示系统内全部同步账号：

| 字段 | 说明 |
|------|------|
| 账号名称 | — |
| 登录账号（影刀） | `loginAccount` |
| 手机号 | — |
| 归属租户 | 已关联的租户，未关联则显示「—」 |
| 归属部门 | 已关联的部门，未关联则显示「—」 |
| Console 角色 | 超级管理员 / 租户管理员 / 员工 |
| 标签 | 当前账号挂载的标签列表 |
| 状态 | 正常 / 已失效 |
| 操作 | 关联租户、设置角色、编辑标签、查看详情 |

#### 4.3.3 账号关联到租户（超级管理员）

1. 选择目标租户
2. 可选：同时指定该账号在该租户下的角色（租户管理员或员工）
3. 若设为员工且需关联到部门，则由租户管理员操作

#### 4.3.4 账号关联到部门（租户管理员）

**操作入口**：租户管理员在「本租户 - 账号管理」页面操作

1. 查看本租户下所有已关联该租户的账号
2. 选择账号 → 点击「分配部门」
3. 从本租户的部门列表中选择目标部门
4. 确认后，该账号的归属部门更新

**约束**：
- 一个账号只能归属于一个部门（可修改）
- 租户管理员只能操作本租户内的账号

---

### 4.4 RPA 应用管理

#### 4.4.1 应用同步

通过 **`GET /oapi/robot/v2/query`** 同步应用列表，通过 **`GET /oapi/robot/v2/queryRobotParam`** 同步参数定义。

同步字段映射：

| 影刀字段 | Console 字段 | 说明 |
|------|------|------|
| `robotUuid` | `app_uuid` | Console 中统称为 RPA 应用 UUID；影刀将应用命名为 robot，其 `robotUuid` 即我们的 `app_uuid`，dispatch 触发时传此值 |
| `robotName` | `name` | 应用名称 |
| `releaseRobotVersionName` | `version` | 当前发版版本名称 |
| `releaseRobotVersionUuid` | `xybot_version_uuid` | 发版版本 UUID |
| `description` | `description` | 应用简介 |
| `icon` | `icon` | 应用图标 URL |
| `ownerUuid` | `owner_uuid` | 所有者 UUID |
| `ownerName` | `owner_name` | 所有者名称 |
| `releaseTime` | `release_at` | 发版时间 |
| `inputParams[]` | `input_params` | 入参定义（JSON，含 name/type/value/description） |
| `outputParams[]` | `output_params` | 出参定义（JSON） |
| `supportParam` | `support_param` | 是否支持参数 |

#### 4.4.2 应用列表

列表页右上角提供「手动同步」按钮，点击后立即触发全量同步（调用 `GET /oapi/robot/v2/query` + `GET /oapi/robot/v2/queryRobotParam`），完成后刷新列表并提示同步结果；同步中按钮 loading。列表页展示「最后同步时间」。

| 字段 | 说明 |
|------|------|
| 应用名称 | — |
| 应用版本 | 当前发版版本 |
| 是否支持参数 | 是/否 |
| 所有者 | 影刀侧 owner |
| 归属租户 | 已关联的租户 |
| 归属部门 | 已关联的部门 |
| 标签 | 当前应用挂载的标签列表 |
| 状态 | 正常 / 已失效 |
| 操作 | 关联租户/部门、编辑标签、查看参数详情 |

#### 4.4.3 应用关联到租户（超级管理员）

同一应用可关联到多个租户（多对多关系）。

#### 4.4.4 应用关联到部门（租户管理员）

在本租户已关联应用中，选择应用分配到具体部门。

---

### 4.5 机器人管理

> **重要说明**：影刀中的机器人是 `robotClient`（实体执行客户端，对应一台安装了 RPA 客户端的机器），标识符为 `robotClientUuid`，通过 **`POST /oapi/dispatch/v2/client/list`** 同步。它与 RPA 应用（`robotUuid`）是完全不同的概念。

#### 4.5.1 机器人同步

通过 **`POST /oapi/dispatch/v2/client/list`** 同步机器人列表，通过 **`POST /oapi/dispatch/v2/client/getLastHeartTime`** 批量更新心跳时间。

同步字段映射：

| 影刀字段 | Console 字段 | 说明 |
|------|------|------|
| `robotClientUuid` | `xybot_robot_client_uuid` | 机器人主键 |
| `robotClientName` | `name` | 机器人名称 |
| `status` | `status` | 在线/离线/忙碌 |
| `description` | `description` | 机器人描述 |
| `windowsUserName` | `windows_user_name` | Windows 系统账号（用于关联 Account） |
| `clientIp` | `client_ip` | 客户端 IP |
| `machineName` | `machine_name` | 主机名 |
| `clientVersion` | `client_version` | 客户端版本 |
| `createTime` | `created_at_xybot` | 影刀侧创建时间 |

#### 4.5.2 机器人的租户/部门归属

- 机器人通过 `windowsUserName` 与 Account 关联
- 机器人的租户/部门归属继承自对应 Account
- Account 变更租户/部门时，对应机器人归属自动跟随变更

#### 4.5.3 机器人分组

影刀侧支持机器人分组（`robotClientGroupUuid`），通过 **`POST /oapi/dispatch/v2/client/group/list`** 同步。

机器人分组信息在调度任务配置中使用（可以指定分组而非单台机器人执行任务）。

#### 4.5.4 机器人列表

列表页右上角提供「手动同步」按钮，点击后立即触发全量同步（调用 `POST /oapi/dispatch/v2/client/list` + `POST /oapi/dispatch/v2/client/getLastHeartTime`），完成后刷新列表并提示同步结果；同步中按钮 loading。列表页展示「最后同步时间」。

| 字段 | 说明 |
|------|------|
| 机器人名称 | — |
| 机器人 UUID（影刀） | `robotClientUuid` |
| 关联账号 | 通过 `windowsUserName` 关联的系统账号 |
| 所属分组 | 机器人分组名称 |
| 归属租户 | 继承自账号 |
| 归属部门 | 继承自账号 |
| 标签 | 当前机器人挂载的标签列表 |
| 当前状态 | 在线 / 离线 / 忙碌 |
| 当前运行应用 | 忙碌时展示正在运行的应用名称（来自 `client/query` 的 `robotUuid`） |
| 最后心跳时间 | — |

---

### 4.6 标签管理

#### 4.6.1 功能说明

每个租户可以维护自己的标签体系，用于对账号、RPA 应用、机器人、调度任务进行分类标注，便于检索和批量操作。

- 标签归属于某个租户，租户间标签完全隔离
- 超级管理员可查看所有租户的标签，但不跨租户操作
- 标签在各资源列表中作为筛选条件

#### 4.6.2 标签列表页

**操作入口**：租户管理员在「本租户 - 标签管理」页面操作

| 字段 | 说明 |
|------|------|
| 标签名称 | — |
| 标签颜色 | 色块展示 |
| 已关联资源数 | 账号数 / 应用数 / 机器人数 / 调度任务数 |
| 创建人 | — |
| 创建时间 | — |
| 操作 | 编辑、删除（删除时自动解除所有关联） |

#### 4.6.3 新建/编辑标签

| 字段 | 是否必填 | 校验规则 |
|------|------|------|
| 标签名称 | 必填 | 不超过 20 字，同一租户内唯一 |
| 标签颜色 | 选填 | 从预设颜色面板中选择，默认灰色 |
| 标签描述 | 选填 | 不超过 100 字 |

#### 4.6.4 资源标签操作

各资源列表（账号、应用、机器人、调度任务）均支持：

1. **单个打标**：点击资源行「编辑标签」，在弹窗中多选当前租户的标签列表
2. **批量打标**：勾选多条资源 → 点击「批量打标签」，追加或替换标签
3. **标签筛选**：列表页支持按标签多选筛选

**约束**：
- 员工可给有权限的资源打标签，打标的标签来源于本租户/本部门可见的标签列表
- 一个资源可关联 0~N 个标签，无上限
- 删除标签时，该标签在所有资源上的关联自动解除，不影响资源本身

---

### 4.7 调度任务配置

#### 4.7.1 调度任务列表

| 字段 | 说明 |
|------|------|
| 任务名称 | 用户自定义 |
| 绑定应用 | RPA 应用名称 |
| 绑定机器人/分组 | 机器人名称或分组名称 |
| 调度方式 | 定时调度 / 立即触发 |
| 定时规则 | 若为定时调度，展示可读描述 |
| 优先级 | 低 / 中 / 高 |
| 最近执行时间 | — |
| 最近执行状态 | 成功 / 失败 / 运行中 / 未执行 |
| 标签 | 当前任务挂载的标签 |
| 状态 | 启用 / 停用 |
| 创建人 | — |
| 操作 | 编辑、立即触发、查看执行记录、停用/启用、删除 |

#### 4.7.2 新建/编辑调度任务（分步向导）

**Step 1：基本信息**

| 字段 | 是否必填 | 说明 |
|------|------|------|
| 任务名称 | 必填 | 不超过 50 字 |
| 任务描述 | 选填 | — |
| 标签 | 选填 | 从本租户标签列表多选 |

**Step 2：选择 RPA 应用 + 配置应用参数**

选择应用后立即在同一步内展示参数配置表单，无需跳转到下一步。

*应用选择：*
- 下拉搜索，仅展示当前用户有权限的应用
- 选择后展示：应用版本、是否支持参数（`supportParam`）
- 权限范围与账号归属一致（部门/租户/全局）

*参数配置（选完应用后立即渲染，`supportParam = true` 时展示）：*

根据应用的 `inputParams` 动态渲染表单，每个参数包含：

| 字段 | 说明 |
|------|------|
| 参数名 | `name`，只读展示 |
| 参数类型 | `type`：str / float / bool / file 等 |
| 参数值 | 可编辑；`direction=Out` 的出参不需要填写 |
| 是否必填 | 标注必填项，保存时校验 |
| 参数描述 | `description`，只读展示 |

**文件类型参数（`type = file`）：**
- 展示文件上传控件，支持本地文件选择
- 上传时调用 **`POST /oapi/dispatch/v2/file/upload`**，获取 `fileKey`
- 以 `fileKey` 作为该参数的实际传值（提交调度任务时传给影刀）
- 展示已上传文件名，支持重新上传覆盖

*参数保存：*
- 参数值随任务一起保存，下次打开编辑时回填已保存的值
- 文件类型参数保存 `fileKey`，页面展示对应文件名（若文件名无法从 `fileKey` 还原，展示「已上传」）

**Step 3：选择执行机器人**

支持两种模式（二选一）：

| 模式 | 说明 | 影刀参数 |
|------|------|------|
| 指定机器人 | 选择某台具体机器人 | `accountName`（机器人 accountName） |
| 指定机器人分组 | 选择某个分组，配置执行范围 | `robotClientGroupUuid` + `executeScope`（any/all） |

- 展示机器人当前状态，离线状态有警告提示
- 仅展示用户有权限范围内的机器人和分组

**Step 4：调度策略**

| 调度方式 | 说明 | 配置项 |
|------|------|------|
| 立即触发 | 保存后手动点击触发 | 无 |
| 定时调度 | 按时间规则自动触发 | 每天/每周/每月/Cron 表达式，有效期起止时间 |

**Step 5：高级配置**

| 配置项 | 说明 | 默认值 | 影刀参数 |
|------|------|------|------|
| 任务优先级 | 低(0) / 中(100) / 高(200) | 低(0) | `priority` |
| 应用运行超时 | 运行超时时间（分钟），超出后 job 失败 | 关闭 | `runTimeout`（秒） |
| 等待超时 | 机器人等待排队的最大时长（分钟） | 关闭 | `waitTimeoutSeconds` |
| 失败自动重试 | 失败后自动重试次数（0-3次） | 0 | `retryTimes` |
| 开启云日志 | 将应用运行日志上传至云端，可在执行记录中下载 | 否 | `enableCloudLog` |
| 开启云录屏 | 录制应用运行视频，可在执行记录中下载 | 否 | `enableCloudScreenRecord` |
| 回调地址 | 执行完成后影刀主动推送结果到此地址（配置后无需轮询） | 空 | `callbackUrl` |

**保存逻辑**：
- 保存任务全部配置，含参数值（文件类型参数保存 `fileKey`）
- 若为定时调度，系统注册定时触发任务
- 默认状态为「启用」

---

### 4.8 调度执行与监控

#### 4.8.1 触发执行

**触发方式**：
1. 手动：任务列表点击「立即触发」
2. 自动：定时调度时间到

**触发流程**：

```
用户点击"立即触发"
  → 弹出确认弹窗（展示当前任务参数，支持临时修改参数值）
  → 确认触发
  → 系统生成 idempotentUuid（防重复提交）
  → 调用影刀 POST /oapi/dispatch/v2/job/start
      入参：robotUuid = app_uuid（RPA应用）, accountName 或 robotClientGroupUuid（机器人）,
            params[], priority, runTimeout, enableCloudLog, callbackUrl 等
  → 影刀返回 jobUuid
  → 系统创建执行记录（xybot_job_uuid = jobUuid，status = RUNNING）
  → 跳转到执行记录列表
```

#### 4.8.2 执行状态更新（双机制）

**机制 1：回调接收（推荐，配置 callbackUrl 时生效）**

- 影刀在 job 完成/失败时主动回调 Console
- Console 接收回调，更新对应执行记录状态、结束时间、输出参数、云日志地址等
- 无需轮询，实时性最好

**机制 2：前端轮询（未配置 callbackUrl 时兜底）**

- 前端每 **5 秒**轮询 **`POST /oapi/dispatch/v2/job/query`**（传入 `jobUuid`）
- 根据返回 `status` 更新记录：
  - `running` → 保持「运行中」，继续轮询
  - `success` → 更新为「成功」，记录 `endTime`、`outputParams`、`cloudLogFileDownloadUrl`、`cloudScreenFileDownloadUrl`，停止轮询
  - `failed` → 更新为「失败」，记录 `remark`（错误信息），停止轮询
- 轮询超时保护：单次执行超过 **4 小时**仍未结束，停止轮询，标记为「超时」

#### 4.8.3 执行中操作

**停止运行中的 Job**：

- 在执行记录列表，对「运行中」记录点击「停止」
- 调用 **`POST /oapi/dispatch/v2/job/stop`**（传入 `jobUuid`）
- 停止成功后，记录状态更新为「已停止（STOPPED）」

**重试失败的 Job**：

- 对「失败」记录点击「重试」
- 调用 **`POST /oapi/dispatch/v2/job/retry`**（传入 `jobUuid`）
- 创建新的执行记录关联原任务，新记录状态为「运行中」

#### 4.8.4 执行记录列表

| 字段 | 说明 |
|------|------|
| 执行 ID | 系统生成 |
| 任务名称 | 关联调度任务 |
| 触发应用 | RPA 应用名称 |
| 执行机器人 | 机器人名称 |
| 触发人 | 操作账号（定时触发则为「系统」） |
| 触发方式 | 手动 / 定时 |
| 触发时间 | — |
| 开始执行时间 | 机器人实际开始运行时间（来自 `job.startTime`） |
| 结束时间 | — |
| 执行时长 | — |
| 执行状态 | 运行中 / 成功 / 失败 / 已停止 / 超时 |
| 操作 | 查看详情、停止（运行中）、重试（失败）、下载云日志、下载云录屏 |

**执行记录详情页（弹窗或抽屉）**：
- 基础信息：应用、机器人、参数快照（入参和出参）
- 云日志：若已开启，展示下载链接（`cloudLogFileDownloadUrl`）
- 云录屏：若已开启，展示下载链接（`cloudScreenFileDownloadUrl`）
- 截图预览：`screenshotUrl`（若有）
- 错误信息：失败时展示 `remark`

**筛选条件**：
- 时间范围（触发时间）
- 执行状态（多选）
- RPA 应用
- 机器人
- 触发人
- 标签（按调度任务的标签筛选）

---

### 4.9 机器人排班看板

#### 4.9.1 功能说明

以**机器人为视角**，展示当前用户有权限的机器人在时间轴上的调度排班情况。

#### 4.9.2 看板布局

- **纵轴**：机器人列表（名称 + 当前状态 + 所属分组）
- **横轴**：时间轴（默认今天，可切换本周/自定义范围）
- **色块**：每个 job 的执行时间段，颜色区分状态：
  - 绿色：成功
  - 红色：失败
  - 蓝色：运行中
  - 橙色：已停止
  - 灰色：已排期（未到执行时间）

#### 4.9.3 交互细节

- 点击色块：弹出执行摘要（任务名称、应用、触发时间、执行时长、状态）
- 支持按机器人分组折叠/展开
- 支持按租户/部门/标签筛选机器人范围
- 日视图（小时粒度）/ 周视图（天粒度）切换

---

### 4.10 调度运行数据

#### 4.10.1 核心指标卡片

| 指标 | 说明 |
|------|------|
| 今日执行次数 | — |
| 今日成功率 | 成功次数 / 总次数 |
| 今日机器人利用率 | 执行时长 / (机器人数 × 86400s) |
| 累计执行次数 | — |
| 活跃机器人数 | 今日有执行记录的机器人数 |

#### 4.10.2 图表

| 图表 | 类型 | 说明 |
|------|------|------|
| 执行趋势 | 折线图 | 最近 7/30 天每日执行次数（成功/失败分组） |
| 应用执行排行 | 柱状图 | 按应用统计执行次数 Top 10 |
| 机器人利用率 | 条形图 | 各机器人执行时长占比 |
| 按标签统计 | 环形图 | 按调度任务标签分组统计执行量 |

数据范围遵循角色权限。

---

## 5. 数据模型设计

> 命名规范说明：
> - `xybot_*` 前缀字段：来自影刀 RPA 的原始标识符，同步时写入，不可修改
> - 无前缀字段：Console 自身生成或维护

### 5.1 Tenant（租户）

```
tenant_id       String  PK  自动生成（UUID）
name            String      租户名称（系统内唯一）
description     String?
status          Enum        ACTIVE | INACTIVE
created_at      DateTime
updated_at      DateTime
```

### 5.2 Department（部门）

```
dept_id         String  PK  自动生成
tenant_id       String  FK  归属租户
name            String      部门名称（同租户内唯一）
description     String?
status          Enum        ACTIVE | INACTIVE
created_at      DateTime
updated_at      DateTime
```

### 5.3 Account（账号）

```
account_id          String  PK  自动生成
xybot_user_uuid     String  UNIQUE  影刀用户UUID（来自 userUuid）
login_account       String      影刀登录账号（来自 loginAccount，用于密码登录匹配）
name                String
phone               String?
xybot_role          String?     影刀侧角色（e_admin/e_user）
xybot_account_type  String?     账号类型（basic/senior）
expired_at          DateTime?   影刀账号过期时间
tenant_id           String? FK  归属租户（Console 侧关联）
dept_id             String? FK  归属部门（Console 侧关联）
console_role        Enum        SUPER_ADMIN | TENANT_ADMIN | MEMBER
status              Enum        ACTIVE | EXPIRED
synced_at           DateTime    最后同步时间
created_at          DateTime
updated_at          DateTime
```

### 5.4 RpaApp（RPA 应用）

```
app_id              String  PK  自动生成
app_uuid            String  UNIQUE  RPA 应用 UUID（对应影刀 API 中的 robotUuid，dispatch 调用时传此值）
xybot_version_uuid  String?     当前发版版本UUID
name                String
version             String?     版本名称
description         String?
icon                String?     图标URL
support_param       Boolean     是否支持参数
input_params        JSON        入参定义列表 [{name, type, value, description, direction}]
output_params       JSON        出参定义列表
owner_uuid          String?     影刀侧所有者UUID
owner_name          String?     影刀侧所有者名称
release_at          DateTime?   发版时间
status              Enum        ACTIVE | EXPIRED
synced_at           DateTime
created_at          DateTime
updated_at          DateTime
```

### 5.5 AppTenantMapping（应用-租户/部门关联）

```
id              String  PK
app_id          String  FK  → RpaApp.app_id
tenant_id       String  FK  → Tenant.tenant_id
dept_id         String? FK  → Department.dept_id（为空表示仅关联到租户层级）
created_at      DateTime
created_by      String  FK  操作人 account_id
```

### 5.6 Robot（机器人客户端）

```
robot_id                String  PK  自动生成
xybot_robot_client_uuid String  UNIQUE  影刀机器人UUID（robotClientUuid）
name                    String      机器人名称（robotClientName）
windows_user_name       String?     Windows 系统账号（用于关联 Account）
account_id              String? FK  关联的系统账号（通过 windowsUserName 匹配）
robot_client_group_uuid String?     所属分组UUID（影刀侧）
robot_client_group_name String?     分组名称
status                  Enum        ONLINE | OFFLINE | BUSY
description             String?
client_ip               String?
machine_name            String?
client_version          String?
last_heartbeat          DateTime?
synced_at               DateTime
```

> 机器人的租户/部门归属通过 `account_id → Account.tenant_id / dept_id` 得到，不单独存储。

### 5.7 Tag（标签）

```
tag_id          String  PK  自动生成
tenant_id       String  FK  归属租户
name            String      标签名称（同租户内唯一）
color           String?     颜色（十六进制，如 #FF5733）
description     String?
created_by      String  FK  account_id
created_at      DateTime
updated_at      DateTime
```

### 5.8 ResourceTagMapping（资源-标签关联）

```
id              String  PK
tag_id          String  FK  → Tag.tag_id
resource_type   Enum        ACCOUNT | RPA_APP | ROBOT | SCHEDULE_TASK
resource_id     String      对应资源的主键 ID（account_id / app_id / robot_id / task_id）
created_at      DateTime
created_by      String  FK  account_id
```

> 索引建议：`(resource_type, resource_id)` 联合索引，加速按资源反查标签；`(tag_id)` 索引，加速按标签查资源。

### 5.9 ScheduleTask（调度任务）

```
task_id                 String  PK  自动生成
name                    String
description             String?
app_id                  String  FK  → RpaApp.app_id
app_uuid                String      RPA 应用 UUID 快照（冗余存储，直接用于调用影刀 dispatch API 的 robotUuid 参数）
robot_id                String? FK  → Robot.robot_id（指定机器人模式）
robot_client_group_uuid String?     指定分组模式时的分组UUID
execute_scope           String?     分组模式执行范围：any | all
schedule_type           Enum        IMMEDIATE | CRON
cron_expr               String?
valid_from              DateTime?
valid_to                DateTime?
input_params            JSON        参数值列表 [{name, type, value, direction}]
priority                String?     0(低) | 100(中) | 200(高)
run_timeout_seconds     Long?       应用运行超时（秒）
wait_timeout_seconds    Long?       等待超时（秒）
retry_times             Integer     失败重试次数，默认 0
enable_cloud_log        Boolean     默认 false
enable_cloud_screen     Boolean     默认 false
callback_url            String?     影刀回调地址
status                  Enum        ENABLED | DISABLED
tenant_id               String  FK
dept_id                 String? FK
created_by              String  FK  account_id
created_at              DateTime
updated_at              DateTime
```

### 5.10 TaskExecution（执行记录）

```
execution_id            String  PK  自动生成
task_id                 String  FK  → ScheduleTask.task_id
app_uuid                String      RPA 应用 UUID 快照（执行时的值，对应影刀 robotUuid）
robot_id                String? FK  执行机器人 robot_id 快照
robot_name              String?     机器人名称快照
trigger_type            Enum        MANUAL | SCHEDULED
triggered_by            String      account_id（定时为 "system"）
triggered_at            DateTime    触发时间
started_at              DateTime?   机器人实际开始执行时间（来自 job.startTime）
finished_at             DateTime?   执行结束时间（来自 job.endTime）
duration_seconds        Int?        执行时长
status                  Enum        RUNNING | SUCCESS | FAILED | STOPPED | TIMEOUT
error_message           String?     失败原因（来自 job.remark）
xybot_job_uuid          String?     影刀返回的 jobUuid（POST /oapi/dispatch/v2/job/start）
input_params_snapshot   JSON        执行时入参快照
output_params_snapshot  JSON?       执行完毕后的出参快照（来自 job.robotParams.outputs）
screenshot_url          String?     执行截图 URL（来自 job.screenshotUrl）
cloud_log_url           String?     云日志下载地址（来自 job.cloudLogFileDownloadUrl）
cloud_screen_url        String?     云录屏下载地址（来自 job.cloudScreenFileDownloadUrl）
idempotent_uuid         String?     请求幂等UUID（防重复触发）
```

---

## 6. 权限矩阵

### 6.1 功能权限

| 功能 | 超级管理员 | 租户管理员 | 员工（租户） | 员工（部门） |
|------|:---:|:---:|:---:|:---:|
| 新建/编辑/停用租户 | ✅ | ❌ | ❌ | ❌ |
| 新建/编辑/删除部门 | ✅ | ✅（本租户） | ❌ | ❌ |
| 将账号关联到租户 | ✅ | ❌ | ❌ | ❌ |
| 将账号关联到部门 | ✅ | ✅（本租户） | ❌ | ❌ |
| 将应用关联到租户 | ✅ | ❌ | ❌ | ❌ |
| 将应用关联到部门 | ✅ | ✅（本租户） | ❌ | ❌ |
| 管理标签（CRUD） | ✅（全局查看） | ✅（本租户） | ❌ | ❌ |
| 给资源打标签 | ✅ | ✅（本租户） | ✅（权限内） | ✅（权限内） |
| 新建调度任务 | ✅ | ✅ | ✅ | ✅ |
| 触发/停止/重试调度 | ✅ | ✅ | ✅ | ✅ |

### 6.2 数据可见范围

| 资源 | 超级管理员 | 租户管理员 | 员工（租户） | 员工（部门） |
|------|:---:|:---:|:---:|:---:|
| 账号 | 全部 | 本租户 | 本租户 | 本部门 |
| 应用 | 全部 | 本租户 | 本租户 | 本部门 |
| 机器人 | 全部 | 本租户 | 本租户 | 本部门 |
| 调度任务 | 全部 | 本租户 | 本租户 | 本部门 |
| 执行记录 | 全部 | 本租户 | 本租户 | 本部门 |
| 标签 | 全部（只读） | 本租户（读写） | 本租户（只读） | 本部门（只读） |

---

## 7. 接口对接说明（影刀 RPA 开放 API）

### 7.1 认证

- 调用影刀开放 API 前，通过 **`/oapi/token/v2/token/create`** 获取 `accessToken`
- Token 有有效期（`expiresIn`），需在过期前刷新
- `accessToken` 存储在服务端，不暴露给前端

### 7.2 核心接口映射

| 功能场景 | 影刀接口 | 关键字段说明 |
|------|------|------|
| 账号同步 | `GET /oapi/rpa/user/v1/list` | 返回 `userUuid`、`loginAccount` |
| 应用列表同步 | `GET /oapi/robot/v2/query` | 返回 `robotUuid`（存为 Console `app_uuid`）、`robotName` |
| 应用参数同步 | `GET /oapi/robot/v2/queryRobotParam` | 返回 `inputParams[]`、`outputParams[]` |
| 机器人列表同步 | `POST /oapi/dispatch/v2/client/list` | 返回 `robotClientUuid`、`status`、`windowsUserName` |
| 机器人分组同步 | `POST /oapi/dispatch/v2/client/group/list` | 返回 `robotClientGroupUuid`、`robotClientGroupName` |
| 机器人心跳查询 | `POST /oapi/dispatch/v2/client/getLastHeartTime` | 批量传 `robotClientUuids[]`，返回心跳时间 Map |
| 触发调度执行 | `POST /oapi/dispatch/v2/job/start` | 入参 `robotUuid`（取 Console `app_uuid` 值）、`accountName` 或 `robotClientGroupUuid`（机器人） |
| 查询执行状态 | `POST /oapi/dispatch/v2/job/query` | 入参 `jobUuid`；返回 `status`、`startTime`、`endTime`、`outputParams`、`cloudLogFileDownloadUrl` |
| 停止执行 | `POST /oapi/dispatch/v2/job/stop` | 入参 `jobUuid` |
| 重试执行 | `POST /oapi/dispatch/v2/job/retry` | 入参 `jobUuid` |
| 文件参数上传 | `POST /oapi/dispatch/v2/file/upload` | 上传文件，返回 `fileKey`；调度参数中 `type=file` 的参数以此 `fileKey` 作为值传给影刀 |

### 7.3 同步策略

| 资源 | 同步方式 | 建议频率 |
|------|------|------|
| 账号 | 定时全量 + 手动触发（账号列表页按钮） | 每小时一次 |
| RPA 应用 | 定时全量 + 手动触发（应用列表页按钮） | 每小时一次 |
| 机器人列表 | 定时全量 + 手动触发（机器人列表页按钮） | 每 5 分钟一次 |
| 机器人心跳 | 仅更新心跳时间，随机器人列表同步一并触发 | 每 5 分钟一次 |
| 机器人分组 | 定时全量 | 每小时一次 |

### 7.4 字段对照快查

> **注意**：影刀将 RPA 应用命名为 "robot"，其 API 字段 `robotUuid` 在 Console 中映射为 `app_uuid`；实体执行机器人在影刀中叫 `robotClient`，字段为 `robotClientUuid`，两者含义完全不同。

| 影刀 API 字段 | 影刀含义 | Console 实体 | Console 字段 |
|------|------|------|------|
| `userUuid` | 企业用户 | Account | `xybot_user_uuid` |
| `robotUuid`（xybot-robot / dispatch） | RPA 应用 | RpaApp | `app_uuid` |
| `robotClientUuid`（dispatch） | 机器人客户端 | Robot | `xybot_robot_client_uuid` |
| `jobUuid`（job/start 返回） | 单次执行实例 | TaskExecution | `xybot_job_uuid` |

### 7.5 错误处理

| 场景 | 处理方式 |
|------|------|
| 影刀 API 调用失败 | 记录错误日志；页面提示错误；不中断其他功能 |
| 同步失败 | 保留上次成功数据；页面展示「数据更新于 XX 时间」 |
| 触发调度失败 | 创建执行记录，状态标记为「失败」，`error_message` 记录影刀返回信息 |
| Token 过期 | 后台自动刷新 Token，对用户透明 |

---

## 8. 非功能性需求

### 8.1 性能要求

| 指标 | 要求 |
|------|------|
| 页面加载时间（首屏） | ≤ 3 秒 |
| 列表查询响应时间 | ≤ 1 秒（10 万条数据内） |
| 调度触发响应 | ≤ 3 秒（至影刀接口调用完成） |
| 并发用户数 | 支持 200 并发用户 |

### 8.2 安全要求

- 所有接口需要身份认证（JWT Token），Token 有效期 8 小时
- 接口层强制权限校验，防止越权访问（租户间数据绝对隔离）
- 敏感操作（删除、停用）记录操作审计日志
- 影刀 `accessToken` 只存储在服务端，不暴露给前端
- HTTPS 传输，密码字段前端加密传输

### 8.3 可用性

- 系统可用性目标：99.5%（月度）
- 数据库定期备份（每日）
- 支持容器化部署（Docker/Kubernetes）

### 8.4 兼容性

- 浏览器：Chrome 90+、Edge 90+、Firefox 90+（不要求兼容 IE）
- 屏幕分辨率：最低 1366×768，推荐 1920×1080
- 优先 PC 端，不要求移动端适配

### 8.5 国际化

- 第一版仅支持中文，代码预留 i18n 扩展能力

---

## 9. 名词说明

| 名词 | 含义 |
|------|------|
| 影刀 RPA | 本产品依赖的 RPA 平台，数据同步来源 |
| RPA Console | 本产品名称，企业定制化管理平台 |
| 租户（Tenant） | 等同于子公司，系统内最高隔离单元 |
| 部门（Department） | 隶属于租户，比租户更细粒度的组织单元 |
| 超级管理员 | 拥有全局权限的管理账号 |
| 租户管理员 | 仅拥有本租户权限的管理账号 |
| 员工 | 普通操作账号，权限范围取决于归属（租户或部门） |
| RPA 应用 | 可调度运行的自动化流程。Console 内部以 `app_uuid` 标识；调用影刀 dispatch API 时将 `app_uuid` 作为 `robotUuid` 参数传入（影刀将应用命名为 robot，属其内部命名习惯） |
| 机器人 | 安装了影刀 RPA 客户端的实体机器/账号，在影刀 dispatch 中以 `robotClientUuid` 标识 |
| jobUuid | 影刀 dispatch 每次执行产生的实例 UUID，对应 Console 中的执行记录 |
| 调度任务 | 绑定了应用+机器人+调度策略+参数的任务配置 |
| 执行记录 | 每次调度触发产生的一条执行日志 |
| 云日志 | 影刀将应用运行日志上传云端，通过 `cloudLogFileDownloadUrl` 下载 |
| 云录屏 | 影刀将应用运行视频上传云端，通过 `cloudScreenFileDownloadUrl` 下载 |
| 标签 | 租户维度的分类标注，可挂载到账号/应用/机器人/调度任务 |
| Cron 表达式 | 标准定时规则（如 `0 9 * * 1-5` 表示工作日 9 点） |
| idempotentUuid | 请求幂等 UUID，防止网络重试导致重复触发调度 |
