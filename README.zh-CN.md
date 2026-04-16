[English](README.md) | [**中文**](README.zh-CN.md)

# USTC Daily News Direct

一个 AI 协作的日报版本，把数据准备拆成两条明确路径：

- `tech` 由 JavaScript 通过 RSS / Atom 直接抓取
- `official`、`departments`、`jobs` 不再由 JS 抓正文，而是输出 HTML 入口页，交给 agent / LLM 自行访问和筛选

## 你会得到什么

每日或每周摘要，包含：

- 中科大官方新闻与通知
- 已选院系的动态与公告
- 校园就业与招聘信息
- 公开科技资讯源的精选内容
- 所有原始链接
- 英文、中文或双语输出

## 架构说明

- `config/default-sources.json`：定义两类来源，USTC 侧使用 `html` 入口页，`tech` 使用 RSS 源
- `config/config-schema.json`：定义用户配置结构，包括 `selectedDepartments` 与 `allowDuplicatePush`
- `scripts/generate-feed.js`：只抓取并写出 `tech` RSS feed
- `scripts/prepare-digest.js`：输出 `tech` 条目，以及 `officialHtmlSources`、`departmentHtmlSources`、`jobHtmlSources`
- `scripts/deliver.js`：负责 stdout、Telegram 或邮件投递
- `prompts/`：明确要求 agent / LLM 自行访问 USTC HTML 入口页，而 `tech` 只能基于准备好的 RSS 条目

## 院系选择

在 `~/.openclaw/ustc-daily-news/config.json` 中配置：

```json
{
  "selectedDepartments": [],
  "allowDuplicatePush": true
}
```

- 安装后默认会把 `selectedDepartments` 留空
- 如果想关注院系动态，可以后续手动修改 `selectedDepartments`
- 如果 `selectedDepartments` 为空或未配置，`prepare-digest` 不会输出任何院系 HTML 入口
- 可以手动添加多个院系正式名称
- 摘要生成阶段只会注入所选院系的 HTML 入口
- 如果显式设置了 `selectedDepartments` 但全部不匹配，院系模块会为空，并在 `errors` 中给出提示

## 重复推送控制

在 `~/.openclaw/ustc-daily-news/config.json` 中配置：

```json
{
  "allowDuplicatePush": true
}
```

- `true`（默认）：允许 tech 条目跨运行重复推送
- `false`：基于 `state-feed.json` 对 tech 条目去重
- USTC HTML 入口不会在 JS 层去重

## `prepare-digest` 输出结构

`prepare-digest` 会输出：

- `tech`：已准备好的科技 RSS 条目
- `officialHtmlSources`：USTC 官方入口页清单
- `departmentHtmlSources`：按 `selectedDepartments` 过滤后的院系入口页清单
- `jobHtmlSources`：就业与招聘入口页清单
- `official`、`departments`、`jobs`：为兼容旧调用方保留为空数组

后续的 agent / LLM 需要自行访问这些 HTML 入口页，再决定摘要中纳入哪些 USTC 内容。

## 校验命令

```bash
cd scripts && npm run validate-sources
```

这个版本保留命令兼容性，但它只覆盖 `tech` RSS 抓取和报告生成，不校验 USTC HTML 页面。

## 发行打包

如需整理一个干净的版本目录，可执行：

```bash
cd scripts && npm run package-release -- --name v1.0.0
```

命令会在项目根目录生成 `versions/<name>/`，并排除 `.git`、`scripts/node_modules`、生成的 feed、`source-validation-report.json` 以及常见临时文件。

## OpenClaw 安装

1. 执行 `./install.sh`。
2. 安装脚本会把运行时复制到 `~/.openclaw/ustc-daily-news/app`，把 OpenClaw skill 安装到 `~/.openclaw/skills/ustc-daily-news`，创建默认的 `~/.openclaw/ustc-daily-news/config.json`，并安装命令 `~/.openclaw/ustc-daily-news/bin/ustc-daily-news`。
3. 用 `openclaw skills info ustc-daily-news` 确认 OpenClaw 已识别该 skill。
4. 安装器会直接写入一份可用的默认配置。如果想在摘要中加入院系动态，请编辑 `~/.openclaw/ustc-daily-news/config.json` 并填写 `selectedDepartments`。
5. 如需 Telegram 或邮件投递，请把相应密钥写入 `~/.openclaw/ustc-daily-news/.env`。
6. 执行 `~/.openclaw/ustc-daily-news/bin/ustc-daily-news prepare-digest`。现在每次运行都会优先尝试本地刷新 `tech` RSS；USTC 内容则作为 HTML 入口页直接传递给 agent / LLM。

## 系统要求

- OpenClaw CLI
- Node.js 20+
- 可访问外部网络

## 许可证

MIT
