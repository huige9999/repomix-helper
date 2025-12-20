# Repomix Helper

Repomix Helper 是一个用于 **快速收集文件相对路径** 并 **一键执行 repomix 打包** 的 VS Code 插件。

适用场景：你在改一个业务点时，需要把相关文件路径收集起来，用 `repomix --include ... --ignore ...` 只打包关键上下文给 AI/同事/文档使用，但每次手动复制粘贴路径很费劲、还容易漏。

本插件的目标：**把“收集路径 → 拼命令 → 执行 repomix”变成几次右键 + 一条命令。**

---

## 功能特性

### 1) 右键收集 include/ignore 相对路径
在资源管理器中对文件右键：

- `Repomix: Add to Include`：加入 include 列表
- `Repomix: Add to Ignore`：加入 ignore 列表

路径会以 **相对于当前工作区（workspace folder）** 的形式保存，例如：

- `src/App.vue`
- `src/views/index.vue`

### 2) 一键执行 repomix
命令面板执行：

- `Repomix: Run`

插件会自动拼接并执行类似命令：

```bash
repomix --include "src/App.vue,src/views/index.vue" --ignore "src/views/index.vue"
````

并在 VS Code 的终端/任务输出面板中展示执行过程与结果。

### 3) 查看与清空列表

命令面板执行：

* `Repomix: Show List`：查看当前 include/ignore 列表
* `Repomix: Clear List`：清空列表

---

## 使用方式（快速上手）

1. 打开一个项目文件夹（必须是 VS Code 工作区）
2. 在左侧资源管理器中：

   * 右键相关文件 → `Repomix: Add to Include`
   * 有需要排除的文件 → `Repomix: Add to Ignore`
3. 打开命令面板（Windows/Linux：`Ctrl+Shift+P`，macOS：`Cmd+Shift+P`）
4. 运行 `Repomix: Run`

---

## 环境要求

* VS Code：建议使用较新版本
* Node.js：仅开发/构建插件时需要
* repomix：运行打包命令时需要（插件只是调用它）

> 如果你的 repomix 不是全局命令（比如你习惯用 `npx repomix`），可以在插件配置里指定。

---

## 插件配置（Extension Settings）

本插件提供以下配置项：

* `repomixHelper.repomixCommand`

  * 类型：string
  * 默认值：`repomix`
  * 说明：用于执行 repomix 的命令
    示例：

    * `repomix`
    * `npx repomix`
    * `pnpm repomix`

在 VS Code 设置中搜索 `Repomix Helper` 即可找到。

## 发布说明（Release Notes）

### 0.0.1

* 初始版本：支持收集 include/ignore 相对路径
* 支持一键执行 repomix
* 支持查看/清空列表

---

## 反馈与贡献

欢迎提交 Issue / PR：

* 建议优先描述清楚：复现步骤、期望行为、实际行为、VS Code 版本、系统环境、repomix 安装方式。
