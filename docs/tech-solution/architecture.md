# RPA Console 技术方案

**版本**：v1.0  
**日期**：2026-05-09  
**作者**：架构设计团队  
**基于 PRD**：v1.4

---

## 目录

1. [技术选型](#1-技术选型)
2. [Maven 模块结构](#2-maven-模块结构)
3. [包结构设计](#3-包结构设计)
4. [数据库设计](#4-数据库设计)
5. [安全与认证设计](#5-安全与认证设计)
6. [租户数据隔离设计](#6-租户数据隔离设计)
7. [影刀 API 对接设计](#7-影刀-api-对接设计)
8. [数据同步设计](#8-数据同步设计)
9. [调度执行设计](#9-调度执行设计)
10. [API 设计概览](#10-api-设计概览)
11. [错误码定义](#11-错误码定义)
12. [部署架构](#12-部署架构)

---

## 1. 技术选型

| 层 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 运行时 | JDK | 21 | 使用 Virtual Threads 提升 I/O 并发 |
| 框架 | Spring Boot | 3.5.x | 内嵌 Tomcat |
| 构建 | Maven | 3.9.x | 多 Module 结构 |
| ORM | MyBatis-Plus | 3.5.x | 基于 MyBatis，提供 Lambda 查询 |
| 数据库 | MySQL | 8.x | InnoDB，UTF8MB4 |
| 安全 | Spring Security | 6.x + JWT | 无状态认证 |
| HTTP 客户端 | Spring WebClient | — | 调用影刀 API（响应式，非阻塞） |
| 定时任务 | Spring Scheduler | — | @Scheduled 驱动同步任务 |
| 前端 | Vue 3 + Vite | — | Composition API + TypeScript |
| 样式 | Tailwind CSS | 3.x | 无 UI 组件库 |
| 状态管理 | Pinia | 2.x | Vue3 官方推荐 |
| HTTP 客户端（前端）| Axios | 1.x | 带拦截器 |

---

## 2. Maven 模块结构

```
rpa-console/                        ← 父 POM（packaging: pom）
├── pom.xml
├── rpa-console-dao/                ← 数据层
│   └── pom.xml
├── rpa-console-biz/                ← 业务层
│   └── pom.xml
├── rpa-console-web/                ← 接口层
│   └── pom.xml
└── rpa-console-start/              ← 启动层
    └── pom.xml
```

**模块依赖关系**（单向，不可逆）：

```
start → web → biz → dao
```

**各模块关键依赖**：

| 模块 | 关键依赖 |
|---|---|
| `dao` | mybatis-plus-boot-starter、mysql-connector-j |
| `biz` | dao 模块、spring-webflux（WebClient）、jjwt |
| `web` | biz 模块、spring-boot-starter-web、spring-boot-starter-validation |
| `start` | web 模块、spring-boot-starter-security、spring-boot-starter-actuator |

---

## 3. 包结构设计

```
com.rpa.console
│
├── [rpa-console-dao]
│   ├── entity/
│   │   ├── TenantEntity
│   │   ├── DepartmentEntity
│   │   ├── AccountEntity
│   │   ├── RpaAppEntity
│   │   ├── AppTenantMappingEntity
│   │   ├── RobotEntity
│   │   ├── RobotGroupEntity
│   │   ├── TagEntity
│   │   ├── ResourceTagMappingEntity
│   │   ├── ScheduleTaskEntity
│   │   ├── TaskExecutionEntity
│   │   └── SystemConfigEntity
│   ├── mapper/
│   │   └── （对应每个 Entity 的 Mapper 接口）
│   └── enums/
│       ├── StatusEnum           (ACTIVE / INACTIVE)
│       ├── RoleEnum             (SUPER_ADMIN / TENANT_ADMIN / MEMBER)
│       ├── RobotStatusEnum      (ONLINE / OFFLINE / BUSY)
│       ├── ExecutionStatusEnum  (RUNNING / SUCCESS / FAILED / STOPPED / TIMEOUT)
│       ├── ResourceTypeEnum     (ACCOUNT / RPA_APP / ROBOT / SCHEDULE_TASK)
│       └── TriggerTypeEnum      (MANUAL / SCHEDULED)
│
├── [rpa-console-biz]
│   ├── service/
│   │   ├── IAuthService
│   │   ├── ITenantService
│   │   ├── IDepartmentService
│   │   ├── IAccountService
│   │   ├── IRpaAppService
│   │   ├── IRobotService
│   │   ├── ITagService
│   │   ├── IScheduleTaskService
│   │   ├── ITaskExecutionService
│   │   └── IDashboardService
│   ├── service/impl/
│   │   └── （对应实现类）
│   ├── xybot/
│   │   ├── XybotApiClient       ← 影刀 API 调用封装
│   │   ├── XybotTokenManager    ← Token 生命周期管理
│   │   └── dto/                 ← 影刀 API 响应结构 DTO
│   ├── scheduler/
│   │   └── SyncScheduler        ← 定时同步任务
│   └── exception/
│       └── BizException
│
├── [rpa-console-web]
│   ├── controller/
│   │   ├── AuthController
│   │   ├── TenantController
│   │   ├── DepartmentController
│   │   ├── AccountController
│   │   ├── RpaAppController
│   │   ├── RobotController
│   │   ├── TagController
│   │   ├── ScheduleTaskController
│   │   ├── TaskExecutionController
│   │   ├── DashboardController
│   │   ├── ScheduleBoardController
│   │   └── FileController
│   ├── request/                 ← 请求 DTO（Request 后缀）
│   ├── vo/                      ← 响应 VO（VO 后缀）
│   ├── common/
│   │   ├── Result<T>            ← 统一响应包装
│   │   └── PageResult<T>        ← 分页响应包装
│   └── advice/
│       └── GlobalExceptionHandler
│
└── [rpa-console-start]
    ├── RpaConsoleApplication    ← main 类
    ├── config/
    │   ├── SecurityConfig       ← Spring Security 过滤链
    │   ├── CorsConfig
    │   └── WebClientConfig      ← WebClient Bean 配置
    └── filter/
        └── JwtAuthenticationFilter
```

---

## 4. 数据库设计

### 4.1 建库规范

- 字符集：`utf8mb4`，排序：`utf8mb4_unicode_ci`
- 主键：UUID 字符串（VARCHAR 36），使用 MyBatis-Plus `IdType.ASSIGN_UUID`
- 时间字段：`DATETIME`，应用层转换为 `LocalDateTime`
- 软删除：不使用 MyBatis-Plus 逻辑删除注解；业务上通过 `status` 字段标记失效

### 4.2 信创数据库兼容性

系统需要同时支持 MySQL 8.x 和主流信创数据库（达梦 DM8、人大金仓 KingbaseES V8）。兼容策略如下：

**切换方式：** 修改 `application-{profile}.yml` 中的 `spring.datasource` 和 `database.type`，无需改代码。

| 数据库 | JDBC Driver | `database.type` 值 | URL 示例 |
|---|---|---|---|
| MySQL 8.x | `com.mysql.cj.jdbc.Driver` | `mysql` | `jdbc:mysql://host:3306/rpa_console` |
| 达梦 DM8 | `dm.jdbc.driver.DmDriver` | `dm` | `jdbc:dm://host:5236/RPACONSOLE` |
| 人大金仓 KingbaseES V8 | `com.kingbase8.Driver` | `kingbase_es` | `jdbc:kingbase8://host:54321/rpa_console` |

**兼容规则（编码层）：**

1. **分页插件** — `PaginationInnerInterceptor` 的 `DbType` 由配置文件驱动，不硬编码：
   ```java
   @Configuration
   public class MybatisPlusConfig {
       @Value("${database.type:mysql}")
       private String dbType;

       @Bean
       public MybatisPlusInterceptor mybatisPlusInterceptor() {
           MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
           interceptor.addInnerInterceptor(
               new PaginationInnerInterceptor(DbType.getDbType(dbType))
           );
           return interceptor;
       }
   }
   ```

2. **JSON 字段** — 不依赖数据库原生 JSON 类型，统一使用 MyBatis-Plus 内置 `JacksonTypeHandler`，底层存 `VARCHAR`/`TEXT`，跨库透明：
   ```java
   @TableField(value = "input_params", typeHandler = JacksonTypeHandler.class)
   private List<AppParam> inputParams;
   ```
   > DDL 中 JSON 字段在 MySQL 用 `JSON`，在 DM/Kingbase 改为 `CLOB`，应用层代码不变。

3. **Boolean 字段** — 使用 `TINYINT(1)`（MySQL）/ `SMALLINT`（DM/Kingbase），均映射为 Java `Boolean`，无需处理。

4. **UUID 主键** — 使用 `IdType.ASSIGN_UUID`，应用层生成，不依赖任何数据库函数。✓

5. **字符集** — MySQL 建库指定 `utf8mb4`；DM/Kingbase 建库时使用 `UTF-8`，`NVARCHAR` 类型替代中文字符的 `VARCHAR`。

6. **禁止使用** 的 MySQL 特有写法：`LIMIT x,y`（用 MyBatis-Plus 分页替代）、`GROUP_CONCAT`、MySQL 特有函数。

### 4.3 建表 SQL

```sql
-- 租户
CREATE TABLE `tenant` (
  `tenant_id`   VARCHAR(36)  NOT NULL,
  `name`        VARCHAR(50)  NOT NULL COMMENT '租户名称，系统内唯一',
  `description` VARCHAR(200) DEFAULT NULL,
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE|INACTIVE',
  `created_at`  DATETIME     NOT NULL,
  `updated_at`  DATETIME     NOT NULL,
  PRIMARY KEY (`tenant_id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 部门
CREATE TABLE `department` (
  `dept_id`     VARCHAR(36)  NOT NULL,
  `tenant_id`   VARCHAR(36)  NOT NULL,
  `name`        VARCHAR(50)  NOT NULL COMMENT '同租户内唯一',
  `description` VARCHAR(200) DEFAULT NULL,
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  `created_at`  DATETIME     NOT NULL,
  `updated_at`  DATETIME     NOT NULL,
  PRIMARY KEY (`dept_id`),
  UNIQUE KEY `uk_tenant_name` (`tenant_id`, `name`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 账号（来自影刀同步）
CREATE TABLE `account` (
  `account_id`          VARCHAR(36)  NOT NULL,
  `xybot_user_uuid`     VARCHAR(64)  NOT NULL COMMENT '影刀用户 UUID',
  `login_account`       VARCHAR(100) NOT NULL COMMENT '影刀登录账号',
  `name`                VARCHAR(100) NOT NULL,
  `phone`               VARCHAR(20)  DEFAULT NULL,
  `xybot_role`          VARCHAR(20)  DEFAULT NULL COMMENT 'e_admin|e_user',
  `xybot_account_type`  VARCHAR(20)  DEFAULT NULL COMMENT 'basic|senior',
  `expired_at`          DATETIME     DEFAULT NULL COMMENT '影刀账号过期时间',
  `tenant_id`           VARCHAR(36)  DEFAULT NULL COMMENT 'Console 侧关联租户',
  `dept_id`             VARCHAR(36)  DEFAULT NULL COMMENT 'Console 侧关联部门',
  `console_role`        VARCHAR(20)  NOT NULL DEFAULT 'MEMBER' COMMENT 'SUPER_ADMIN|TENANT_ADMIN|MEMBER',
  `status`              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE|EXPIRED',
  `synced_at`           DATETIME     NOT NULL,
  `created_at`          DATETIME     NOT NULL,
  `updated_at`          DATETIME     NOT NULL,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uk_xybot_user_uuid` (`xybot_user_uuid`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_dept_id` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RPA 应用（来自影刀同步）
CREATE TABLE `rpa_app` (
  `app_id`              VARCHAR(36)   NOT NULL,
  `app_uuid`            VARCHAR(64)   NOT NULL COMMENT '影刀 robotUuid，dispatch 时使用',
  `xybot_version_uuid`  VARCHAR(64)   DEFAULT NULL,
  `name`                VARCHAR(200)  NOT NULL,
  `version`             VARCHAR(100)  DEFAULT NULL,
  `description`         TEXT          DEFAULT NULL,
  `icon`                VARCHAR(500)  DEFAULT NULL,
  `support_param`       TINYINT(1)    NOT NULL DEFAULT 0,
  `input_params`        JSON          DEFAULT NULL COMMENT '入参定义',
  `output_params`       JSON          DEFAULT NULL COMMENT '出参定义',
  `owner_uuid`          VARCHAR(64)   DEFAULT NULL,
  `owner_name`          VARCHAR(100)  DEFAULT NULL,
  `release_at`          DATETIME      DEFAULT NULL,
  `status`              VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  `synced_at`           DATETIME      NOT NULL,
  `created_at`          DATETIME      NOT NULL,
  `updated_at`          DATETIME      NOT NULL,
  PRIMARY KEY (`app_id`),
  UNIQUE KEY `uk_app_uuid` (`app_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 应用-租户/部门 关联（多对多）
CREATE TABLE `app_tenant_mapping` (
  `id`          VARCHAR(36) NOT NULL,
  `app_id`      VARCHAR(36) NOT NULL,
  `tenant_id`   VARCHAR(36) NOT NULL,
  `dept_id`     VARCHAR(36) DEFAULT NULL COMMENT 'NULL 表示仅关联到租户',
  `created_at`  DATETIME    NOT NULL,
  `created_by`  VARCHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_tenant_dept` (`app_id`, `tenant_id`, `dept_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_app_id` (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 机器人客户端（来自影刀同步）
CREATE TABLE `robot` (
  `robot_id`                    VARCHAR(36)  NOT NULL,
  `xybot_robot_client_uuid`     VARCHAR(64)  NOT NULL COMMENT '影刀 robotClientUuid',
  `name`                        VARCHAR(200) NOT NULL,
  `windows_user_name`           VARCHAR(100) DEFAULT NULL COMMENT '用于关联 Account',
  `account_id`                  VARCHAR(36)  DEFAULT NULL COMMENT '通过 windowsUserName 关联',
  `robot_client_group_uuid`     VARCHAR(64)  DEFAULT NULL,
  `robot_client_group_name`     VARCHAR(200) DEFAULT NULL,
  `status`                      VARCHAR(20)  NOT NULL DEFAULT 'OFFLINE' COMMENT 'ONLINE|OFFLINE|BUSY',
  `description`                 TEXT         DEFAULT NULL,
  `client_ip`                   VARCHAR(50)  DEFAULT NULL,
  `machine_name`                VARCHAR(200) DEFAULT NULL,
  `client_version`              VARCHAR(50)  DEFAULT NULL,
  `last_heartbeat`              DATETIME     DEFAULT NULL,
  `synced_at`                   DATETIME     NOT NULL,
  `created_at`                  DATETIME     NOT NULL,
  `updated_at`                  DATETIME     NOT NULL,
  PRIMARY KEY (`robot_id`),
  UNIQUE KEY `uk_xybot_robot_client_uuid` (`xybot_robot_client_uuid`),
  KEY `idx_account_id` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 机器人分组（来自影刀同步）
CREATE TABLE `robot_group` (
  `group_id`          VARCHAR(36)  NOT NULL,
  `xybot_group_uuid`  VARCHAR(64)  NOT NULL,
  `name`              VARCHAR(200) NOT NULL,
  `synced_at`         DATETIME     NOT NULL,
  `created_at`        DATETIME     NOT NULL,
  `updated_at`        DATETIME     NOT NULL,
  PRIMARY KEY (`group_id`),
  UNIQUE KEY `uk_xybot_group_uuid` (`xybot_group_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 标签
CREATE TABLE `tag` (
  `tag_id`      VARCHAR(36) NOT NULL,
  `tenant_id`   VARCHAR(36) NOT NULL,
  `name`        VARCHAR(20) NOT NULL COMMENT '同租户内唯一',
  `color`       VARCHAR(10) DEFAULT '#9CA3AF' COMMENT '十六进制颜色',
  `description` VARCHAR(100) DEFAULT NULL,
  `created_by`  VARCHAR(36) NOT NULL,
  `created_at`  DATETIME    NOT NULL,
  `updated_at`  DATETIME    NOT NULL,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `uk_tenant_name` (`tenant_id`, `name`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资源-标签 关联
CREATE TABLE `resource_tag_mapping` (
  `id`            VARCHAR(36) NOT NULL,
  `tag_id`        VARCHAR(36) NOT NULL,
  `resource_type` VARCHAR(20) NOT NULL COMMENT 'ACCOUNT|RPA_APP|ROBOT|SCHEDULE_TASK',
  `resource_id`   VARCHAR(36) NOT NULL,
  `created_at`    DATETIME    NOT NULL,
  `created_by`    VARCHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tag_resource` (`tag_id`, `resource_type`, `resource_id`),
  KEY `idx_resource` (`resource_type`, `resource_id`),
  KEY `idx_tag_id` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 调度任务
CREATE TABLE `schedule_task` (
  `task_id`               VARCHAR(36)  NOT NULL,
  `name`                  VARCHAR(50)  NOT NULL,
  `description`           TEXT         DEFAULT NULL,
  `app_id`                VARCHAR(36)  NOT NULL,
  `app_uuid`              VARCHAR(64)  NOT NULL COMMENT '冗余存储，dispatch 时直接使用',
  `robot_id`              VARCHAR(36)  DEFAULT NULL COMMENT '指定机器人模式',
  `robot_client_group_uuid` VARCHAR(64) DEFAULT NULL COMMENT '指定分组模式',
  `execute_scope`         VARCHAR(10)  DEFAULT NULL COMMENT 'any|all',
  `schedule_type`         VARCHAR(20)  NOT NULL COMMENT 'IMMEDIATE|CRON',
  `cron_expr`             VARCHAR(100) DEFAULT NULL,
  `valid_from`            DATETIME     DEFAULT NULL,
  `valid_to`              DATETIME     DEFAULT NULL,
  `input_params`          JSON         DEFAULT NULL COMMENT '参数值列表',
  `priority`              VARCHAR(10)  DEFAULT '0' COMMENT '0|100|200',
  `run_timeout_seconds`   BIGINT       DEFAULT NULL,
  `wait_timeout_seconds`  BIGINT       DEFAULT NULL,
  `retry_times`           INT          NOT NULL DEFAULT 0,
  `enable_cloud_log`      TINYINT(1)   NOT NULL DEFAULT 0,
  `enable_cloud_screen`   TINYINT(1)   NOT NULL DEFAULT 0,
  `callback_url`          VARCHAR(500) DEFAULT NULL,
  `status`                VARCHAR(20)  NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED|DISABLED',
  `tenant_id`             VARCHAR(36)  NOT NULL,
  `dept_id`               VARCHAR(36)  DEFAULT NULL,
  `created_by`            VARCHAR(36)  NOT NULL,
  `created_at`            DATETIME     NOT NULL,
  `updated_at`            DATETIME     NOT NULL,
  PRIMARY KEY (`task_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_app_id` (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 执行记录
CREATE TABLE `task_execution` (
  `execution_id`            VARCHAR(36)  NOT NULL,
  `task_id`                 VARCHAR(36)  NOT NULL,
  `app_uuid`                VARCHAR(64)  NOT NULL COMMENT '执行时 app_uuid 快照',
  `robot_id`                VARCHAR(36)  DEFAULT NULL,
  `robot_name`              VARCHAR(200) DEFAULT NULL,
  `trigger_type`            VARCHAR(20)  NOT NULL COMMENT 'MANUAL|SCHEDULED',
  `triggered_by`            VARCHAR(36)  NOT NULL COMMENT 'account_id 或 system',
  `triggered_at`            DATETIME     NOT NULL,
  `started_at`              DATETIME     DEFAULT NULL,
  `finished_at`             DATETIME     DEFAULT NULL,
  `duration_seconds`        INT          DEFAULT NULL,
  `status`                  VARCHAR(20)  NOT NULL COMMENT 'RUNNING|SUCCESS|FAILED|STOPPED|TIMEOUT',
  `error_message`           TEXT         DEFAULT NULL,
  `xybot_job_uuid`          VARCHAR(64)  DEFAULT NULL,
  `input_params_snapshot`   JSON         DEFAULT NULL,
  `output_params_snapshot`  JSON         DEFAULT NULL,
  `screenshot_url`          VARCHAR(500) DEFAULT NULL,
  `cloud_log_url`           VARCHAR(500) DEFAULT NULL,
  `cloud_screen_url`        VARCHAR(500) DEFAULT NULL,
  `idempotent_uuid`         VARCHAR(36)  DEFAULT NULL COMMENT '防重复提交',
  `tenant_id`               VARCHAR(36)  NOT NULL,
  `dept_id`                 VARCHAR(36)  DEFAULT NULL,
  PRIMARY KEY (`execution_id`),
  UNIQUE KEY `uk_idempotent_uuid` (`idempotent_uuid`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_xybot_job_uuid` (`xybot_job_uuid`),
  KEY `idx_tenant_status` (`tenant_id`, `status`),
  KEY `idx_triggered_at` (`triggered_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 系统配置（存储影刀 Token、同步时间戳等）
CREATE TABLE `system_config` (
  `config_key`    VARCHAR(100) NOT NULL,
  `config_value`  TEXT         DEFAULT NULL,
  `updated_at`    DATETIME     NOT NULL,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始化配置项（仅同步时间戳，影刀 Token 不再存 DB）
INSERT INTO `system_config` VALUES
  ('last_sync_account', NULL, NOW()),
  ('last_sync_rpa_app', NULL, NOW()),
  ('last_sync_robot', NULL, NOW()),
  ('last_sync_robot_group', NULL, NOW());
```

---

## 5. 安全与认证设计

### 5.1 JWT Token 结构

```json
{
  "sub": "account_id",
  "userId": "account_id",
  "tenantId": "tenant-uuid 或 null（超级管理员）",
  "deptId": "dept-uuid 或 null",
  "role": "SUPER_ADMIN | TENANT_ADMIN | MEMBER",
  "iat": 1234567890,
  "exp": 1234596690
}
```

- 有效期：8 小时（28800 秒）
- 算法：HS256，密钥配置在 `application.yml` 中（`rpa.jwt.secret`）
- 存储：客户端 localStorage，每次请求携带在 `Authorization: Bearer {token}` 头

### 5.2 Spring Security 过滤链

```
请求 → CorsFilter → JwtAuthenticationFilter → SecurityContextHolder → Controller
```

**JwtAuthenticationFilter 逻辑**：
1. 从 `Authorization` 头提取 Token
2. 验证签名和过期时间
3. 解析 `userId`、`tenantId`、`deptId`、`role`
4. 构建 `UsernamePasswordAuthenticationToken`，写入 `SecurityContextHolder`
5. 无 Token 或 Token 无效：继续过滤链（由 Security 配置决定是否允许匿名访问）

**放行接口**（无需认证）：
- `POST /api/v1/auth/login`
- `POST /api/v1/task-executions/callback`（影刀回调，用共享密钥鉴权）

### 5.3 SecurityUtils

```java
// 从 SecurityContextHolder 提取当前用户上下文
public class SecurityUtils {
    public static String getCurrentUserId() { ... }
    public static String getCurrentTenantId() { ... }  // 超级管理员返回 null
    public static String getCurrentDeptId() { ... }    // 非部门级员工返回 null
    public static String getCurrentRole() { ... }
    public static boolean isSuperAdmin() { ... }
    public static boolean isTenantAdmin() { ... }
}
```

### 5.4 登录流程

**账号密码登录**：
```
POST /api/v1/auth/login {loginAccount, password}
  → AccountMapper.selectOne(loginAccount)
  → 校验账号存在、status=ACTIVE、密码="demo-password"
  → 校验账号所在租户 status=ACTIVE（若有归属租户）
  → 生成 JWT，返回 token + 用户基本信息
```

**OAuth 2.0 SSO 登录**（预留，Phase 2 实现）：
```
GET /api/v1/auth/oauth2/callback?code=xxx
  → 用 code 换取 accessToken（调用企业 SSO）
  → 获取用户信息，匹配系统账号
  → 生成 JWT，返回 token
```

---

## 6. 租户数据隔离设计

**隔离层次**：Service 层实现，SecurityUtils 提供上下文，不信任前端传参。

### 6.1 数据过滤规则

```java
// 通用数据范围过滤器（在 ServiceImpl 中调用）
public class DataScopeFilter {

    public static void apply(LambdaQueryWrapper<?> wrapper, 
                              Function<?, String> tenantIdGetter,
                              Function<?, String> deptIdGetter) {
        String role = SecurityUtils.getCurrentRole();
        String tenantId = SecurityUtils.getCurrentTenantId();
        String deptId = SecurityUtils.getCurrentDeptId();

        if (SecurityUtils.isSuperAdmin()) {
            // 全局查询，不加过滤
            return;
        }
        // 租户管理员 / 租户级员工：过滤本租户
        wrapper.eq(tenantIdGetter, tenantId);
        
        // 部门级员工：额外过滤本部门
        if (RoleEnum.MEMBER.name().equals(role) && deptId != null) {
            wrapper.eq(deptIdGetter, deptId);
        }
    }
}
```

### 6.2 视角切换（超级管理员 / 租户管理员）

超级管理员可切换到某租户视角，租户管理员可切换到某部门视角。

实现方案：**请求头 `X-View-Tenant-Id` 和 `X-View-Dept-Id`**

- `JwtAuthenticationFilter` 读取这两个请求头
- 验证：超级管理员才能传 `X-View-Tenant-Id`；租户管理员只能传本租户下的 `X-View-Dept-Id`
- 写入 SecurityContext，Service 层通过 `SecurityUtils.getEffectiveTenantId()` 获取生效的 tenantId

### 6.3 写操作权限校验

- 租户管理员写部门、账号关联：Service 层校验 `targetTenantId == currentTenantId`
- 员工创建调度任务：`tenantId` / `deptId` 强制设为当前用户的归属，不接受前端传参

---

## 7. 影刀 API 对接设计

### 7.1 Token 机制说明（影刀官方规则）

影刀 RPA 开放 API 使用 `accessKeyId` / `accessKeySecret` 换取临时 `accessToken`，规则如下：

| 规则 | 说明 |
|---|---|
| 获取接口 | `GET https://api.yingdao.com/oapi/token/v2/token/create?accessKeyId=xxx&accessKeySecret=xxx` |
| 最大有效期 | 2 小时（≤ 7200 秒） |
| 未过期重复请求 | 返回**同一个** token（幂等，不产生新 token） |
| 已过期再请求 | 返回**新** token |
| 缓存 TTL | **严格使用响应的 `expiresIn` 字段（秒），不得自定义**，否则本地缓存有效期与影刀侧不一致 |
| 使用方式 | 所有接口 Header：`Authorization: Bearer ${accessToken}` |
| 状态码 | `200` 正常 · `401` 未授权 · `400` 参数错误 · `429` 限流 |

**获取 Token 响应示例：**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "accessToken": "520da9c9-694d-4b40-9332-0c179243c88e",
    "expiresIn": 7199
  }
}
```

### 7.2 Token 管理（XybotTokenManager）

**凭据（accessKeyId / accessKeySecret）** 来自 `application.yml`，**不存数据库**。  
**accessToken** 缓存在内存（AtomicReference），基于 `expiresIn` 懒刷新，无固定定时器。

**刷新策略**：每次调用 `getValidToken()` 前检查缓存是否有效（提前 60 秒视为即将过期），过期时才请求新 token；并发场景用 synchronized + 双重检查防止重复刷新。

```java
@Component
public class XybotTokenManager {

    @Value("${xybot.api.access-key-id}")
    private String accessKeyId;

    @Value("${xybot.api.access-key-secret}")
    private String accessKeySecret;

    private final WebClient webClient;   // baseUrl = xybot.api.base-url，由 WebClientConfig 注入

    private final AtomicReference<String>        tokenRef    = new AtomicReference<>();
    private final AtomicReference<LocalDateTime> expireAtRef = new AtomicReference<>();

    @PostConstruct
    public void init() { refresh(); }

    public String getValidToken() {
        if (isTokenValid()) return tokenRef.get();
        refresh();
        return tokenRef.get();
    }

    private boolean isTokenValid() {
        String token    = tokenRef.get();
        LocalDateTime e = expireAtRef.get();
        return token != null && e != null
            && LocalDateTime.now().isBefore(e.minusSeconds(60));
    }

    private synchronized void refresh() {
        if (isTokenValid()) return;   // 双重检查，防止并发多次刷新

        XybotTokenResponse resp = webClient.get()
            .uri(b -> b.path("/oapi/token/v2/token/create")
                       .queryParam("accessKeyId",     accessKeyId)
                       .queryParam("accessKeySecret", accessKeySecret)
                       .build())
            .retrieve()
            .bodyToMono(XybotTokenResponse.class)
            .block();

        if (resp == null || !Boolean.TRUE.equals(resp.getSuccess())) {
            throw new BizException(BizCode.XYBOT_TOKEN_FAILED, "影刀 Token 获取失败");
        }
        // 严格使用影刀返回的 expiresIn，不自定义缓存时间
        tokenRef.set(resp.getData().getAccessToken());
        expireAtRef.set(LocalDateTime.now().plusSeconds(resp.getData().getExpiresIn()));
    }
}
```

**DTO（rpa-console-biz 模块 `xybot/dto/`）：**
```java
@Data
public class XybotTokenResponse {
    private Integer code;
    private Boolean success;
    private TokenData data;

    @Data
    public static class TokenData {
        private String accessToken;
        private Long   expiresIn;   // 单位：秒，严格按此值缓存
    }
}
```

### 7.3 XybotApiClient 封装

```java
@Component
public class XybotApiClient {
    private final WebClient          webClient;
    private final XybotTokenManager  tokenManager;

    private <T extends WebClient.RequestHeadersSpec<T>> T withAuth(T spec) {
        return spec.header("Authorization", "Bearer " + tokenManager.getValidToken());
    }

    public Mono<XybotUserListResponse>   getUserList()                      { ... }
    public Mono<XybotRobotListResponse>  getRobotList()                     { ... }
    public Mono<XybotRobotGroupResponse> getRobotGroupList()                { ... }
    public Mono<XybotJobStartResponse>   startJob(XybotJobStartRequest req) { ... }
    public Mono<XybotJobQueryResponse>   queryJob(String jobUuid)           { ... }
    public Mono<Void>                    stopJob(String jobUuid)             { ... }
    public Mono<Void>                    retryJob(String jobUuid)            { ... }
    public Mono<XybotFileUploadResponse> uploadFile(MultipartFile file)     { ... }
}
```

### 7.4 配置文件分层

```yaml
# application.yml（公共，仅 base-url 固定）
xybot:
  api:
    base-url: https://api.yingdao.com

# application-test.yml（测试环境明文，已在 .gitignore 忽略提交风险请评估）
xybot:
  api:
    access-key-id: VHjPeqAmz9Xda5bg@platform
    access-key-secret: YOUR_ACCESS_KEY_SECRET

# application-prod.yml（生产环境，全部走环境变量）
xybot:
  api:
    access-key-id: ${XYBOT_ACCESS_KEY_ID}
    access-key-secret: ${XYBOT_ACCESS_KEY_SECRET}
```

> **凭据来源**：由企业管理员在影刀控制台「API 配置」界面生成，每套对接系统建议创建独立密钥对。

---

## 8. 数据同步设计

### 8.1 同步频率

| 资源 | 触发方式 | 频率 |
|---|---|---|
| 账号 | 定时 + 手动 | 每小时（`@Scheduled(fixedDelay = 3600000)`） |
| RPA 应用 + 参数 | 定时 + 手动 | 每小时 |
| 机器人列表 + 心跳 | 定时 + 手动 | 每 5 分钟（`@Scheduled(fixedDelay = 300000)`） |
| 机器人分组 | 定时 | 每小时 |

### 8.2 同步幂等策略（Upsert）

```java
// 以账号同步为例
public void syncAccounts() {
    List<XybotUser> users = xybotApiClient.getUserList().block();
    for (XybotUser user : users) {
        AccountEntity existing = accountMapper.selectOne(
            Wrappers.lambdaQuery(AccountEntity.class)
                .eq(AccountEntity::getXybotUserUuid, user.getUserUuid())
        );
        if (existing == null) {
            // 新增：设置默认 console_role = MEMBER，不关联租户/部门
            accountMapper.insert(buildNewAccount(user));
        } else {
            // 更新：只更新影刀侧字段，不覆盖 tenant_id / dept_id / console_role
            existing.setName(user.getName());
            existing.setPhone(user.getPhone());
            existing.setXybotRole(user.getRole());
            existing.setSyncedAt(LocalDateTime.now());
            accountMapper.updateById(existing);
        }
    }
    // 更新最后同步时间
    updateLastSyncTime("last_sync_account");
}
```

### 8.3 手动同步接口

手动同步与定时同步共用同一业务方法，接口层直接调用：

```
POST /api/v1/accounts/sync
  → accountService.syncAccounts()
  → 返回 {"synced": N}
```

**并发保护**：使用 DB 锁防止重复触发
```java
// 用 system_config 实现简单互斥
try {
    if (!tryLock("sync_account_lock")) {
        throw new BizException(BizCode.SYNC_IN_PROGRESS, "同步进行中，请稍后重试");
    }
    syncAccounts();
} finally {
    releaseLock("sync_account_lock");
}
```

---

## 9. 调度执行设计

### 9.1 触发执行流程

```
用户点击"立即触发"
  → 前端展示确认弹窗（含当前参数，可临时修改）
  → 用户确认
  → POST /api/v1/schedule-tasks/{taskId}/trigger {params?, idempotentUuid}
  
后端：
  → 校验 idempotentUuid 未重复（task_execution.idempotent_uuid 唯一索引）
  → 读取 ScheduleTask，合并临时参数
  → 调用 XybotApiClient.startJob()
      入参：robotUuid = task.app_uuid
            accountName 或 robotClientGroupUuid（机器人）
            params[], priority, runTimeout, enableCloudLog, callbackUrl 等
  → 创建 TaskExecution 记录（status=RUNNING, xybot_job_uuid=返回的 jobUuid）
  → 返回 execution_id
```

### 9.2 定时调度触发（Cron）

```java
// SyncScheduler 中，每分钟扫描待触发的 cron 任务
@Scheduled(fixedDelay = 60000)
public void triggerCronTasks() {
    List<ScheduleTaskEntity> tasks = scheduleTaskMapper.selectPendingCronTasks(
        LocalDateTime.now()  // 查找 schedule_type=CRON、status=ENABLED、
                              // valid_from <= now <= valid_to 的任务
    );
    for (ScheduleTaskEntity task : tasks) {
        if (CronUtils.isTimeToFire(task.getCronExpr())) {
            taskExecutionService.triggerTask(task, TriggerTypeEnum.SCHEDULED, "system");
        }
    }
}
```

### 9.3 执行状态更新（双机制）

**机制 1 — 影刀回调（推荐）**：
```
影刀 POST {callbackUrl}/api/v1/task-executions/callback
  Body: {jobUuid, status, startTime, endTime, outputParams, cloudLogUrl, ...}
  → 鉴权：校验请求头 X-Xybot-Signature（共享密钥 HMAC）
  → 查找 TaskExecution by xybot_job_uuid
  → 更新 status, finished_at, duration_seconds, output_params_snapshot, cloud_log_url 等
```

**机制 2 — 前端轮询（兜底）**：
- 前端每 5 秒调用 `GET /api/v1/task-executions/{executionId}`
- 若 status 仍为 RUNNING，继续轮询
- 超时保护：若 `triggered_at` 超过 4 小时，后端定时任务将 RUNNING 状态更新为 TIMEOUT

**超时保护定时任务**：
```java
@Scheduled(fixedDelay = 300000) // 每 5 分钟检查
public void checkExecutionTimeout() {
    LocalDateTime threshold = LocalDateTime.now().minusHours(4);
    taskExecutionMapper.update(null,
        Wrappers.lambdaUpdate(TaskExecutionEntity.class)
            .set(TaskExecutionEntity::getStatus, ExecutionStatusEnum.TIMEOUT)
            .eq(TaskExecutionEntity::getStatus, ExecutionStatusEnum.RUNNING)
            .lt(TaskExecutionEntity::getTriggeredAt, threshold)
    );
}
```

---

## 9.4 排班看板数据查询（历史执行 + 未来预排槽）

`GET /api/v1/schedule-board` 返回两类数据合并的时间段列表，以支持 Gantt 图上的虚线"预排槽"：

```
历史/当前执行槽：
  SELECT task_execution WHERE robot_id IN (scope) AND triggered_at >= day_start AND triggered_at < day_end
  → slotType = EXECUTION

未来预排槽（当天剩余时间窗口）：
  SELECT schedule_task WHERE status = ENABLED AND schedule_type = CRON AND 机器人在 scope 内
  → 解析 cron_expr，计算当天剩余触发时间点
  → estimatedDurationMinutes = 该任务最近 10 次执行的平均时长（兜底：0）
  → slotType = SCHEDULED_SLOT，startedAt = 预计触发时间
```

两类结果统一包装为 `BoardExecutionVO`，按 robot 分组返回。

### 9.5 RobotVO.currentAppName 推导

`currentAppName` 不存储在 `robot` 表中，在查询机器人列表/详情时通过子查询推导：

```sql
SELECT app_name FROM task_execution
WHERE robot_id = #{robotId} AND status = 'RUNNING'
ORDER BY triggered_at DESC LIMIT 1
```

ServiceImpl 中批量查询时可用 `IN (robotIds)` 结合 GROUP BY 优化，避免 N+1。

---

## 10. API 设计概览

完整接口规范见 `api-contract.yaml`（OpenAPI 3.0）。

### 统一响应格式

```json
// 成功
{ "code": 0, "message": "操作成功", "data": {} }

// 失败
{ "code": 10001, "message": "租户名称已存在", "data": null }

// 分页列表
{
  "code": 0, "message": "操作成功",
  "data": {
    "records": [...],
    "total": 100,
    "current": 1,
    "size": 20
  }
}
```

### 接口清单

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| **认证** | POST | `/api/v1/auth/login` | 登录 |
| | POST | `/api/v1/auth/logout` | 登出 |
| | GET | `/api/v1/auth/me` | 当前用户信息 |
| **租户** | GET | `/api/v1/tenants` | 列表（超级管理员） |
| | POST | `/api/v1/tenants` | 新建 |
| | GET | `/api/v1/tenants/{tenantId}` | 详情 |
| | PUT | `/api/v1/tenants/{tenantId}` | 编辑 |
| | PATCH | `/api/v1/tenants/{tenantId}/status` | 启用/停用 |
| **部门** | GET | `/api/v1/tenants/{tenantId}/departments` | 列表 |
| | POST | `/api/v1/tenants/{tenantId}/departments` | 新建 |
| | PUT | `/api/v1/departments/{deptId}` | 编辑 |
| | DELETE | `/api/v1/departments/{deptId}` | 删除 |
| **账号** | GET | `/api/v1/accounts` | 列表 |
| | GET | `/api/v1/accounts/{accountId}` | 详情 |
| | POST | `/api/v1/accounts/sync` | 手动同步 |
| | PUT | `/api/v1/accounts/{accountId}/tenant` | 关联租户 |
| | PUT | `/api/v1/accounts/{accountId}/department` | 分配部门 |
| | PUT | `/api/v1/accounts/{accountId}/role` | 设置角色 |
| **RPA 应用** | GET | `/api/v1/rpa-apps` | 列表 |
| | POST | `/api/v1/rpa-apps/sync` | 手动同步 |
| | GET | `/api/v1/rpa-apps/{appId}` | 详情（含参数） |
| | POST | `/api/v1/rpa-apps/{appId}/tenant-mappings` | 关联租户/部门 |
| | DELETE | `/api/v1/rpa-apps/tenant-mappings/{mappingId}` | 解除关联 |
| **机器人** | GET | `/api/v1/robots` | 列表 |
| | GET | `/api/v1/robots/{robotId}` | 详情 |
| | POST | `/api/v1/robots/sync` | 手动同步 |
| | GET | `/api/v1/robot-groups` | 分组列表 |
| **标签** | GET | `/api/v1/tags` | 列表 |
| | POST | `/api/v1/tags` | 新建 |
| | PUT | `/api/v1/tags/{tagId}` | 编辑 |
| | DELETE | `/api/v1/tags/{tagId}` | 删除 |
| | PUT | `/api/v1/resource-tags` | 设置资源标签 |
| | PUT | `/api/v1/resource-tags/batch` | 批量设置标签 |
| **调度任务** | GET | `/api/v1/schedule-tasks` | 列表 |
| | POST | `/api/v1/schedule-tasks` | 新建 |
| | GET | `/api/v1/schedule-tasks/{taskId}` | 详情 |
| | PUT | `/api/v1/schedule-tasks/{taskId}` | 编辑 |
| | DELETE | `/api/v1/schedule-tasks/{taskId}` | 删除 |
| | PATCH | `/api/v1/schedule-tasks/{taskId}/status` | 启用/停用 |
| | POST | `/api/v1/schedule-tasks/{taskId}/trigger` | 立即触发 |
| **执行记录** | GET | `/api/v1/task-executions` | 列表 |
| | GET | `/api/v1/task-executions/{executionId}` | 详情 |
| | POST | `/api/v1/task-executions/{executionId}/stop` | 停止 |
| | POST | `/api/v1/task-executions/{executionId}/retry` | 重试 |
| | POST | `/api/v1/task-executions/callback` | 影刀回调（无需认证） |
| **排班看板** | GET | `/api/v1/schedule-board` | 看板数据 |
| **数据概览** | GET | `/api/v1/dashboard/stats` | 指标卡片 |
| | GET | `/api/v1/dashboard/execution-trend` | 执行趋势 |
| | GET | `/api/v1/dashboard/app-ranking` | 应用排行 |
| | GET | `/api/v1/dashboard/robot-utilization` | 机器人利用率 |
| | GET | `/api/v1/dashboard/tag-stats` | 标签统计 |
| **文件** | POST | `/api/v1/files/upload` | 上传文件（转发至影刀） |

---

## 11. 错误码定义

| 错误码 | HTTP 状态 | 说明 |
|---|---|---|
| `0` | 200 | 成功 |
| `40100` | 401 | 未认证（Token 无效或过期） |
| `40300` | 403 | 无权限 |
| `40400` | 404 | 资源不存在 |
| `40900` | 409 | 资源冲突（如名称重复） |
| `10001` | 400 | 租户名称已存在 |
| `10002` | 400 | 部门名称已存在（同租户内） |
| `10003` | 400 | 账号不存在 |
| `10004` | 400 | 账号已停用 |
| `10005` | 400 | 部门下存在账号，无法删除 |
| `10006` | 400 | 应用已关联到该租户/部门 |
| `10007` | 400 | 调度任务已停用 |
| `10008` | 400 | 执行记录状态不允许此操作 |
| `10009` | 400 | 同步进行中，请稍后重试 |
| `10010` | 400 | 幂等 UUID 重复，请求已提交 |
| `20001` | 502 | 影刀 API 调用失败 |
| `20002` | 502 | 影刀 Token 获取失败 |
| `50000` | 500 | 服务内部错误 |

---

## 12. 部署架构

### 12.1 容器化部署（Docker）

```
                    ┌─────────────────────────────────┐
                    │           企业内网                │
                    │                                  │
  用户浏览器  ──────► Nginx (80/443)                    │
                    │    ├── / → rpa-console-ui        │
                    │    └── /api → rpa-console-start  │
                    │                                  │
                    │  rpa-console-start (8080)         │
                    │         │                        │
                    │         ├── MySQL (3306)          │
                    │         └── 影刀 RPA API（外网）  │
                    └─────────────────────────────────┘
```

### 12.2 YAML 配置文件结构

配置文件分三个层次，存放在 `rpa-console-start/src/main/resources/`：

```
application.yml          ← 公共配置（框架、MyBatis-Plus、日志）
application-test.yml     ← 测试环境（本地数据库，明文配置）
application-prod.yml     ← 生产环境（全部使用环境变量）
```

**启动时切换 profile**：
```bash
# 测试环境（默认）
java -jar rpa-console.jar

# 生产环境
java -jar rpa-console.jar --spring.profiles.active=prod
```

详细配置内容见各 YAML 文件（已在 `rpa-console-start/src/main/resources/` 下创建）。

### 12.3 数据库初始化

项目首次部署执行 `schema.sql`（含所有建表语句和初始数据）。后续变更通过版本化 SQL 脚本手动执行。

### 12.4 性能目标

| 指标 | 目标值 | 措施 |
|---|---|---|
| 列表查询响应 | ≤ 1 秒（10 万条内） | 关键字段建索引，避免 SELECT * |
| 调度触发响应 | ≤ 3 秒 | 异步写执行记录，影刀 API 超时 5 秒 |
| 并发用户数 | 200 | JDK 21 Virtual Threads，连接池 50 |
| 首屏加载 | ≤ 3 秒 | Vite 打包分割，Nginx gzip |
