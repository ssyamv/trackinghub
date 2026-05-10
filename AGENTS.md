## 项目语言约定

- 项目内面向用户、产品、运营、管理后台的文案默认使用中文。
- 产品设计、实施计划、README、提交说明和交付总结默认使用中文，除非引用外部 API、代码标识、数据库字段或第三方专有名词。
- SDK API、事件字段、数据库表字段、测试 fixture 中的协议字段保持英文，避免破坏跨端集成契约。

## Image Generation Rule

- When the user asks to generate, regenerate, replace, or visually modify an image/diagram using image generation, use `imagegen`.
- Do not manually patch that image/diagram with local drawing scripts, PIL, SVG rewrites, or ad hoc image edits unless the user explicitly asks for a manual/vector/code-native edit.

## Figma Rule

- 以后读取 Figma 链接时，优先调用本地 Figma MCP；只有本地 MCP 不可用或信息不足时，再考虑其他方式。
