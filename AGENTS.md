## 项目语言约定

- 项目内面向用户、产品、运营、管理后台的文案默认使用中文。
- 产品设计、实施计划、README、提交说明和交付总结默认使用中文，除非引用外部 API、代码标识、数据库字段或第三方专有名词。
- SDK API、事件字段、数据库表字段、测试 fixture 中的协议字段保持英文，避免破坏跨端集成契约。

## Image Generation Rule

- When the user asks to generate, regenerate, replace, or visually modify an image/diagram using image generation, use `imagegen`.
- Do not manually patch that image/diagram with local drawing scripts, PIL, SVG rewrites, or ad hoc image edits unless the user explicitly asks for a manual/vector/code-native edit.

## Figma Rule

- 以后读取 Figma 链接时，优先调用本地 Figma MCP；只有本地 MCP 不可用或信息不足时，再考虑其他方式。


<!-- BEGIN OBSIDIAN-CODE-BRIDGE -->
本项目的架构设计、详细设计、决策记录和任务上下文存放在 Obsidian；Codex 的工作入口是当前代码仓库。

## Code Repo

- `/Users/chenqi/code/trackinghub`

## Obsidian Design Docs

- 尚未配置具体 Obsidian 文档路径；执行设计相关任务前，先向用户确认相关文档位置。

## Obsidian Task Context

- `/Users/chenqi/Obsidian Vault/TrackingHub/TrackingHub 待办事项.md`

## Rules

- 实现前先读取相关 Obsidian 文档。
- 默认在当前代码仓库中工作，不要把 Obsidian vault 当作 Codex 的工作目录。
- 不要在 repo 中新增架构设计、详细设计类文档，除非用户明确要求。
- 不要为了桥接流程在 Obsidian 中新建项目入口、决策记录或 Codex 工作台，除非用户明确要求。
- 代码、测试、构建、部署配置以仓库当前状态为准。
- 如果代码实现与 Obsidian 设计不一致，先指出差异，再修改代码或更新 Obsidian 决策记录。
- 需要架构图、流程图、系统图、数据流图等视觉说明时，优先使用 `imagegen`；只有用户明确要求 Mermaid 或需要可编辑文本图时才用 Mermaid。
- Obsidian 文章或笔记正文中使用图片时，先用 `lsky-pro-upload` 上传到图床，再引用远程 Markdown 图片 URL；不要把本地图片路径或 Vault 附件作为长期正文引用。
- 修改完成后说明读取或更新了哪些 Obsidian 笔记，以及改了哪些代码文件。
<!-- END OBSIDIAN-CODE-BRIDGE -->
