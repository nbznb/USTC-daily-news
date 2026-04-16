[English](README.md) | [**中文**](README.zh-CN.md)

# USTC Daily News

一个 AI 驱动的日报项目，用于跟踪中科大官方信息、院系动态、就业信息，以及精选科技动态，并将其整理成简洁摘要。

## 你会得到什么

每日或每周摘要，包含：

- 中科大官方新闻与通知
- 已选院系的动态与公告
- 校园就业与招聘信息
- 公开科技资讯源的精选内容
- 所有原始链接
- 英文、中文或双语输出

## 架构说明

- `config/default-sources.json`：定义所有数据源，包括院系官网和就业信息网
- `config/config-schema.json`：定义用户配置结构，包括 `selectedDepartments` 与 `allowDuplicatePush`
- `scripts/generate-feed.js`：抓取数据源、筛选候选内容、写出 feeds，并可生成校验报告
- `scripts/prepare-digest.js`：读取 feeds、按配置过滤院系内容，并整理给 LLM；科技内容统一走 `tech` 分支
- `scripts/deliver.js`：负责 stdout、Telegram 或邮件投递
- `prompts/`：控制摘要风格和章节顺序，包括统一 `tech` 分支的摘要风格
- `.github/workflows/generate-feed.yml`：定时刷新 feed

## 院系选择

在 `~/.openclaw/skills/ustc-daily-news/config.json` 中配置：

```json
{
  "selectedDepartments": [],
  "allowDuplicatePush": true
}
```

- 首次安装生成的配置会把 `selectedDepartments` 留空，并由 skill 在 onboarding 中要求用户明确院系偏好
- onboarding 会优先按当前已接入信息源匹配院系，支持常见简称或高置信模糊表达，如“少院”匹配“少年班学院”
- 只有在无匹配或存在多个候选时才会提示用户确认；匹配成功时会直接采用
- 如果 `selectedDepartments` 为空或未配置，则不会抓取任何院系源，摘要中的院系模块也会保持为空
- 可以手动添加多个院系正式名称
- 摘要生成阶段只会注入所选院系的内容
- 如果显式设置了 `selectedDepartments` 但全部不匹配，院系模块会为空，不会回退到全部院系

## 重复推送控制

在 `~/.openclaw/skills/ustc-daily-news/config.json` 中配置：

```json
{
  "allowDuplicatePush": true
}
```

- `true`（默认）：允许跨运行重复推送
- `false`：基于 `state-feed.json` 进行去重

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

命令会在项目根目录生成 `versions/<name>/`，并排除 `.git`、`scripts/node_modules`、`feed-*.json`、`source-validation-report.json` 以及常见临时文件。

## OpenClaw 安装

1. 执行 `./install.sh`。
2. 安装脚本会把完整运行时直接放到 `~/.openclaw/skills/ustc-daily-news`，其中包含 `SKILL.md`、`config/`、`prompts/`、`scripts/`、`config.json` 和 `.env`。
3. 重新安装时会完整覆盖 skill 运行时代码，但会保留 `config.json` 和 `.env`；如果仍有旧目录 `~/.openclaw/ustc-daily-news/`，也会从那里迁移这两个文件。
4. 新安装成功后，旧目录 `~/.openclaw/ustc-daily-news/` 会被自动删除。
5. 旧版自定义 `prompts/` 不会迁移；每次安装都会使用新版本自带的提示词文件。
6. 用 `openclaw skills info ustc-daily-news` 确认 OpenClaw 已识别该 skill。
7. 请检查 `~/.openclaw/skills/ustc-daily-news/config.json`，如需院系动态请填写 `selectedDepartments`。
8. 如需 Telegram 或邮件投递，请把相应密钥写入 `~/.openclaw/skills/ustc-daily-news/.env`。
9. 执行 `cd ~/.openclaw/skills/ustc-daily-news/scripts && node prepare-digest.js`。现在每次运行都会优先尝试本地刷新 `generate-feed`，若刷新失败，再回退到已有本地 feed 或 GitHub feed 快照。


## 系统要求

- OpenClaw CLI
- Node.js 20+
- 可访问外部网络

## 许可证

MIT
