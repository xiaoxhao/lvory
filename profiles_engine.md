# 配置映射引擎设计原型 - Alpha

注：该文档仅适用于开发流程参考，用户无需且不该关心这部分设计

## 1. 概述

配置映射引擎是一个用于解析和映射不同配置格式之间关系的引擎。该系统允许用户通过简化的配置语法来管理复杂的目标配置文件，无需直接操作深层嵌套的JSON结构。系统支持路径自动创建，意味着当目标路径不存在时，会自动创建必要的结构以确保配置正确应用。

## 2. 核心概念

### 2.1 基本术语

- **用户配置**：简化的配置结构，用户直接操作的配置项
- **目标配置**：完整的配置文件，通常结构复杂且具有深层嵌套
- **映射关系**：描述用户配置与目标配置之间对应关系的规则集
- **路径表达式**：用于定位配置中特定元素的表达式语法

### 2.2 路径表达式语法

路径表达式用于精确定位配置中的元素，支持以下语法：

1. **点表示法**：使用点号访问嵌套属性
   - 示例：`dns.servers.address`

2. **数组索引**：使用方括号和索引访问数组元素
   - 示例：`inbounds[0].listen_port`

3. **条件筛选**：使用属性条件筛选特定元素
   - 示例：`outbounds.[type=shadowsocks]`
   - 通配符：`outbounds.[type=*]` 表示任意类型

4. **变量替换**：使用花括号引用其他配置值
   - 示例：`route.rules.[domain={custom_rule.domain}]`

5. **通配符映射**：处理数组中的所有元素
   - 示例：`nodes[*]` 映射到 `outbounds.[type={nodes[*].protocol}]`

## 3. 映射定义结构

映射定义采用JSON格式，描述用户配置与目标配置之间的对应关系：

```json
{
  "mappings": [
    {
      "user_path": "settings.proxy_port",
      "target_path": "inbounds.[type=mixed].listen_port",
      "type": "number",
      "default": 12345,
      "description": "代理服务器端口"
    },
    {
      "user_path": "nodes[*]",
      "target_path": "outbounds.[type={nodes[*].protocol}]",
      "transform": "template",
      "template": {
        "type": "{nodes[*].protocol}",
        "tag": "{nodes[*].name}",
        "server": "{nodes[*].server}",
        "server_port": "{nodes[*].port}"
      },
      "description": "节点信息映射"
    }
  ]
}
```

### 3.1 映射项字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| user_path | 字符串 | 用户配置中的路径表达式 |
| target_path | 字符串 | 目标配置中的路径表达式 |
| type | 字符串 | 数据类型（string, number, boolean, object, array） |
| default | 任意 | 当用户配置中不存在该项时使用的默认值 |
| description | 字符串 | 该映射项的描述信息 |
| transform | 字符串 | 转换方式（direct, template, function） |
| template | 对象 | 当 transform 为 template 时使用的模板定义 |
| function | 字符串 | 当 transform 为 function 时调用的函数名 |
| dependencies | 数组 | 定义字段之间依赖关系 |
| conflict_strategy | 字符串 | 冲突解决策略（override, merge, error, priority），默认为override |

## 4. 实现步骤

### 4.1 路径解析器实现

1. **路径标记化**：将路径表达式分解为标记序列
   ```
   "inbounds.[type=mixed].listen_port" => ["inbounds", "[type=mixed]", "listen_port"]
   ```

2. **条件解析**：解析路径中的条件表达式
   ```
   "[type=mixed]" => { field: "type", operator: "=", value: "mixed" }
   ```

3. **变量替换**：处理路径中的变量引用
   ```
   "outbounds.[type={nodes[0].protocol}]" => 替换{nodes[0].protocol}为实际值
   ```

### 4.2 (WIP) 配置访问实现

1. **深层访问**：根据路径表达式访问深层嵌套配置
   ```javascript
   function getValueByPath(config, path) {
     // 实现路径表达式的解析和值访问
   }
   ```

2. **条件元素查找**：在数组中查找满足条件的元素
   ```javascript
   function findElementsByCondition(array, condition) {
     // 实现条件筛选
   }
   ```

3. **路径创建**：当路径不存在时创建必要结构
   ```javascript
   function createPath(config, path, value) {
     // 实现路径自动创建
   }
   ```

### 4.3 映射执行流程

1. **加载映射定义**：解析映射定义规则
2. **解析用户配置**：加载并解析用户配置文件
3. **解析目标配置**：加载并解析目标配置文件（如果存在）
4. **执行映射**：对每个映射项：
   - 从用户配置中获取值
   - 根据转换规则转换值
   - 检测目标路径是否存在冲突
   - 根据冲突策略处理冲突（覆盖、合并、报错或按优先级）
   - 将值应用到目标配置中
5. **输出结果**：保存更新后的目标配置，并通过内核启动

## 5. 使用示例

### 5.1 基本映射

**映射定义**:
```json
{
  "mappings": [
    {
      "user_path": "proxy.port",
      "target_path": "inbounds.[type=mixed].listen_port",
      "type": "number"
    }
  ]
}
```

**用户配置** / **开发设置定义** :
```json
{
  "proxy": {
    "port": 8080
  }
}
```

**结果**:
```json
{
  "inbounds": [
    {
      "type": "mixed",
      "listen_port": 8080
    }
  ]
}
```

### 5.2 复杂映射示例

**映射定义**:
```json
{
  "mappings": [
    {
      "user_path": "nodes[*]",
      "target_path": "outbounds.[tag={nodes[*].name}]",
      "transform": "template",
      "template": {
        "type": "{nodes[*].protocol}",
        "tag": "{nodes[*].name}",
        "server": "{nodes[*].server}",
        "server_port": "{nodes[*].port}"
      }
    }
  ]
}
```

**用户配置**:
```json
{
  "nodes": [
    {
      "name": "HK-01",
      "protocol": "shadowsocks",
      "server": "example.com",
      "port": 443
    }
  ]
}
```

**结果**:
```json
{
  "outbounds": [
    {
      "type": "shadowsocks",
      "tag": "HK-01",
      "server": "example.com",
      "server_port": 443
    }
  ]
}
```

## 6. 注意事项

1. **类型转换**：确保在映射过程中正确处理不同类型之间的转换
2. **错误处理**：优雅处理路径不存在、类型不匹配等错误情况
3. **冲突解决**：当多个映射项映射到同一目标路径时的冲突解决策略
   - **覆盖策略**：后定义的映射覆盖先定义的映射（默认行为）
   - **合并策略**：根据数据类型将多个值合并为数组或对象
   - **报错策略**：检测到冲突时抛出错误，要求用户手动解决
   - **优先级策略**：通过显式优先级设置决定哪个映射生效

   示例：当多个映射指向同一路径时的处理
   ```json
   // 映射定义
   {
     "mappings": [
       {
         "user_path": "proxy.port",
         "target_path": "inbounds[0].listen_port",
         "type": "number",
         "conflict_strategy": "override"
       },
       {
         "user_path": "settings.port",
         "target_path": "inbounds[0].listen_port",
         "type": "number",
         "conflict_strategy": "error"
       }
     ]
   }
   ```

   在上述示例中，如果用户同时设置了`proxy.port`和`settings.port`，系统将根据`conflict_strategy`发现冲突并抛出错误。

4. **关联配置处理**：处理相互关联或依赖的配置项
   - **组合映射**：将相关联的配置项组合在一个映射中处理
   - **依赖映射**：通过`dependencies`字段定义配置项间的依赖关系
   - **条件默认值**：根据其他配置项的值动态设置默认值

   示例：处理端口和监听地址这样互相关联的配置
   ```json
   // 映射定义
   {
     "mappings": [
       {
         "user_path": "proxy.port",
         "target_path": "inbounds[0].listen_port",
         "type": "number",
         "dependencies": [
           {
             "target_path": "inbounds[0].listen",
             "value": "0.0.0.0",
             "type": "string",
             "override_if_exists": false
           }
         ]
       }
     ]
   }
   ```
   
   在上述示例中，当设置`proxy.port`时，系统会自动将`inbounds[0].listen`设置为"0.0.0.0"，除非该值已存在且`override_if_exists`为false。

## 5. 扩展思路

1. **双向映射**：支持从目标配置反向映射到用户配置，例如反向映射查找节点信息
2. **变更监控**：监控配置变更并自动应用映射
3. **验证规则**：添加对映射值的验证规则
4. **插件系统**：支持自定义转换函数和验证规则 