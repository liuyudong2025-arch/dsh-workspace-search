# Workspace Command Center for DeepSeek Harness

A Codex-style workspace surface for DeepSeek Harness. The plugin adds a full-screen file opener and a unified search panel while continuing to use Harness-native sessions, commands and resource navigation.

## Features

- Full-screen file window with tabs, lazy workspace tree, filtering, text line numbers and image preview.
- Unified search across **Actions / Chats / Files / Text**, with grouped results and keyboard navigation.
- Real Harness action candidates; choosing one inserts its slash command into the composer.
- Real workspace-scoped Harness chat search; choosing a result opens that session.
- File-name and bounded full-text search with `*.ts, *.md`-style type filters.
- Text matches open the built-in preview at the exact line; files can also be opened in Harness's native resource viewer.
- Right-sidebar workspace explorer.
- `Ctrl+P` quick file search, `Ctrl+Shift+F` text search, and `Ctrl+O` file window.
- Responsive dark UI matching the Codex file and search surfaces.

Search and previews run on the Host against the calling session's working directory. Paths are containment-checked, and traversal skips dependency trees, repositories, virtual environments, common build output and oversized/binary files. File counts, result counts, preview bytes and wall time are bounded.

## Install

```bash
npm install @kk2007/dsh-workspace-search
```

The package includes this Harness bundle patch:

```yaml
- insert:
    - id: workspace-search
      name: '@kk2007/dsh-workspace-search'
      config: {}
```

Restart DeepSeek Harness after installing or updating the plugin.

## Configuration

```yaml
config:
  maxFiles: 12000           # files inspected by one fallback search
  maxMatches: 400           # text matches returned in total
  maxMatchesPerFile: 50     # text matches returned per file
  maxFileBytes: 1500000     # larger files skipped by text search
  budgetMs: 20000           # wall-clock search budget
  maxFileResults: 500       # file-name results
  maxDirectoryEntries: 2000 # entries in one expanded folder
  maxPreviewBytes: 4000000  # bytes returned by built-in preview
  maxChatResults: 50        # workspace chat results
```

---

# DeepSeek Harness 工作区命令中心

这个插件把 Codex 风格的文件与统一搜索体验带到 DeepSeek Harness，同时复用 Harness 自己的会话、命令和资源查看能力。

## 功能

- 全屏文件窗口：多标签、懒加载目录树、文件筛选、文本行号、图片预览。
- 统一搜索：**全部 / 操作 / 聊天 / 文件 / 文本**，支持分组结果和键盘上下选择。
- 操作来自 Harness 的真实命令候选，选中后写入输入框。
- 聊天来自当前工作区的真实 Harness 会话，选中后直接切换会话。
- 文件名、文件类型和全文搜索；文本命中精确定位到行。
- 可在插件预览和 Harness 原生资源查看器之间切换。
- 右侧工作区文件树。
- 快捷键：`Ctrl+P` 搜索文件，`Ctrl+Shift+F` 搜索文本，`Ctrl+O` 打开文件窗口。
- 响应式深色界面，布局和交互接近 Codex 的文件窗口与搜索面板。

搜索和预览都在宿主机上针对当前会话工作目录执行。所有路径都会做工作区边界校验，并跳过依赖目录、版本库、虚拟环境、常见构建产物、二进制和超大文件；文件数、结果数、预览大小和执行时间都有上限。

安装或更新后请重启 DeepSeek Harness。

## License

MIT
