# RPA Console 测试用例

基于 PRD v1.4、技术方案 v1.0 与 OpenAPI 1.0.0 编制。所有接口默认使用统一响应结构 `{code, message, data}`；除登录与影刀回调外，未认证请求应返回 HTTP 401，过期 Token 应返回 HTTP 401。

#### 测试数据准备
- 超级管理员账号：`super-admin`，角色 `SUPER_ADMIN`，无租户/部门归属。
- 租户 A：`tenant-a`，状态 `ACTIVE`；部门 A1：`dept-a1`，部门 A2：`dept-a2`。
- 租户 B：`tenant-b`，状态 `ACTIVE`；部门 B1：`dept-b1`。
- 租户管理员：`tenant-admin-a` 属于租户 A，`tenant-admin-b` 属于租户 B。
- 租户级员工：`member-a-tenant` 属于租户 A，无部门。
- 部门级员工：`member-a1` 属于租户 A 部门 A1；`member-a2` 属于租户 A 部门 A2；`member-b1` 属于租户 B 部门 B1。
- 已同步账号：`account-unassigned` 未关联租户；`account-a1` 属于租户 A 部门 A1；`account-b1` 属于租户 B 部门 B1。
- 已同步应用：`app-a1` 关联租户 A 部门 A1，`app-a-tenant` 关联租户 A，`app-b1` 关联租户 B 部门 B1；`app-a-file-param` 支持 `type=file` 入参。
- 已同步机器人：`robot-a1` 继承账号 `account-a1` 的租户/部门归属，状态 `ONLINE`；`robot-a2` 属于部门 A2；`robot-b1` 属于租户 B 部门 B1；机器人分组 `group-a` 属于租户 A 可见范围。
- 标签：租户 A 下 `tag-a-important`、`tag-a-finance`；租户 B 下 `tag-b-important`。
- 调度任务：`task-a1-immediate` 属于租户 A 部门 A1，绑定 `app-a1` 和 `robot-a1`；`task-a-cron` 属于租户 A，状态 `ENABLED`，`scheduleType=CRON`；`task-b1` 属于租户 B 部门 B1。
- 执行记录：`exec-running-a1` 状态 `RUNNING`；`exec-failed-a1` 状态 `FAILED`；`exec-success-a1` 状态 `SUCCESS`；`exec-stopped-a1` 状态 `STOPPED`；`exec-timeout-a1` 状态 `TIMEOUT`。
- 影刀 API Mock：支持账号、应用、参数、机器人、分组、心跳、文件上传、job start/query/stop/retry/token 接口的成功、失败、限流和重复同步响应。

## 认证与会话

### TC-AUTH-001 账号密码登录成功

| 项 | 内容 |
|---|---|
| **前置条件** | 账号 `tenant-admin-a` 状态 `ACTIVE`，所属租户 A 状态 `ACTIVE`。 |
| **接口** | POST `/api/v1/auth/login` |
| **请求** | `{"loginAccount":"tenant-admin-a","password":"demo-password"}` |
| **预期响应** | HTTP 200；`code=0`；`data.token` 非空；`data.role=TENANT_ADMIN`；`data.tenantId=tenant-a`；`data.deptId=null`。 |
| **验证点** | JWT 包含 `userId`、`tenantId`、`role`、`exp`，有效期约 8 小时；登录后可访问 `/api/v1/auth/me`。 |

### TC-AUTH-002 密码错误登录失败

| 项 | 内容 |
|---|---|
| **前置条件** | 账号 `member-a1` 存在且状态 `ACTIVE`。 |
| **接口** | POST `/api/v1/auth/login` |
| **请求** | `{"loginAccount":"member-a1","password":"wrong-password"}` |
| **预期响应** | HTTP 401；响应提示账号或密码错误；`data=null`。 |
| **验证点** | 不签发 JWT；账号状态与登录失败次数策略不被意外修改。 |

### TC-AUTH-003 停用租户账号无法登录

| 项 | 内容 |
|---|---|
| **前置条件** | 将租户 B 状态设为 `INACTIVE`；账号 `member-b1` 状态 `ACTIVE` 且属于租户 B。 |
| **接口** | POST `/api/v1/auth/login` |
| **请求** | `{"loginAccount":"member-b1","password":"demo-password"}` |
| **预期响应** | HTTP 400 或 401；`code` 非 0；`message` 提示租户或账号不可用。 |
| **验证点** | 不签发 JWT；租户 B 下调度任务保持暂停或不可触发状态。 |

### TC-AUTH-004 获取当前用户信息

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` 有效 Token。 |
| **接口** | GET `/api/v1/auth/me` |
| **请求** | Header：`Authorization: Bearer {demo-member-a1-token}` |
| **预期响应** | HTTP 200；`data.accountId` 非空；`data.role=MEMBER`；`data.tenantId=tenant-a`；`data.deptId=dept-a1`。 |
| **验证点** | 返回的租户、部门信息与账号归属一致，不返回其他租户信息。 |

### TC-AUTH-005 未认证与过期 Token 统一拦截

| 项 | 内容 |
|---|---|
| **前置条件** | 准备无 Token 请求和已过期 JWT。 |
| **接口** | GET `/api/v1/accounts` |
| **请求** | 场景 1：不带 `Authorization`；场景 2：`Authorization: Bearer {demo-expired-token}`。 |
| **预期响应** | 两个场景均 HTTP 401；`code=40100` 或等价未认证错误码。 |
| **验证点** | 登录接口和 `/api/v1/task-executions/callback` 以外的接口均需认证。 |

## 组织结构管理

### TC-ORG-001 超级管理员创建租户成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；系统中不存在名称 `测试子公司 C`。 |
| **接口** | POST `/api/v1/tenants` |
| **请求** | `{"name":"测试子公司 C","description":"自动化测试租户","adminAccountIds":["account-unassigned"]}` |
| **预期响应** | HTTP 200；`data.tenantId` 非空；`data.name=测试子公司 C`；`data.status=ACTIVE`。 |
| **验证点** | `tenant` 新增记录；指定管理员账号归属到新租户且角色为 `TENANT_ADMIN`；租户 ID 自动生成且不可由请求指定。 |

### TC-ORG-002 租户列表查询与筛选成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；租户 A、B 存在。 |
| **接口** | GET `/api/v1/tenants?page=1&size=20&status=ACTIVE&name=租户` |
| **请求** | Header：`Authorization: Bearer {demo-super-admin-token}` |
| **预期响应** | HTTP 200；`data.records` 包含符合条件租户；每条含 `tenantId/name/status/deptCount/accountCount/createdAt`。 |
| **验证点** | 分页字段 `total/current/size` 正确；普通租户管理员或员工调用该接口返回 403。 |

### TC-ORG-003 编辑与停用租户成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；租户 A 状态 `ACTIVE`。 |
| **接口** | PUT `/api/v1/tenants/{tenantId}`；PATCH `/api/v1/tenants/{tenantId}/status` |
| **请求** | PUT：`{"name":"租户 A 新名称","description":"更新描述"}`；PATCH：`{"status":"INACTIVE"}` |
| **预期响应** | 两个请求均 HTTP 200；详情查询返回新名称与 `status=INACTIVE`。 |
| **验证点** | 租户软停用，不物理删除；停用后该租户账号无法登录，定时调度任务不可继续触发。 |

### TC-ORG-004 租户输入校验与唯一性

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；租户 A 名称已存在。 |
| **接口** | POST `/api/v1/tenants` |
| **请求** | 场景 1：`{"name":""}`；场景 2：`{"name":"超过50字符的租户名称...","description":"正常"}`；场景 3：`{"name":"租户 A"}`。 |
| **预期响应** | 必填为空和超长返回 HTTP 400；名称重复返回 HTTP 400 或 409，错误码为 `10001` 或 `40900`。 |
| **验证点** | 数据库不新增异常租户；错误提示为中文且可前端展示。 |

### TC-ORG-005 租户管理员创建本租户部门成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `tenant-admin-a` Token；租户 A 下不存在 `财务共享中心` 部门。 |
| **接口** | POST `/api/v1/tenants/tenant-a/departments` |
| **请求** | `{"name":"财务共享中心","description":"自动化测试部门"}` |
| **预期响应** | HTTP 200；`data.deptId` 非空；`data.tenantId=tenant-a`；`data.name=财务共享中心`。 |
| **验证点** | 部门写入租户 A；租户管理员不能通过路径参数在租户 B 下创建部门，跨租户返回 403。 |

### TC-ORG-006 部门编辑删除与有账号部门删除失败

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `tenant-admin-a` Token；`dept-a1` 下存在账号，另有空部门 `dept-empty-a`。 |
| **接口** | PUT `/api/v1/departments/{deptId}`；DELETE `/api/v1/departments/{deptId}` |
| **请求** | PUT：`{"name":"部门 A1 新名称","description":"更新"}`；DELETE：分别删除 `dept-empty-a` 和 `dept-a1`。 |
| **预期响应** | 编辑本租户部门 HTTP 200；删除空部门 HTTP 200；删除有账号部门 HTTP 400，错误码 `10005`。 |
| **验证点** | 删除有账号部门不改变部门状态；同租户部门名称重复返回 `10002`；部门名称超 50 字返回 400。 |

### TC-ORG-007 部门权限矩阵与视角切换

| 项 | 内容 |
|---|---|
| **前置条件** | 超级管理员、租户管理员 A、员工 A1 Token 均有效。 |
| **接口** | GET `/api/v1/tenants/{tenantId}/departments`；POST `/api/v1/tenants/{tenantId}/departments` |
| **请求** | 超级管理员查询租户 A、B 部门；租户管理员 A 查询租户 B 部门；员工 A1 新建部门。 |
| **预期响应** | 超级管理员查询 HTTP 200；租户管理员跨租户查询或写入 HTTP 403；员工新建部门 HTTP 403。 |
| **验证点** | `X-View-Tenant-Id` 仅超级管理员可传；租户管理员 `X-View-Dept-Id=dept-a1` 只能切换本租户部门视角。 |

## 账号管理

### TC-ACC-001 手动同步账号成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；影刀 Mock `GET /oapi/rpa/user/v1/list` 返回新增账号和已有账号。 |
| **接口** | POST `/api/v1/accounts/sync` |
| **请求** | Header：`Authorization: Bearer {demo-super-admin-token}` |
| **预期响应** | HTTP 200；`data.synced` 为同步条数；`data.lastSyncTime` 为当前时间附近。 |
| **验证点** | 新账号 `console_role=MEMBER` 且未关联租户/部门；已有账号只更新影刀字段，不覆盖 `tenant_id/dept_id/console_role`。 |

### TC-ACC-002 重复同步账号不产生重复数据

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；影刀 Mock 连续两次返回相同 `userUuid` 列表。 |
| **接口** | POST `/api/v1/accounts/sync` |
| **请求** | 连续调用两次。 |
| **预期响应** | 两次均 HTTP 200 或第二次在并发时返回 HTTP 400 `10009`；非并发重复同步成功。 |
| **验证点** | `account.uk_xybot_user_uuid` 无重复；重复同步执行 Upsert；`last_sync_account` 更新正确。 |

### TC-ACC-003 账号列表按角色范围过滤

| 项 | 内容 |
|---|---|
| **前置条件** | 租户 A、B 各有账号；A1、A2 各有账号和标签。 |
| **接口** | GET `/api/v1/accounts?page=1&size=20&tagIds=tag-a-important` |
| **请求** | 分别使用 `super-admin`、`tenant-admin-a`、`member-a-tenant`、`member-a1` Token。 |
| **预期响应** | 超级管理员可见全部；租户管理员 A 与租户级员工仅见租户 A；部门级员工 A1 仅见部门 A1。 |
| **验证点** | 租户 B 数据不会出现在租户 A 用户响应中；部门级员工查询 A2 或 B1 账号详情返回 403 或 404。 |

### TC-ACC-004 超级管理员关联账号到租户并设置角色

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；`account-unassigned` 未关联租户。 |
| **接口** | PUT `/api/v1/accounts/{accountId}/tenant`；PUT `/api/v1/accounts/{accountId}/role` |
| **请求** | 关联租户：`{"tenantId":"tenant-a","role":"TENANT_ADMIN"}`；设置角色：`{"role":"MEMBER"}` |
| **预期响应** | 两个请求均 HTTP 200。 |
| **验证点** | 账号只能归属一个租户；重新关联到租户 B 时租户 A 部门归属必须清空；租户管理员或员工调用关联租户/设置角色返回 403。 |

### TC-ACC-005 租户管理员分配本租户账号到部门

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `tenant-admin-a` Token；目标账号属于租户 A 且当前无部门。 |
| **接口** | PUT `/api/v1/accounts/{accountId}/department` |
| **请求** | `{"deptId":"dept-a1"}`；移出部门请求为 `{"deptId":null}`。 |
| **预期响应** | HTTP 200；账号详情返回 `deptId=dept-a1`，移出后 `deptId=null`。 |
| **验证点** | 账号任一时刻最多一个部门；对应机器人归属跟随账号部门变化；跨租户账号或部门返回 403。 |

### TC-ACC-006 账号管理输入校验和资源不存在

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` 或 `tenant-admin-a` Token。 |
| **接口** | PUT `/api/v1/accounts/{accountId}/tenant`；PUT `/api/v1/accounts/{accountId}/department`；PUT `/api/v1/accounts/{accountId}/role` |
| **请求** | 无效 `tenantId`、无效 `deptId`、无效角色 `OWNER`、不存在账号 ID。 |
| **预期响应** | 无效枚举或必填缺失返回 HTTP 400；不存在账号返回 HTTP 400/404，错误码 `10003` 或 `40400`。 |
| **验证点** | 不产生半更新；部门必须属于账号当前租户。 |

## RPA 应用管理

### TC-APP-001 手动同步应用及参数成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；影刀 Mock `GET /oapi/robot/v2/query` 和 `GET /oapi/robot/v2/queryRobotParam` 返回应用与参数。 |
| **接口** | POST `/api/v1/rpa-apps/sync` |
| **请求** | Header：`Authorization: Bearer {demo-super-admin-token}` |
| **预期响应** | HTTP 200；`data.synced` 为同步应用数；`data.lastSyncTime` 更新。 |
| **验证点** | `robotUuid` 写入 Console `app_uuid`；`releaseRobotVersionUuid` 写入 `xybot_version_uuid`；`inputParams/outputParams/supportParam` 正确保存。 |

### TC-APP-002 应用重复同步与影刀字段保护

| 项 | 内容 |
|---|---|
| **前置条件** | 应用 `app-a1` 已有关联租户/部门与标签；影刀 Mock 返回同一 `robotUuid` 的新版本名称。 |
| **接口** | POST `/api/v1/rpa-apps/sync` |
| **请求** | 连续触发两次同步。 |
| **预期响应** | HTTP 200；不产生重复 `app_uuid` 记录。 |
| **验证点** | 同步更新影刀原始字段，但不覆盖应用-租户/部门关联和标签；并发同步受锁保护。 |

### TC-APP-003 应用列表和详情权限过滤

| 项 | 内容 |
|---|---|
| **前置条件** | A1、A2、B1 各有关联应用；`app-a-file-param` 有 `file` 类型参数。 |
| **接口** | GET `/api/v1/rpa-apps`；GET `/api/v1/rpa-apps/{appId}` |
| **请求** | 分别使用超级管理员、租户管理员 A、租户级员工 A、部门级员工 A1 Token 查询。 |
| **预期响应** | HTTP 200；响应范围分别为全局、租户 A、租户 A、部门 A1。详情返回 `appUuid/inputParams/outputParams/supportParam`。 |
| **验证点** | 部门 A1 员工查询 `app-a2` 或 `app-b1` 详情返回 403/404；响应中 `appUuid` 不与机器人 `robotClientUuid` 混淆。 |

### TC-APP-004 关联应用到租户和部门成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token 关联租户；使用 `tenant-admin-a` Token 关联部门；应用已同步。 |
| **接口** | POST `/api/v1/rpa-apps/{appId}/tenant-mappings` |
| **请求** | 租户关联：`{"tenantId":"tenant-a"}`；部门关联：`{"tenantId":"tenant-a","deptId":"dept-a1"}` |
| **预期响应** | HTTP 200；应用详情 `tenantMappings` 出现对应记录。 |
| **验证点** | 超级管理员可关联任意租户；租户管理员只能在本租户已关联应用下分配本租户部门；员工调用返回 403。 |

### TC-APP-005 应用关联唯一性与解除关联

| 项 | 内容 |
|---|---|
| **前置条件** | 应用 `app-a1` 已关联租户 A 部门 A1。 |
| **接口** | POST `/api/v1/rpa-apps/{appId}/tenant-mappings`；DELETE `/api/v1/rpa-apps/tenant-mappings/{mappingId}` |
| **请求** | 重复提交相同 `tenantId/deptId`；删除已存在 `mappingId`。 |
| **预期响应** | 重复关联返回 HTTP 400，错误码 `10006`；删除关联 HTTP 200。 |
| **验证点** | 删除后对应权限范围用户不再可见该应用；跨租户删除关联返回 403。 |

## 机器人管理

### TC-ROBOT-001 手动同步机器人、分组和心跳成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；影刀 Mock 机器人列表、分组和心跳接口均返回成功。 |
| **接口** | POST `/api/v1/robots/sync` |
| **请求** | Header：`Authorization: Bearer {demo-super-admin-token}` |
| **预期响应** | HTTP 200；`data.synced` 为机器人同步条数；`data.lastSyncTime` 更新。 |
| **验证点** | `robotClientUuid` 写入 `xybot_robot_client_uuid`；机器人分组信息保存；`lastHeartbeat` 更新。 |

### TC-ROBOT-002 机器人归属继承账号归属

| 项 | 内容 |
|---|---|
| **前置条件** | 机器人 Mock 返回 `windowsUserName` 可匹配 `account-a1`；账号随后被从 `dept-a1` 调整到 `dept-a2`。 |
| **接口** | GET `/api/v1/robots/{robotId}` |
| **请求** | 使用 `tenant-admin-a` Token 查询该机器人详情。 |
| **预期响应** | HTTP 200；机器人详情中的 `tenantId/deptId/accountId` 与账号当前归属一致。 |
| **验证点** | 机器人表不单独存租户/部门；账号归属变化后机器人列表权限范围随之变化。 |

### TC-ROBOT-003 机器人列表、详情与分组查询

| 项 | 内容 |
|---|---|
| **前置条件** | A1、A2、B1 机器人存在；`robot-a1` 状态 `BUSY` 且有运行中执行记录。 |
| **接口** | GET `/api/v1/robots?status=BUSY&groupUuid=group-a`；GET `/api/v1/robots/{robotId}`；GET `/api/v1/robot-groups` |
| **请求** | 使用 `member-a1` Token。 |
| **预期响应** | HTTP 200；列表只包含部门 A1 可见机器人；`currentAppName` 显示运行中应用；分组列表只返回权限范围内分组。 |
| **验证点** | 部门员工查询 A2/B1 机器人详情返回 403/404；`currentAppName` 由 RUNNING 执行记录推导。 |

### TC-ROBOT-004 机器人同步异常处理

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `super-admin` Token；影刀机器人接口返回 502 或业务失败。 |
| **接口** | POST `/api/v1/robots/sync` |
| **请求** | Header：`Authorization: Bearer {demo-super-admin-token}` |
| **预期响应** | HTTP 502；错误码 `20001`；中文提示影刀 API 调用失败。 |
| **验证点** | 保留上次成功同步数据；`last_sync_robot` 不更新为失败时间；错误日志记录影刀返回信息。 |

## 标签管理

### TC-TAG-001 租户管理员创建、查询、编辑标签成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `tenant-admin-a` Token；租户 A 下不存在 `生产日报` 标签。 |
| **接口** | POST `/api/v1/tags`；GET `/api/v1/tags`；PUT `/api/v1/tags/{tagId}` |
| **请求** | 新建：`{"name":"生产日报","color":"#3B82F6","description":"日报任务"}`；编辑：`{"name":"生产日报-更新","color":"#22C55E"}` |
| **预期响应** | 新建 HTTP 200 返回 `TagVO`；查询包含该标签；编辑 HTTP 200。 |
| **验证点** | 标签写入租户 A；创建人是当前账号；超级管理员可查看标签但跨租户写入需符合权限设计。 |

### TC-TAG-002 标签输入校验与同租户唯一

| 项 | 内容 |
|---|---|
| **前置条件** | 租户 A 已有 `tag-a-important`。 |
| **接口** | POST `/api/v1/tags` |
| **请求** | 场景 1：`{"name":""}`；场景 2：`{"name":"超过20字符的标签名称..."}`；场景 3：`{"name":"tag-a-important"}`。 |
| **预期响应** | 必填和超长返回 HTTP 400；同租户重名返回 HTTP 400/409。 |
| **验证点** | 租户 B 可存在同名标签；颜色为空时默认 `#9CA3AF`。 |

### TC-TAG-003 设置与批量设置资源标签

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token；`account-a1`、`app-a1`、`robot-a1`、`task-a1-immediate` 属于部门 A1；标签属于租户 A。 |
| **接口** | PUT `/api/v1/resource-tags`；PUT `/api/v1/resource-tags/batch` |
| **请求** | 单个：`{"resourceType":"SCHEDULE_TASK","resourceId":"task-a1-immediate","tagIds":["tag-a-important"]}`；批量：`{"resourceType":"ROBOT","resourceIds":["robot-a1"],"tagIds":["tag-a-finance"],"mode":"APPEND"}` |
| **预期响应** | HTTP 200；资源详情或列表返回新标签。 |
| **验证点** | 员工只能给权限内资源打本租户标签；使用租户 B 标签或资源返回 403/400；`REPLACE` 模式会移除未提交旧标签。 |

### TC-TAG-004 删除标签自动解除资源关联

| 项 | 内容 |
|---|---|
| **前置条件** | `tag-a-finance` 已关联账号、应用、机器人、调度任务；使用 `tenant-admin-a` Token。 |
| **接口** | DELETE `/api/v1/tags/{tagId}` |
| **请求** | 删除 `tag-a-finance`。 |
| **预期响应** | HTTP 200。 |
| **验证点** | `resource_tag_mapping` 中对应关联全部删除；资源本身不删除；后续按该标签筛选结果为空。 |

## 调度任务配置

### TC-TASK-001 新建立即触发型调度任务成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token；`app-a1` 和 `robot-a1` 均在部门 A1 权限内。 |
| **接口** | POST `/api/v1/schedule-tasks` |
| **请求** | `{"name":"A1日报任务","description":"测试","tagIds":["tag-a-important"],"appId":"app-a1","inputParams":[{"name":"bizDate","type":"str","value":"2026-05-10","direction":"In"}],"robotId":"robot-a1","scheduleType":"IMMEDIATE","priority":"100","retryTimes":1,"enableCloudLog":true}` |
| **预期响应** | HTTP 200；`data.taskId` 非空；`data.status=ENABLED`；`data.scheduleType=IMMEDIATE`；`data.priority=100`。 |
| **验证点** | `tenant_id=tenant-a`、`dept_id=dept-a1` 由当前用户强制写入，不接受前端越权传参；保存参数快照与标签关联。 |

### TC-TASK-002 新建 Cron 分组调度任务成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `tenant-admin-a` Token；`app-a-tenant`、`group-a` 在租户 A 范围内。 |
| **接口** | POST `/api/v1/schedule-tasks` |
| **请求** | `{"name":"租户A定时任务","appId":"app-a-tenant","groupUuid":"group-a","executeScope":"any","scheduleType":"CRON","cronExpr":"0 9 * * 1-5","validFrom":"2026-05-10T00:00:00","validTo":"2026-12-31T23:59:59","priority":"200","runTimeoutSeconds":1800,"waitTimeoutSeconds":300,"retryTimes":3,"callbackUrl":"https://console.example.com/api/v1/task-executions/callback"}` |
| **预期响应** | HTTP 200；详情中 `groupUuid=group-a`、`executeScope=any`、`cronExpr` 原样保存。 |
| **验证点** | 定时任务注册或可被调度扫描；`retryTimes` 最大允许 3；优先级只允许 `0/100/200`。 |

### TC-TASK-003 文件类型参数上传并保存到任务

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token；应用 `app-a-file-param` 含必填 `type=file` 入参；影刀文件上传 Mock 返回 `fileKey=file-key-001`。 |
| **接口** | POST `/api/v1/files/upload`；POST `/api/v1/schedule-tasks` |
| **请求** | 文件上传 multipart：`file=@input.xlsx`；新建任务时参数：`{"name":"inputFile","type":"file","value":"file-key-001","direction":"In"}`。 |
| **预期响应** | 上传 HTTP 200，返回 `data.fileKey` 和 `data.fileName`；任务创建 HTTP 200。 |
| **验证点** | 调度任务只保存 `fileKey` 作为参数值；文件上传失败时不得创建任务；员工不能上传并绑定到无权应用。 |

### TC-TASK-004 调度任务列表、详情、编辑、启停、删除

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `tenant-admin-a` Token；已有 `task-a1-immediate`。 |
| **接口** | GET `/api/v1/schedule-tasks`；GET/PUT/DELETE `/api/v1/schedule-tasks/{taskId}`；PATCH `/api/v1/schedule-tasks/{taskId}/status` |
| **请求** | 查询带 `status=ENABLED&priority=100&tagIds=tag-a-important`；编辑名称和参数；状态请求 `{"status":"DISABLED"}`；删除任务。 |
| **预期响应** | 各请求 HTTP 200；列表分页正确；详情含完整配置；状态变更后 `status=DISABLED`。 |
| **验证点** | 停用任务不可触发，返回 `10007`；删除后详情 404；定时任务停用后不被调度扫描触发。 |

### TC-TASK-005 调度任务输入校验和业务规则

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token。 |
| **接口** | POST `/api/v1/schedule-tasks` |
| **请求** | 场景 1：缺少 `name/appId/scheduleType`；场景 2：名称超 50 字；场景 3：`scheduleType=CRON` 但 `cronExpr=bad-cron`；场景 4：同时传 `robotId` 和 `groupUuid`；场景 5：必填应用入参未传。 |
| **预期响应** | 均 HTTP 400；错误提示分别说明必填、长度、Cron、机器人模式二选一或参数缺失。 |
| **验证点** | 不创建任务；无权 app/robot/group/tag 被引用时返回 403 或 404。 |

### TC-TASK-006 调度任务权限矩阵与租户隔离

| 项 | 内容 |
|---|---|
| **前置条件** | A1、A2、B1 分别存在调度任务。 |
| **接口** | GET `/api/v1/schedule-tasks`；POST `/api/v1/schedule-tasks`；PUT `/api/v1/schedule-tasks/{taskId}` |
| **请求** | 超级管理员查询全部；租户管理员 A 操作 `task-b1`；部门员工 A1 操作 `task-a2` 或引用 `robot-a2`。 |
| **预期响应** | 超级管理员 HTTP 200；跨租户或跨部门写操作 HTTP 403；部门级员工查询列表不含 A2/B1 数据。 |
| **验证点** | 所有任务查询和写入都由服务端数据范围控制，不信任请求中的 `tenantId/deptId`。 |

## 调度执行与监控

### TC-EXEC-001 立即触发调度创建 RUNNING 执行记录

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token；`task-a1-immediate` 状态 `ENABLED`；影刀 job/start Mock 返回 `jobUuid=job-001`。 |
| **接口** | POST `/api/v1/schedule-tasks/{taskId}/trigger` |
| **请求** | `{"idempotentUuid":"idem-001","inputParams":[{"name":"bizDate","type":"str","value":"2026-05-10","direction":"In"}]}` |
| **预期响应** | HTTP 200；`data.executionId` 非空。 |
| **验证点** | 新增 `task_execution`，`status=RUNNING`，`xybot_job_uuid=job-001`，`triggerType=MANUAL`，`triggeredBy=member-a1`；传给影刀的 `robotUuid` 等于任务的 `app_uuid`。 |

### TC-EXEC-002 幂等 UUID 防重复触发

| 项 | 内容 |
|---|---|
| **前置条件** | `idem-dup-001` 已产生一条执行记录。 |
| **接口** | POST `/api/v1/schedule-tasks/{taskId}/trigger` |
| **请求** | 再次提交 `{"idempotentUuid":"idem-dup-001"}`。 |
| **预期响应** | HTTP 400；错误码 `10010`；提示请求已提交。 |
| **验证点** | 不新增第二条执行记录；不再次调用影刀 job/start。 |

### TC-EXEC-003 停止运行中的执行成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token；`exec-running-a1` 状态 `RUNNING` 且 `xybot_job_uuid=job-running-a1`；影刀 job/stop Mock 成功。 |
| **接口** | POST `/api/v1/task-executions/{executionId}/stop` |
| **请求** | 路径参数 `executionId=exec-running-a1`。 |
| **预期响应** | HTTP 200。 |
| **验证点** | 调用影刀 `POST /oapi/dispatch/v2/job/stop`；执行记录更新为 `STOPPED`，写入 `finished_at/duration_seconds`。 |

### TC-EXEC-004 非运行中执行停止失败

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token；`exec-success-a1` 状态 `SUCCESS`。 |
| **接口** | POST `/api/v1/task-executions/{executionId}/stop` |
| **请求** | 路径参数 `executionId=exec-success-a1`。 |
| **预期响应** | HTTP 400；错误码 `10008`。 |
| **验证点** | 不调用影刀 stop；执行记录状态保持 `SUCCESS`。 |

### TC-EXEC-005 重试失败执行创建新 RUNNING 记录

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token；`exec-failed-a1` 状态 `FAILED`；影刀 job/retry Mock 返回新 `jobUuid=job-retry-001`。 |
| **接口** | POST `/api/v1/task-executions/{executionId}/retry` |
| **请求** | 路径参数 `executionId=exec-failed-a1`。 |
| **预期响应** | HTTP 200；`data.executionId` 为新执行记录 ID。 |
| **验证点** | 原失败记录不被覆盖；新增执行记录状态 `RUNNING`，关联原任务；非失败状态重试返回 `10008`。 |

### TC-EXEC-006 执行回调更新为 SUCCESS

| 项 | 内容 |
|---|---|
| **前置条件** | 存在 `xybot_job_uuid=job-001` 的 RUNNING 执行记录；准备合法 `X-Xybot-Signature`。 |
| **接口** | POST `/api/v1/task-executions/callback` |
| **请求** | `{"jobUuid":"job-001","status":"success","startTime":"2026-05-10T10:00:00","endTime":"2026-05-10T10:03:00","outputParams":[{"name":"result","type":"str","value":"ok","direction":"Out"}],"screenshotUrl":"https://example.com/shot.png","cloudLogFileDownloadUrl":"https://example.com/log","cloudScreenFileDownloadUrl":"https://example.com/video"}` |
| **预期响应** | HTTP 200。 |
| **验证点** | 执行记录更新为 `SUCCESS`；写入开始/结束时间、耗时、出参、截图、云日志和云录屏地址；该接口无需 JWT 但必须校验签名。 |

### TC-EXEC-007 执行回调更新为 FAILED

| 项 | 内容 |
|---|---|
| **前置条件** | 存在 `xybot_job_uuid=job-fail-001` 的 RUNNING 执行记录；签名合法。 |
| **接口** | POST `/api/v1/task-executions/callback` |
| **请求** | `{"jobUuid":"job-fail-001","status":"failed","startTime":"2026-05-10T10:00:00","endTime":"2026-05-10T10:01:00","remark":"应用参数错误"}` |
| **预期响应** | HTTP 200。 |
| **验证点** | 执行记录更新为 `FAILED`；`error_message=应用参数错误`；状态流转不可从终态回退到 RUNNING。 |

### TC-EXEC-008 回调签名非法或 jobUuid 不存在

| 项 | 内容 |
|---|---|
| **前置条件** | 准备非法签名；准备不存在 `jobUuid=job-not-found`。 |
| **接口** | POST `/api/v1/task-executions/callback` |
| **请求** | Header：`X-Xybot-Signature: invalid`；Body：`{"jobUuid":"job-not-found","status":"success"}`。 |
| **预期响应** | 签名非法 HTTP 401/403；签名合法但 job 不存在 HTTP 404。 |
| **验证点** | 不更新任何执行记录；记录安全审计或错误日志。 |

### TC-EXEC-009 执行记录列表与详情按权限过滤

| 项 | 内容 |
|---|---|
| **前置条件** | A1、A2、B1 均存在执行记录，状态覆盖 `RUNNING/SUCCESS/FAILED/STOPPED/TIMEOUT`。 |
| **接口** | GET `/api/v1/task-executions?status=RUNNING&status=FAILED&triggerType=MANUAL&tagIds=tag-a-important`；GET `/api/v1/task-executions/{executionId}` |
| **请求** | 使用 `member-a1` Token 查询列表和详情。 |
| **预期响应** | HTTP 200；仅返回部门 A1 范围内执行记录；详情含 `inputParamsSnapshot/outputParamsSnapshot/xybotJobUuid`。 |
| **验证点** | 查询 A2/B1 执行记录详情返回 403/404；筛选条件组合结果正确。 |

### TC-EXEC-010 影刀触发失败创建 FAILED 执行记录

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `member-a1` Token；任务有效；影刀 job/start Mock 返回失败或超时。 |
| **接口** | POST `/api/v1/schedule-tasks/{taskId}/trigger` |
| **请求** | `{"idempotentUuid":"idem-xybot-fail-001"}` |
| **预期响应** | HTTP 502 或 HTTP 200 带失败记录 ID，以实现为准；错误码 `20001`。 |
| **验证点** | 必须创建或保留一条可追踪执行记录，状态 `FAILED`，`error_message` 记录影刀错误；不得静默丢失触发请求。 |

### TC-EXEC-011 运行超时保护更新 TIMEOUT

| 项 | 内容 |
|---|---|
| **前置条件** | 存在 `triggered_at` 超过 4 小时且状态 `RUNNING` 的执行记录。 |
| **接口** | 后端定时任务 `checkExecutionTimeout`；GET `/api/v1/task-executions/{executionId}` |
| **请求** | 等待或手动触发超时检查后查询执行详情。 |
| **预期响应** | 查询 HTTP 200；`data.status=TIMEOUT`。 |
| **验证点** | `finished_at` 和错误信息按实现记录；终态 TIMEOUT 不再被 stop/retry 以外的非法状态流转覆盖。 |

### TC-EXEC-012 定时调度自动触发执行

| 项 | 内容 |
|---|---|
| **前置条件** | `task-a-cron` 状态 `ENABLED`，当前时间命中 `cronExpr` 且在有效期内；影刀 job/start Mock 成功。 |
| **接口** | 后端定时扫描 `triggerCronTasks`；GET `/api/v1/task-executions` |
| **请求** | 等待或手动触发调度扫描后查询 `triggerType=SCHEDULED`。 |
| **预期响应** | 列表 HTTP 200；出现新执行记录，`triggeredBy=系统` 或 `system`，`triggerType=SCHEDULED`，`status=RUNNING`。 |
| **验证点** | 停用任务、停用租户、超出有效期任务不会被触发。 |

## 机器人排班看板

### TC-BOARD-001 查询日视图排班看板成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `tenant-admin-a` Token；租户 A 有历史执行、当前运行和未来 Cron 任务。 |
| **接口** | GET `/api/v1/schedule-board?date=2026-05-10&view=day&groupUuid=group-a` |
| **请求** | Header：`Authorization: Bearer {demo-tenant-admin-a-token}` |
| **预期响应** | HTTP 200；`data.robots` 非空；每个机器人含 `executions`，其中既可能有 `slotType=EXECUTION` 也可能有 `slotType=SCHEDULED_SLOT`。 |
| **验证点** | 历史/当前执行槽按执行记录生成；未来预排槽按启用 Cron 任务计算；日视图时间范围正确。 |

### TC-BOARD-002 周视图和标签筛选成功

| 项 | 内容 |
|---|---|
| **前置条件** | 租户 A 调度任务带 `tag-a-important`，租户 B 也有同名或不同标签任务。 |
| **接口** | GET `/api/v1/schedule-board?date=2026-05-10&view=week&tagIds=tag-a-important` |
| **请求** | 使用 `member-a-tenant` Token。 |
| **预期响应** | HTTP 200；返回租户 A 范围内带指定标签的机器人排班数据。 |
| **验证点** | 周视图覆盖所选日期所在周；不包含租户 B 数据；无效 `view` 返回 400。 |

### TC-BOARD-003 部门级员工看板隔离

| 项 | 内容 |
|---|---|
| **前置条件** | A1、A2、B1 都有机器人和执行记录。 |
| **接口** | GET `/api/v1/schedule-board?date=2026-05-10&view=day` |
| **请求** | 使用 `member-a1` Token。 |
| **预期响应** | HTTP 200；`data.robots` 仅包含部门 A1 机器人。 |
| **验证点** | A2/B1 机器人、执行槽、未来预排槽均不可见；未认证和过期 Token 返回 401。 |

## 调度运行数据

### TC-DASH-001 查询核心指标卡片成功

| 项 | 内容 |
|---|---|
| **前置条件** | 使用 `tenant-admin-a` Token；租户 A 今日有成功、失败、运行中执行记录。 |
| **接口** | GET `/api/v1/dashboard/stats` |
| **请求** | Header：`Authorization: Bearer {demo-tenant-admin-a-token}` |
| **预期响应** | HTTP 200；返回 `todayExecutionCount/todaySuccessRate/todayRobotUtilization/totalExecutionCount/activeRobotCount` 及增量字段。 |
| **验证点** | 成功率=今日成功次数/今日总执行次数；机器人利用率按权限范围内机器人计算；不包含租户 B 数据。 |

### TC-DASH-002 查询执行趋势成功

| 项 | 内容 |
|---|---|
| **前置条件** | 最近 7 天和 30 天均有执行记录。 |
| **接口** | GET `/api/v1/dashboard/execution-trend?days=7` |
| **请求** | 使用 `member-a-tenant` Token。 |
| **预期响应** | HTTP 200；`data.dates` 长度为 7；`successCounts/failedCounts` 与日期数组长度一致。 |
| **验证点** | 仅统计租户 A 数据；`days` 非 7/30 返回 400。 |

### TC-DASH-003 查询应用排行、机器人利用率和标签统计

| 项 | 内容 |
|---|---|
| **前置条件** | 租户 A 下不同应用、机器人、标签均有执行记录。 |
| **接口** | GET `/api/v1/dashboard/app-ranking?days=30`；GET `/api/v1/dashboard/robot-utilization?date=2026-05-10`；GET `/api/v1/dashboard/tag-stats?days=30` |
| **请求** | 使用 `tenant-admin-a` Token。 |
| **预期响应** | 三个接口均 HTTP 200；应用排行最多 Top 10；机器人利用率为 0.0~1.0；标签统计返回标签名称、颜色和执行次数。 |
| **验证点** | 统计范围遵循租户/部门数据隔离；无执行记录时返回空数组或 0 指标，不报错。 |

### TC-DASH-004 Dashboard 权限隔离

| 项 | 内容 |
|---|---|
| **前置条件** | A1、A2、B1 均有执行数据。 |
| **接口** | GET `/api/v1/dashboard/stats`；GET `/api/v1/dashboard/app-ranking?days=7` |
| **请求** | 分别使用 `super-admin`、`tenant-admin-a`、`member-a1` Token。 |
| **预期响应** | 超级管理员统计全局；租户管理员 A 统计租户 A；部门员工 A1 仅统计部门 A1。 |
| **验证点** | 任意 Dashboard 接口均不允许通过请求参数扩大数据范围；未认证和过期 Token 返回 401。 |

## 安全、权限矩阵与租户隔离专项

### TC-SEC-001 管理类接口权限矩阵专项验证

| 项 | 内容 |
|---|---|
| **前置条件** | 四类角色 Token 均有效：超级管理员、租户管理员、租户级员工、部门级员工。 |
| **接口** | 租户、部门、账号关联、应用关联、标签 CRUD、调度任务 CRUD、调度执行操作相关接口。 |
| **请求** | 按 PRD 第 6 章矩阵逐格发起允许与禁止操作。 |
| **预期响应** | 允许项返回 HTTP 200；禁止项返回 HTTP 403；未认证和过期 Token 返回 HTTP 401。 |
| **验证点** | 超级管理员有全局管理权限；租户管理员只能操作本租户；员工不能管理组织/账号/应用关联/标签 CRUD，但可在权限内打标签、建任务、触发/停止/重试调度。 |

### TC-SEC-002 所有查询接口租户隔离专项验证

| 项 | 内容 |
|---|---|
| **前置条件** | 租户 A、B 均具备账号、应用、机器人、标签、调度任务、执行记录、看板和 Dashboard 数据。 |
| **接口** | GET `/api/v1/accounts`、`/api/v1/rpa-apps`、`/api/v1/robots`、`/api/v1/tags`、`/api/v1/schedule-tasks`、`/api/v1/task-executions`、`/api/v1/schedule-board`、`/api/v1/dashboard/*` |
| **请求** | 使用租户 A 用户 Token，并尝试附加 `tenantId=tenant-b`、`deptId=dept-b1` 或他租户资源 ID。 |
| **预期响应** | 列表不包含租户 B 数据；详情或写操作返回 403/404；Dashboard 不统计租户 B。 |
| **验证点** | 数据范围由服务端 SecurityContext 决定，不信任前端传参；SQL 条件或服务过滤必须包含租户/部门约束。 |

### TC-SEC-003 部门级员工隔离专项验证

| 项 | 内容 |
|---|---|
| **前置条件** | 租户 A 下 A1、A2 均有完整资源与执行记录。 |
| **接口** | 账号、应用、机器人、调度任务、执行记录、看板、Dashboard 查询接口，以及资源打标签和调度触发接口。 |
| **请求** | 使用 `member-a1` Token 查询和操作 A2 资源。 |
| **预期响应** | 查询列表无 A2 数据；详情或写操作 HTTP 403/404；引用 A2 应用/机器人创建任务返回 403/404。 |
| **验证点** | 部门级员工数据可见范围严格为本部门；租户级员工则可见整个租户。 |

### TC-SEC-004 视角切换请求头权限验证

| 项 | 内容 |
|---|---|
| **前置条件** | 准备 `X-View-Tenant-Id` 和 `X-View-Dept-Id` 请求头。 |
| **接口** | GET `/api/v1/accounts`；GET `/api/v1/schedule-tasks` |
| **请求** | 超级管理员传 `X-View-Tenant-Id=tenant-a`；租户管理员 A 传 `X-View-Dept-Id=dept-a1`；租户管理员 A 传 `X-View-Tenant-Id=tenant-b`；员工传任意视角头。 |
| **预期响应** | 超级管理员租户视角和租户管理员本租户部门视角 HTTP 200 且范围收窄；跨租户或员工传视角头返回 403。 |
| **验证点** | 视角切换只能收窄或合法切换范围，不能扩大权限。 |

## 影刀 API 对接专项

### TC-XYBOT-001 影刀 Token 获取与缓存规则

| 项 | 内容 |
|---|---|
| **前置条件** | 配置有效 `accessKeyId/accessKeySecret`；影刀 Token Mock 返回 `accessToken=token-001, expiresIn=7199`。 |
| **接口** | 任一需要调用影刀的接口，如 POST `/api/v1/accounts/sync`。 |
| **请求** | 连续触发两次同步，第二次在 Token 未过期前执行。 |
| **预期响应** | 同步接口按业务返回成功。 |
| **验证点** | 首次调用获取 Token；未过期重复调用复用同一个 Token；缓存 TTL 严格使用 `expiresIn`，提前 60 秒刷新；Token 不写入数据库且不返回前端。 |

### TC-XYBOT-002 影刀 Token 获取失败

| 项 | 内容 |
|---|---|
| **前置条件** | 影刀 Token Mock 返回失败或 401。 |
| **接口** | POST `/api/v1/accounts/sync` |
| **请求** | 使用 `super-admin` Token 触发同步。 |
| **预期响应** | HTTP 502；错误码 `20002`；中文提示影刀 Token 获取失败。 |
| **验证点** | 不执行后续影刀业务接口；不更新同步时间；错误日志不泄露 `accessKeySecret`。 |

### TC-XYBOT-003 影刀字段映射专项验证

| 项 | 内容 |
|---|---|
| **前置条件** | 影刀 Mock 返回 `userUuid`、应用 `robotUuid`、机器人 `robotClientUuid`、执行 `jobUuid`。 |
| **接口** | POST `/api/v1/accounts/sync`；POST `/api/v1/rpa-apps/sync`；POST `/api/v1/robots/sync`；POST `/api/v1/schedule-tasks/{taskId}/trigger` |
| **请求** | 依次触发同步和调度执行。 |
| **预期响应** | 各接口按成功场景返回 HTTP 200。 |
| **验证点** | `userUuid→xybot_user_uuid`；应用 `robotUuid→app_uuid`；机器人 `robotClientUuid→xybot_robot_client_uuid`；`jobUuid→xybot_job_uuid`；调度 job/start 入参 `robotUuid` 必须取 Console `app_uuid`。 |

### TC-XYBOT-004 影刀限流或业务失败不破坏本地数据

| 项 | 内容 |
|---|---|
| **前置条件** | 任一影刀同步接口 Mock 返回 429 或业务失败。 |
| **接口** | POST `/api/v1/accounts/sync`；POST `/api/v1/rpa-apps/sync`；POST `/api/v1/robots/sync` |
| **请求** | 使用 `super-admin` Token 触发。 |
| **预期响应** | HTTP 502；错误码 `20001`。 |
| **验证点** | 保留上次成功数据；不产生部分脏数据；同步锁最终释放，后续可再次同步。 |

## 质量检查清单

- [x] 覆盖 PRD 10 个功能模块：登录、组织结构、账号、RPA 应用、机器人、标签、调度任务、调度执行、排班看板、调度运行数据。
- [x] 覆盖主要 API 的正向场景：认证、租户、部门、账号、应用、机器人、标签、任务、执行、看板、Dashboard、文件上传。
- [x] 覆盖权限矩阵：超级管理员、租户管理员、租户级员工、部门级员工、未认证、过期 Token。
- [x] 覆盖租户隔离和部门隔离专项。
- [x] 覆盖输入校验：必填、长度、唯一性、非法枚举、非法 Cron、二选一规则、必填参数缺失。
- [x] 覆盖业务规则：停用租户不可登录、部门有账号不可删除、一个账号只能归属一个租户/部门、任务停用不可触发、资源归属继承。
- [x] 覆盖影刀 API 对接：Token、同步、幂等 Upsert、字段映射、错误处理、文件上传、job start/stop/retry/callback。
- [x] 覆盖调度执行状态流转：`RUNNING → SUCCESS`、`RUNNING → FAILED`、`RUNNING → STOPPED`、`RUNNING → TIMEOUT`、失败重试新建 `RUNNING` 记录、幂等 UUID 防重复提交。
