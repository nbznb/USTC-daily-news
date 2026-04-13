[English](README.md) | [**中文**](README.zh-CN.md)

# USTC Daily News

一个 AI 驱动的日报项目，用于跟踪中科大官方信息、院系动态、就业信息，以及精选科技和研究动态，并将其整理成简洁摘要。

## 你会得到什么

每日或每周摘要，包含：

- 中科大官方新闻与通知
- 已选院系的动态与公告
- 校园就业与招聘信息
- 公开科技与研究资讯源的精选内容
- 所有原始链接
- 英文、中文或双语输出

## 架构说明

- `config/default-sources.json`：定义所有数据源，包括院系官网和就业信息网
- `config/config-schema.json`：定义用户配置结构，包括 `selectedDepartments`
- `scripts/generate-feed.js`：抓取数据源、筛选候选内容、写出 feeds，并可生成校验报告
- `scripts/prepare-digest.js`：读取 feeds、按配置过滤院系内容，并整理给 LLM；科技与研究内容统一走 `tech` 分支
- `scripts/deliver.js`：负责 stdout、Telegram 或邮件投递
- `prompts/`：控制摘要风格和章节顺序，包括统一 `tech` 分支的摘要风格
- `.github/workflows/generate-feed.yml`：定时刷新 feed

## 院系选择

在 `~/.openclaw/ustc-daily-news/config.json` 中配置：

```json
{
  "selectedDepartments": ["少年班学院"]
}
```

- 默认只推送 1 个院系：`少年班学院`
- 可以手动添加多个院系名称
- 摘要生成阶段只会注入所选院系的内容

## 校验命令

```bash
cd scripts && npm run validate-sources
```

执行后会在项目根目录生成 `source-validation-report.json`。

## 发行打包

如需整理一个干净的版本目录，可执行：

```bash
cd scripts && npm run package-release -- --name v1.0.0
```

命令会在项目根目录生成 `versions/<name>/`，并排除 `.git`、`scripts/node_modules`、`feed-*.json`、`state-feed.json`、`source-validation-report.json` 以及常见临时文件。

## OpenClaw 安装

1. 执行 `./install.sh`。
2. 安装脚本会把运行时复制到 `~/.openclaw/ustc-daily-news/app`，把 OpenClaw skill 安装到 `~/.openclaw/skills/ustc-daily-news`，创建默认的 `~/.openclaw/ustc-daily-news/config.json`，并安装命令 `~/.openclaw/ustc-daily-news/bin/ustc-daily-news`。
3. 用 `openclaw skills info ustc-daily-news` 确认 OpenClaw 已识别该 skill。
4. 检查并按需修改 `~/.openclaw/ustc-daily-news/config.json`，例如 `language`、`frequency`、`selectedDepartments` 和投递方式。
5. 如需 Telegram 或邮件投递，请把相应密钥写入 `~/.openclaw/ustc-daily-news/.env`。
6. 执行 `~/.openclaw/ustc-daily-news/bin/ustc-daily-news prepare-digest`。现在每次运行都会优先尝试本地刷新 `generate-feed`，若刷新失败，再回退到已有本地 feed 或 GitHub feed 快照。


## 系统要求

- OpenClaw CLI
- Node.js 20+
- 可访问外部网络

## 许可证

MIT
