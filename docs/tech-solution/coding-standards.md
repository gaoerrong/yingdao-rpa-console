# 编码规范

## 通用编码要求
1. 代码编写尽量简洁，易懂，易维护
2. 代码中增加必要的注释，便于后续的维护
3. 编码中遵循java最佳编写原则，严格遵守alibaba发布的java编码手册。

## Controller 入参

1. Controller 不直接堆叠大量 `@RequestParam` 参数。
2. GET 查询参数在字段变多时必须设计为 `XXParam` 对象。
3. POST / PUT / PATCH 请求体在字段变多时也必须设计为 `XXParam` 对象。
4. 所有 Controller 入参对象统一放在 `com.rpa.console.web.request` 包下。
5. 分页查询统一继承基础分页参数类，例如 `BasePageParam`，禁止每个接口重复定义 `page/size`。
6. `XXParam` 普通类统一使用 Lombok（如 `@Data`）生成 getter/setter，禁止手写样板访问器方法。

## Controller 出参

1. Controller 返回值必须是明确的泛型类型，禁止使用 `Result<?>`。
2. Controller 返回的数据对象统一定义为 `VO`，放在 `com.rpa.console.web.vo` 包下。
3. Controller 层禁止直接向外返回 `Map`、`List<Map<...>>`、原始 `Object` 结构。
4. 仅表示操作是否成功的接口，统一返回 `Result<Boolean>`，成功返回 `true`。

## Controller 依赖注入

1. Controller 中的 Service 依赖统一使用注解方式注入，优先使用 `@Resource`。
2. Controller 禁止使用构造函数注入 Service，避免与本项目 Controller 规范不一致。
3. Controller 如需注入非 Service Bean，也应保持同一风格使用注解注入，避免为少量 Bean 单独保留构造函数。

## 分层约束

1. 即使下层仍使用 `Map` 作为过渡实现，Controller 层也必须完成 `Param -> Service 入参`、`Service 结果 -> VO` 的收口。
2. 新增接口默认按 `Param + VO` 方式设计，不再接受旧的平铺参数和通配返回风格。

## Service层编码规范：
1. Service层的定义是用于编写业务逻辑的实现。不做其他的
2. 入参根据情况使用java对象XXParam的方式，尤其是参数比较多的情况，对于入参放在rpa-console-biz module的com.rpa.console.biz.param包下
3. 出参使用使用XXDTO的方式，出参放到rpa-console-biz module的com.rpa.console.biz.model包下。
4. 对于入参和出参尽量避免使用Map来传输，如果涉及到对象，则构建java对象的方式来传输
5. Service层业务逻辑必须基于真实数据库访问实现，禁止使用 `InMemoryStore`、静态集合或内存 Map 作为业务数据源。
6. Service层单元测试如需准备数据，优先使用 H2 数据库初始化表结构和测试数据，避免重新引入内存仓储实现。
7. Service层对mapper的使用，使用注入的方式，比如：

```
@Resource
private ClientPackageMapper clientPackageMapper;
```

8. Service层不要直接进行sql拼接，数据库的通用操作都是在dao层进行的。
9. Service方法参数超过3个时，必须收口为 `XXParam`，避免平铺参数传递。
10. Service层列表查询禁止先全表查询再在内存中过滤、排序、分页；必须构造 DAO 层 `XXQuery`，由 Mapper 负责条件查询和分页。
11. Service层禁止继承集中式 Mapper 支撑父类（如 `DatabaseSupport`），每个 Service 只能按自身业务需要通过 `@Resource` 注入必要 Mapper。

## dao层的编码要求：
1. 数据库实体对象使用XXDO来命名。放在rpa-console-dao模块的com.rpa.console.dao.entity包下。
2. 对于数据库层面通用操作全部放在mapper中，参考如下代码实现
3. 查询条件、排序、分页、存在性判断等与 SQL 生成相关的逻辑应下沉到 Mapper 默认方法或 Mapper XML 中，Service 只表达业务流程和权限判断。
4. Mapper 方法参数较多时，同样使用 `XXParam` 收口查询参数，禁止在 Service 中拼装 SQL 字符串或散落复杂查询条件。
5. 列表查询参数统一使用 `com.rpa.console.dao.query.XXQuery`，Query 中承载筛选条件、分页参数和权限范围字段。
6. 核心列表 Mapper 必须提供 `selectPageByQuery(Page<T>, XXQuery)` 或 `selectPageByQuery(XXQuery)` / `selectListByQuery(XXQuery)` 等语义方法，Service 不直接维护 `LambdaQueryWrapper` 细节。
7. MyBatis-Plus 分页查询必须配置 `PaginationInnerInterceptor`，确保 `selectPage` 在数据库侧分页。

```
@Mapper
public interface ClientPackageMapper extends BaseMapper<ClientPackageDO> {

    default LambdaQueryWrapper<ClientPackageDO> createLambdaQueryWrapper() {
        return Wrappers.lambdaQuery(ClientPackageDO.class);
    }

    default ClientPackageDO queryByUuid(String uuid) {
        List<ClientPackageDO> list = selectList(new PageDTO<>(1, 1),
                createLambdaQueryWrapper().eq(ClientPackageDO::getDeleted, false).eq(ClientPackageDO::getUuid, uuid)
                        .orderByDesc(ClientPackageDO::getId));
        return CollectionUtils.isEmpty(list) ? null : list.get(0);
    }
}
```

# controller层，Service层，dao层的关系
1. 依赖关系是controller->Service->dao
3. 对应的VO->DTO->DO,设计到转换的，请使用类似如下方法：

```
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper
public interface ClientPackageConvert {

    ClientPackageConvert INSTANCE = Mappers.getMapper(ClientPackageConvert.class);

    ClientPackageDO convertToPackageDOByParam(ClientPackageParam param);

    ClientPackageDO convertToPackageDOByDto(ClientPackageDTO dto);

    ClientPackageDTO convertToPackageDTO(ClientPackageDO clientPackageDO);

    List<ClientPackageDTO> convertToPackageDTOList(List<ClientPackageDO> clientPackageDOList);
}
``` 

## 其他编码要求
1. 对于DO，DTO，VO，Param，使用lombok