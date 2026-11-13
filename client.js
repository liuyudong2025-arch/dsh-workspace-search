window.__ModuleLoader__.load({
  id: '@kk2007/dsh-workspace-search',
  factory(require) {
    const React = require('react')
    const ReactDOM = require('react-dom')
    const h = React.createElement

    const NS = 'workspaceSearch'
    const SEARCH_ROUTE = '/workspace-search.json'
    const FILES_ROUTE = '/workspace-files.json'
    const CHATS_ROUTE = '/workspace-chats.json'
    const SEARCH_TYPE_ID = 'dsh-workspace-search'
    const SEARCH_KIND = 'workspace-search'
    const EXPLORER_TYPE_ID = 'dsh-workspace-explorer'
    const EXPLORER_KIND = 'workspace-explorer'
    const DEBOUNCE_MS = 180

    const EN = {
      search: 'Search', searchFiles: 'Search files', searchText: 'Search text', searchPlaceholder: 'Search files, chats, actions, and text',
      openFile: 'Open file', openFiles: 'Open files', files: 'Files', text: 'Text', chats: 'Chats', actions: 'Actions', resources: 'Resources', all: 'All',
      typeToSearch: 'Type to search', noResults: 'No results', searching: 'Searching…', workspace: 'Workspace', fileType: 'File type',
      fileTypeHint: '*.ts', filterFiles: 'Filter files…', refresh: 'Refresh', close: 'Close', nativeOpen: 'Open in Harness viewer',
      chooseFile: 'Open file', chooseFileHint: 'Choose a file from the workspace tree', previewUnavailable: 'Preview is not available for this file',
      previewTooLarge: 'Preview truncated', copied: 'Copied to clipboard', insertFailed: 'Could not insert the command',
      versionMismatch: 'Preview service is out of date. Fully restart DeepSeek Harness to reload the plugin host.',
      resultSummary: '{files} files · {matches} text · {chats} chats · {actions} actions', recent: 'Recent',
      actionOpenFiles: 'Open files', actionOpenFilesDetail: 'Browse the workspace file tree',
      actionSearchFiles: 'Search files', actionSearchFilesDetail: 'Find a file by name or path',
      actionSearchText: 'Search text', actionSearchTextDetail: 'Search file contents in the workspace',
      binaryFile: 'Binary file', imagePreview: 'Image preview', line: 'Line {line}', untitledChat: 'Untitled chat',
    }
    const ZH = {
      search: '搜索', searchFiles: '搜索文件', searchText: '搜索文本', searchPlaceholder: '搜索文件、聊天、操作和文本',
      openFile: '打开文件', openFiles: '打开文件', files: '文件', text: '文本', chats: '聊天', actions: '操作', resources: '资料空间', all: '全部',
      typeToSearch: '输入内容以搜索', noResults: '没有结果', searching: '搜索中…', workspace: '工作区', fileType: '文件类型',
      fileTypeHint: '*.ts', filterFiles: '筛选文件…', refresh: '刷新', close: '关闭', nativeOpen: '在 Harness 查看器中打开',
      chooseFile: '打开文件', chooseFileHint: '从工作区目录树中选择文件', previewUnavailable: '该文件无法预览',
      previewTooLarge: '预览内容已截断', copied: '已复制到剪贴板', insertFailed: '无法插入命令',
      versionMismatch: '预览服务仍是旧版本，请完全退出并重新启动 DeepSeek Harness。',
      resultSummary: '{files} 个文件 · {matches} 处文本 · {chats} 个聊天 · {actions} 个操作', recent: '最近',
      actionOpenFiles: '打开文件', actionOpenFilesDetail: '浏览工作区文件树',
      actionSearchFiles: '搜索文件', actionSearchFilesDetail: '按名称或路径查找文件',
      actionSearchText: '搜索文本', actionSearchTextDetail: '搜索工作区中的文件内容',
      binaryFile: '二进制文件', imagePreview: '图片预览', line: '第 {line} 行', untitledChat: '未命名聊天',
    }

    const CSS = `
:root{--wso-bg:var(--dsw-alias-bg-base,#121212);--wso-panel:var(--dsw-alias-bg-overlay,#191919);--wso-layer:var(--dsw-alias-bg-layer-2,#242424);--wso-border:var(--dsw-alias-border-l2,#343434);--wso-border-soft:var(--dsw-alias-border-l1,#292929);--wso-text:var(--dsw-alias-label-primary,#e8e8e8);--wso-muted:var(--dsw-alias-label-secondary,#929292);--wso-brand:var(--dsw-alias-brand-primary,#7aa2ff)}
.wso-reset,.wso-reset *{box-sizing:border-box}.wso-overlay{position:fixed;inset:0;z-index:10000;color:var(--wso-text);font:13px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.wso-scrim{position:absolute;inset:0;background:rgba(0,0,0,.48);backdrop-filter:blur(2px)}
.wso-search-card{position:absolute;top:7vh;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;width:min(768px,calc(100vw - 32px));height:min(540px,80vh);border:1px solid var(--wso-border);border-radius:18px;background:var(--wso-panel);box-shadow:0 28px 90px rgba(0,0,0,.58);overflow:hidden}.wso-search-head{display:flex;align-items:center;gap:10px;height:52px;padding:0 16px;border-bottom:1px solid var(--wso-border-soft)}.wso-search-input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--wso-text);font:500 14px/1.2 inherit}.wso-search-input::placeholder,.wso-filter::placeholder{color:var(--wso-muted)}
.wso-icon-button,.wso-tool,.wso-tab,.wso-result,.wso-tree-row,.wso-plain-button{border:0;background:none;color:inherit;font:inherit;cursor:pointer}.wso-icon-button{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;color:var(--wso-muted)}.wso-icon-button:hover,.wso-result:hover,.wso-result[data-active="true"],.wso-tree-row:hover,.wso-tree-row[data-selected="true"]{background:var(--wso-layer);color:var(--wso-text)}
.wso-search-body{flex:1;min-height:0;overflow:auto;padding:10px}.wso-empty{height:100%;display:flex;align-items:center;justify-content:center;color:var(--wso-muted);font-size:15px}.wso-group{margin:2px 0 10px}.wso-group-head{display:flex;align-items:center;gap:8px;height:27px;padding:0 8px;color:var(--wso-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.055em}.wso-group-count{margin-left:auto;padding:0 7px;border-radius:10px;background:var(--wso-layer);font-variant-numeric:tabular-nums}
.wso-result{display:flex;align-items:center;gap:10px;width:100%;min-height:43px;padding:6px 9px;border-radius:9px;text-align:left}.wso-result-glyph{flex:none;display:flex;align-items:center;justify-content:center;width:22px;color:var(--wso-muted)}.wso-result-content{flex:1;min-width:0}.wso-result-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}.wso-result-detail{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--wso-muted);font-size:11px}.wso-result-side{flex:none;color:var(--wso-muted);font-size:11px}.wso-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.wso-mark{background:color-mix(in srgb,var(--wso-brand) 32%,transparent);color:inherit;border-radius:2px;padding:0 1px}
.wso-search-foot{display:flex;align-items:center;gap:10px;min-height:44px;padding:5px 11px;border-top:1px solid var(--wso-border-soft)}.wso-tabs{display:flex;gap:2px}.wso-tab{height:30px;padding:0 10px;border-radius:10px;color:var(--wso-muted)}.wso-tab[data-active="true"]{background:var(--wso-layer);color:var(--wso-text);font-weight:600}.wso-foot-spacer{flex:1}.wso-select-like{display:flex;align-items:center;gap:7px;min-width:0;height:30px;padding:0 9px;border:1px solid var(--wso-border);border-radius:9px;color:var(--wso-muted)}.wso-select-like input{width:92px;border:0;outline:0;background:transparent;color:var(--wso-text);font:inherit}.wso-select-like select{max-width:150px;border:0;outline:0;background:transparent;color:var(--wso-text);font:inherit}.wso-select-like select option{background:var(--wso-panel);color:var(--wso-text)}.wso-workspace-name{max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--wso-text)}
.wso-file-window{position:absolute;inset:0;display:flex;flex-direction:column;background:var(--wso-bg)}.wso-file-topbar{display:flex;align-items:center;height:56px;padding:0 10px;border-bottom:1px solid var(--wso-border-soft);background:var(--wso-panel)}.wso-file-tabs{display:flex;align-items:center;gap:4px;min-width:0}.wso-file-tab{display:flex;align-items:center;gap:8px;max-width:220px;height:36px;padding:0 10px;border:1px solid transparent;border-radius:10px;color:var(--wso-muted);cursor:pointer}.wso-file-tab[data-active="true"]{border-color:var(--wso-border);background:var(--wso-layer);color:var(--wso-text)}.wso-file-tab-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wso-file-plus{margin-left:4px}.wso-file-top-spacer{flex:1}.wso-root-badge{display:flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 9px;border-radius:16px;background:var(--wso-layer);font-weight:600}
.wso-file-content{display:flex;flex:1;min-height:0}.wso-preview{position:relative;display:flex;flex:1;min-width:0;min-height:0;background:var(--wso-bg)}.wso-preview-empty{margin:auto;text-align:center;color:var(--wso-muted)}.wso-preview-empty strong{display:block;margin-top:15px;color:var(--wso-text);font-size:17px}.wso-preview-empty span{display:block;margin-top:4px}.wso-preview-head{position:absolute;top:0;left:0;right:0;z-index:2;display:flex;align-items:center;height:38px;padding:0 12px;border-bottom:1px solid var(--wso-border-soft);background:color-mix(in srgb,var(--wso-bg) 94%,transparent);color:var(--wso-muted)}.wso-preview-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wso-preview-scroll{flex:1;min-width:0;min-height:0;overflow:auto;padding-top:38px}.wso-code-table{min-width:100%;border-collapse:collapse;font:12px/1.62 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.wso-code-table td{vertical-align:top}.wso-line-number{position:sticky;left:0;width:1%;padding:0 14px 0 18px;background:var(--wso-bg);color:#606060;text-align:right;user-select:none}.wso-code-line{padding-right:20px;white-space:pre}.wso-code-table tr[data-target="true"]{background:color-mix(in srgb,var(--wso-brand) 14%,transparent)}.wso-image-wrap{display:flex;align-items:center;justify-content:center;min-height:100%;padding:36px}.wso-image-wrap img{max-width:100%;max-height:calc(100vh - 130px);object-fit:contain;box-shadow:0 10px 40px rgba(0,0,0,.35)}.wso-preview-note{padding:10px 16px;border-top:1px solid var(--wso-border);color:var(--wso-muted)}
.wso-explorer{display:flex;flex-direction:column;width:310px;min-width:240px;max-width:42vw;border-left:1px solid var(--wso-border-soft);background:var(--wso-panel)}.wso-explorer-head{display:flex;align-items:center;gap:6px;padding:9px}.wso-filter{flex:1;min-width:0;height:30px;padding:0 10px;border:1px solid var(--wso-border);border-radius:10px;outline:0;background:var(--wso-bg);color:var(--wso-text);font:inherit}.wso-tree{flex:1;min-height:0;overflow:auto;padding:2px 5px 12px}.wso-tree-row{display:flex;align-items:center;gap:5px;width:100%;height:27px;padding-right:6px;border-radius:7px;text-align:left;white-space:nowrap}.wso-tree-caret{flex:none;width:12px;color:var(--wso-muted)}.wso-tree-name{overflow:hidden;text-overflow:ellipsis}.wso-tree-note{padding:9px 12px;color:var(--wso-muted)}
.wso-tool{display:inline-flex;flex:0 0 24px;align-self:center;vertical-align:middle;align-items:center;justify-content:center;width:24px;min-width:24px;height:24px;margin:0 8px 0 0;padding:0;border-radius:6px;line-height:0;outline:0!important;background:transparent!important;color:var(--dsw-alias-label-secondary,#a0a0a0)}.wso-tool>svg{display:block;flex:none}.wso-tool:hover{background:var(--dsw-alias-bg-layer-2,#2a2a2a)!important;color:var(--dsw-alias-label-primary,#e8e8e8)}.wso-tool:focus,.wso-tool:focus-visible,.wso-tool:active{outline:0!important;background:transparent!important;box-shadow:none!important}.wso-sidebar{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--wso-text)}.wso-sidebar-head{display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid var(--wso-border-soft)}.wso-sidebar-root{padding:8px 10px 5px;font-weight:600}.wso-sidebar-tree{flex:1;min-height:0;overflow:auto;padding:0 5px 10px}
@media(max-width:760px){.wso-search-card{top:3vh;height:90vh}.wso-search-foot{flex-wrap:wrap}.wso-select-like{display:none}.wso-explorer{width:42vw;min-width:180px}.wso-file-tab{max-width:150px}}
`

    const shell = {
      searchOpen: false,
      fileOpen: false,
      mode: 'all',
      fileRequest: null,
      revision: 0,
      listeners: new Set(),
    }
    function updateShell(patch) {
      Object.assign(shell, patch)
      shell.revision += 1
      for (const listener of [...shell.listeners]) listener()
    }
    function openSearch(mode = 'all') { updateShell({ searchOpen: true, mode }) }
    function closeSearch() { updateShell({ searchOpen: false }) }
    function openFileWindow() { openSearch('files') }
    function closeFileWindow() { updateShell({ fileOpen: false }) }
    function useShell() {
      const [, bump] = React.useState(0)
      React.useEffect(() => {
        const listener = () => bump((value) => value + 1)
        shell.listeners.add(listener)
        return () => shell.listeners.delete(listener)
      }, [])
      return { ...shell }
    }

    function fill(text, vars) {
      let result = String(text || '')
      for (const [key, value] of Object.entries(vars || {})) result = result.split(`{${key}}`).join(String(value))
      return result
    }
    function useLocale(ctx) {
      const [, bump] = React.useState(0)
      React.useEffect(() => {
        try { return ctx.locale.subscribe(() => bump((value) => value + 1)) } catch { return undefined }
      }, [])
    }
    function Icon({ name, size = 16 }) {
      const common = { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', 'aria-hidden': true }
      if (name === 'search') return h('svg', common, h('circle', { cx: 7, cy: 7, r: 4.5, stroke: 'currentColor', strokeWidth: 1.3 }), h('path', { d: 'M10.5 10.5 14 14', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }))
      if (name === 'toolbar-folder') return h('svg', common, h('path', { d: 'M1.25 3.25h5.1l1.45 1.7h6.95v7.55c0 .7-.55 1.25-1.25 1.25h-11c-.7 0-1.25-.55-1.25-1.25V3.25Z', stroke: 'currentColor', strokeWidth: 1.25, strokeLinejoin: 'round' }))
      if (name === 'folder') return h('svg', common, h('path', { d: 'M1.5 4.1h4.7l1.3 1.5h7v6.6a1.3 1.3 0 0 1-1.3 1.3H2.8a1.3 1.3 0 0 1-1.3-1.3V4.1Z', stroke: 'currentColor', strokeWidth: 1.15, strokeLinejoin: 'round' }))
      if (name === 'file') return h('svg', common, h('path', { d: 'M4 1.5h5l3 3v10H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z', stroke: 'currentColor', strokeWidth: 1.15 }), h('path', { d: 'M9 1.8V5h3', stroke: 'currentColor', strokeWidth: 1.15 }))
      if (name === 'chat') return h('svg', common, h('path', { d: 'M2 2.5h12v8.3H7l-3.5 2.7v-2.7H2V2.5Z', stroke: 'currentColor', strokeWidth: 1.15, strokeLinejoin: 'round' }))
      if (name === 'bolt') return h('svg', common, h('path', { d: 'm9.1 1.5-5 7H8l-1.1 6 5-7H8l1.1-6Z', stroke: 'currentColor', strokeWidth: 1.15, strokeLinejoin: 'round' }))
      if (name === 'close') return h('svg', common, h('path', { d: 'm4 4 8 8m0-8-8 8', stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round' }))
      if (name === 'panel') return h('svg', common, h('rect', { x: 1.5, y: 2, width: 13, height: 12, rx: 2, stroke: 'currentColor', strokeWidth: 1.1 }), h('path', { d: 'M10.5 2v12', stroke: 'currentColor', strokeWidth: 1.1 }))
      if (name === 'external') return h('svg', common, h('path', { d: 'M9 2h5v5m0-5L7.5 8.5', stroke: 'currentColor', strokeWidth: 1.15 }), h('path', { d: 'M12.5 9v3.5a1.5 1.5 0 0 1-1.5 1.5H3.5A1.5 1.5 0 0 1 2 12.5V5a1.5 1.5 0 0 1 1.5-1.5H7', stroke: 'currentColor', strokeWidth: 1.15 }))
      return h('span', null, '•')
    }
    function formatDate(value) {
      if (!Number.isFinite(Number(value)) || Number(value) <= 0) return ''
      try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(Number(value))) } catch { return '' }
    }
    function driveLabel(root) {
      const match = String(root || '').match(/^([A-Za-z]:)/)
      return match ? match[1] : String(root || '').split(/[\\/]/).filter(Boolean)[0] || '•'
    }
    function resourceAddress(sessionId, file) {
      const encoded = String(file || '').split(/[\\/]+/).filter(Boolean).map(encodeURIComponent).join('/')
      return `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${encoded}`
    }
    function openNativeResource(ctx, sessionId, file, line) {
      const controller = ctx.get('sidebarRight')
      if (!controller || typeof controller.openResource !== 'function' || !sessionId || !file) return false
      try {
        controller.openResource(resourceAddress(sessionId, file), line ? { params: { line } } : undefined)
        return true
      } catch {
        return false
      }
    }
    async function fetchJson(path, params, signal) {
      const url = new URL(path, window.location.origin)
      for (const [key, value] of Object.entries(params || {})) {
        if (value !== undefined && value !== null && String(value) !== '') url.searchParams.set(key, String(value))
      }
      const response = await fetch(url.toString(), { cache: 'no-store', credentials: 'same-origin', signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      if (payload.ok !== true) throw new Error((payload.error && payload.error.message) || 'Request failed')
      return payload
    }
    function rememberRecent(path) {
      if (!path) return
      try {
        const old = JSON.parse(localStorage.getItem('dsh-workspace-search.recent') || '[]')
        localStorage.setItem('dsh-workspace-search.recent', JSON.stringify([path, ...old.filter((value) => value !== path)].slice(0, 30)))
      } catch { /* optional persistence */ }
    }
    function sessionListSnapshot(ctx) {
      const sessions = ctx.get('sessions')
      const list = sessions && sessions.list
      return list && typeof list.getSnapshot === 'function' ? list.getSnapshot() : { ids: [], byId: {} }
    }
    async function loadChatResults(ctx, root, query, signal) {
      const sessions = ctx.get('sessions')
      if (!sessions) return { chats: [] }
      const snapshot = sessionListSnapshot(ctx)
      const sameRoot = (value) => !root || String(value || '').toLocaleLowerCase() === String(root).toLocaleLowerCase()
      let matches
      if (query) {
        const result = await sessions.search(query, signal)
        if (!result || result.ok !== true) throw new Error('Harness session search failed')
        matches = (result.value.items || []).map((hit) => ({ summary: snapshot.byId[hit.sessionId], snippet: hit.snippet }))
      } else {
        matches = (snapshot.ids || []).map((id) => ({ summary: snapshot.byId[id], snippet: '' }))
      }
      const chats = matches.filter((item) => item.summary && !item.summary.blank && sameRoot(item.summary.cwd)).map((item) => ({
        id: item.summary.id,
        title: item.summary.displayTitle || item.summary.title || item.summary.id,
        cwd: item.summary.cwd || '',
        createdAt: item.summary.updatedAt || 0,
        eventTime: item.summary.updatedAt || 0,
        snippet: item.snippet || '',
      })).sort((a, b) => b.createdAt - a.createdAt)
      return { chats, root, rootName: root ? root.split(/[\\/]/).filter(Boolean).pop() : '' }
    }
    function highlighted(text, query) {
      const source = String(text || '')
      const needle = String(query || '').trim()
      if (!needle) return source
      const index = source.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
      if (index < 0) return source
      return [source.slice(0, index), h('mark', { key: 'match', className: 'wso-mark' }, source.slice(index, index + needle.length)), source.slice(index + needle.length)]
    }
    function insertCommand(inputActions, command) {
      for (const name of ['insertText', 'appendText', 'insert', 'setText']) {
        const fn = inputActions && inputActions[name]
        if (typeof fn !== 'function') continue
        try { fn(command); return true } catch { /* try the next surface */ }
      }
      return false
    }

    function useDirectoryModel(sessionId, scope) {
      const [directories, setDirectories] = React.useState({})
      const [expanded, setExpanded] = React.useState({ '': true })
      const [root, setRoot] = React.useState('')
      const [rootName, setRootName] = React.useState('')
      const load = React.useCallback(async (dir, force = false) => {
        if (!force && directories[dir] && directories[dir].status === 'ready') return
        setDirectories((old) => ({ ...old, [dir]: { status: 'loading', entries: old[dir] ? old[dir].entries : [] } }))
        try {
          const payload = await fetchJson(FILES_ROUTE, { action: 'list', dir, session: sessionId, root: scope })
          setRoot(payload.root || '')
          setRootName(payload.rootName || payload.root || '')
          setDirectories((old) => ({ ...old, [dir]: { status: 'ready', entries: payload.entries || [], truncated: payload.truncated } }))
        } catch (error) {
          setDirectories((old) => ({ ...old, [dir]: { status: 'error', entries: [], error: String(error && error.message || error) } }))
        }
      }, [directories, sessionId, scope])
      const reset = React.useCallback(() => { setDirectories({}); setExpanded({ '': true }) }, [])
      return { directories, expanded, setExpanded, root, rootName, load, reset }
    }

    function TreeRows({ model, onFile, selectedPath, t, depth = 0, dir = '' }) {
      const bucket = model.directories[dir]
      if (!bucket) return null
      const rows = []
      for (const entry of bucket.entries || []) {
        if (entry.kind === 'other') continue
        const isDirectory = entry.kind === 'directory'
        const isOpen = model.expanded[entry.path] === true
        const toggle = () => {
          if (!isDirectory) { onFile(entry); return }
          const next = !isOpen
          model.setExpanded((old) => ({ ...old, [entry.path]: next }))
          if (next) model.load(entry.path)
        }
        rows.push(h('button', {
          key: entry.path,
          type: 'button',
          className: 'wso-tree-row',
          'data-selected': selectedPath === entry.path,
          style: { paddingLeft: `${8 + depth * 14}px` },
          title: entry.path,
          onClick: toggle,
        }, h('span', { className: 'wso-tree-caret' }, isDirectory ? (isOpen ? '▾' : '▸') : ''), h(Icon, { name: isDirectory ? 'folder' : 'file', size: 14 }), h('span', { className: 'wso-tree-name' }, entry.name)))
        if (isDirectory && isOpen) {
          const child = model.directories[entry.path]
          if (child && child.status === 'loading') rows.push(h('div', { className: 'wso-tree-note', key: `${entry.path}:loading` }, t('searching')))
          else if (child && child.status === 'error') rows.push(h('div', { className: 'wso-tree-note', key: `${entry.path}:error` }, child.error))
          else rows.push(h(TreeRows, { key: `${entry.path}:children`, model, onFile, selectedPath, t, depth: depth + 1, dir: entry.path }))
        }
      }
      return rows
    }

    function FileBrowser({ ctx, sessionId, inputActions, state }) {
      const t = ctx.locale.bind(NS)
      useLocale(ctx)
      const [scope] = React.useState(() => { try { return localStorage.getItem('dsh-workspace-search.scope') || '' } catch { return '' } })
      const model = useDirectoryModel(sessionId, scope)
      const [filter, setFilter] = React.useState('')
      const [filterState, setFilterState] = React.useState({ status: 'idle', files: [] })
      const [tabs, setTabs] = React.useState([])
      const [activePath, setActivePath] = React.useState('')
      const [preview, setPreview] = React.useState({ status: 'idle' })
      const [targetLine, setTargetLine] = React.useState(0)
      const lineRefs = React.useRef(new Map())
      const requestRevision = state.revision

      React.useEffect(() => { model.load('', true) }, [sessionId, scope])
      const openEntry = React.useCallback(async (entry, line = 0) => {
        if (!entry || !entry.path) return
        const tab = { path: entry.path, name: entry.name || entry.path.split('/').pop(), file: entry.file }
        setTabs((old) => old.some((item) => item.path === tab.path) ? old : [...old, tab])
        setActivePath(tab.path)
        setTargetLine(Number(line) || 0)
        setPreview({ status: 'loading', path: tab.path, name: tab.name, file: tab.file })
        try {
          const payload = await fetchJson(FILES_ROUTE, { action: 'read', path: tab.path, session: sessionId, root: scope })
          if (payload.action !== 'read' || !['text', 'image', 'binary'].includes(payload.kind)) throw new Error(t('versionMismatch'))
          setPreview({ status: 'ready', ...payload })
          try {
            const recent = JSON.parse(localStorage.getItem('dsh-workspace-search.recent') || '[]').filter((value) => value !== tab.path)
            localStorage.setItem('dsh-workspace-search.recent', JSON.stringify([tab.path, ...recent].slice(0, 20)))
          } catch { /* optional persistence */ }
        } catch (error) {
          setPreview({ status: 'error', path: tab.path, name: tab.name, file: tab.file, error: String(error && error.message || error) })
        }
      }, [sessionId, scope])

      React.useEffect(() => {
        const request = state.fileRequest
        if (!state.fileOpen || !request || !request.path) return
        openEntry(request, request.line)
      }, [requestRevision])
      React.useEffect(() => {
        if (preview.status !== 'ready' || !targetLine) return
        const timer = requestAnimationFrame(() => lineRefs.current.get(targetLine)?.scrollIntoView({ block: 'center' }))
        return () => cancelAnimationFrame(timer)
      }, [preview.status, preview.path, targetLine])
      React.useEffect(() => {
        const text = filter.trim()
        if (!text) { setFilterState({ status: 'idle', files: [] }); return undefined }
        const controller = new AbortController()
        const timer = setTimeout(async () => {
          setFilterState({ status: 'loading', files: [] })
          try {
            const payload = await fetchJson(FILES_ROUTE, { action: 'search', q: text, session: sessionId, root: scope }, controller.signal)
            setFilterState({ status: 'ready', files: payload.files || [] })
          } catch (error) {
            if (!controller.signal.aborted) setFilterState({ status: 'error', files: [], error: String(error && error.message || error) })
          }
        }, DEBOUNCE_MS)
        return () => { clearTimeout(timer); controller.abort() }
      }, [filter, sessionId, scope])

      const closeTab = (path, event) => {
        event.stopPropagation()
        setTabs((old) => {
          const index = old.findIndex((item) => item.path === path)
          const next = old.filter((item) => item.path !== path)
          if (activePath === path) {
            const replacement = next[Math.min(index, next.length - 1)]
            if (replacement) openEntry(replacement)
            else { setActivePath(''); setPreview({ status: 'idle' }) }
          }
          return next
        })
      }
      let treeContent
      if (filter.trim()) {
        if (filterState.status === 'loading') treeContent = h('div', { className: 'wso-tree-note' }, t('searching'))
        else if (filterState.status === 'error') treeContent = h('div', { className: 'wso-tree-note' }, filterState.error)
        else treeContent = (filterState.files || []).map((file) => h('button', { key: file.path, type: 'button', className: 'wso-tree-row', 'data-selected': activePath === file.path, title: file.path, onClick: () => openEntry(file) }, h('span', { className: 'wso-tree-caret' }), h(Icon, { name: 'file', size: 14 }), h('span', { className: 'wso-tree-name' }, file.path)))
      } else {
        treeContent = h(TreeRows, { model, onFile: openEntry, selectedPath: activePath, t })
      }

      let previewBody
      if (preview.status === 'loading') previewBody = h('div', { className: 'wso-preview-empty' }, t('searching'))
      else if (preview.status === 'error') previewBody = h('div', { className: 'wso-preview-empty' }, preview.error)
      else if (preview.status !== 'ready') previewBody = h('div', { className: 'wso-preview-empty' }, h(Icon, { name: 'folder', size: 42 }), h('strong', null, t('chooseFile')), h('span', null, t('chooseFileHint')))
      else if (preview.kind === 'image') previewBody = h('div', { className: 'wso-preview-scroll' }, h('div', { className: 'wso-image-wrap' }, h('img', { src: `data:${preview.mime};base64,${preview.data}`, alt: preview.name })))
      else if (preview.kind === 'text') {
        lineRefs.current.clear()
        const lines = String(preview.content || '').split('\n').slice(0, 10000)
        previewBody = h('div', { className: 'wso-preview-scroll' }, h('table', { className: 'wso-code-table' }, h('tbody', null, lines.map((line, index) => {
          const number = index + 1
          return h('tr', { key: number, ref: (node) => { if (node) lineRefs.current.set(number, node) }, 'data-target': targetLine === number }, h('td', { className: 'wso-line-number' }, number), h('td', { className: 'wso-code-line' }, line || ' '))
        }))), preview.truncated ? h('div', { className: 'wso-preview-note' }, t('previewTooLarge')) : null)
      } else previewBody = h('div', { className: 'wso-preview-empty' }, h(Icon, { name: 'file', size: 42 }), h('strong', null, t('binaryFile')), h('span', null, t('previewUnavailable')))

      return h('div', { className: 'wso-overlay wso-reset', role: 'dialog', 'aria-label': t('openFile'), onKeyDown: (event) => { if (event.key === 'Escape') closeFileWindow(); if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') { event.preventDefault(); openSearch('files') } } },
        h('style', null, CSS),
        h('div', { className: 'wso-file-window' },
          h('div', { className: 'wso-file-topbar' },
            h('div', { className: 'wso-file-tabs' },
              tabs.length === 0 ? h('div', { className: 'wso-file-tab', 'data-active': true }, h(Icon, { name: 'file', size: 14 }), h('span', { className: 'wso-file-tab-name' }, t('openFile')), h('button', { type: 'button', className: 'wso-icon-button', onClick: closeFileWindow }, h(Icon, { name: 'close', size: 13 }))) : tabs.map((tab) => h('div', { key: tab.path, className: 'wso-file-tab', 'data-active': activePath === tab.path, title: tab.path, onClick: () => openEntry(tab) }, h(Icon, { name: 'file', size: 14 }), h('span', { className: 'wso-file-tab-name' }, tab.name), h('button', { type: 'button', className: 'wso-icon-button', onClick: (event) => closeTab(tab.path, event) }, h(Icon, { name: 'close', size: 12 })))),
              h('button', { type: 'button', className: 'wso-icon-button wso-file-plus', title: t('searchFiles'), onClick: () => openSearch('files') }, '+')),
            h('div', { className: 'wso-file-top-spacer' }),
            preview.status === 'ready' ? h('button', { type: 'button', className: 'wso-icon-button', title: t('nativeOpen'), onClick: () => openNativeResource(ctx, sessionId, preview.file, targetLine) }, h(Icon, { name: 'external', size: 15 })) : null,
            h('button', { type: 'button', className: 'wso-icon-button', title: t('search'), onClick: () => openSearch('all') }, h(Icon, { name: 'search', size: 15 })),
            h('button', { type: 'button', className: 'wso-icon-button', title: t('close'), onClick: closeFileWindow }, h(Icon, { name: 'close', size: 15 }))),
          h('div', { className: 'wso-file-content' },
            h('main', { className: 'wso-preview' }, preview.status === 'ready' ? h('div', { className: 'wso-preview-head' }, h('span', { className: 'wso-preview-path' }, preview.path), targetLine ? h('span', null, fill(t('line'), { line: targetLine })) : null) : null, previewBody),
            h('aside', { className: 'wso-explorer' }, h('div', { className: 'wso-explorer-head' }, h('input', { className: 'wso-filter', value: filter, autoFocus: false, placeholder: t('filterFiles'), onChange: (event) => setFilter(event.target.value) }), h('button', { type: 'button', className: 'wso-icon-button', title: t('refresh'), onClick: () => { model.reset(); model.load('', true) } }, '↻'), h('button', { type: 'button', className: 'wso-icon-button', title: t('openFiles') }, h(Icon, { name: 'folder', size: 16 }))), h('div', { className: 'wso-tree' }, treeContent))))
      )
    }

    async function loadCommandActions(ctx, sessionId, queryText, signal) {
      const local = [
        { id: 'local:open-files', name: 'open-files', labelKey: 'actionOpenFiles', detailKey: 'actionOpenFilesDetail', local: () => openSearch('files') },
        { id: 'local:search-files', name: 'search-files', labelKey: 'actionSearchFiles', detailKey: 'actionSearchFilesDetail', local: () => openSearch('files') },
        { id: 'local:search-text', name: 'search-text', labelKey: 'actionSearchText', detailKey: 'actionSearchTextDetail', local: () => openSearch('text') },
      ]
      const needle = String(queryText || '').toLocaleLowerCase()
      const visibleLocal = local.filter((item) => {
        if (!needle) return true
        const labels = item.id === 'local:open-files'
          ? 'open files browse workspace 打开文件 浏览工作区'
          : item.id === 'local:search-files'
            ? 'search files filename path 搜索文件 文件名 路径'
            : 'search text contents grep 搜索文本 全文 内容'
        return `${item.name} ${labels}`.includes(needle)
      })
      const commandUi = ctx.get('commandUi')
      const sessions = ctx.get('sessions')
      const session = sessions && typeof sessions.binding === 'function' ? sessions.binding(sessionId)?.session : undefined
      if (!commandUi || typeof commandUi.candidates !== 'function' || !session) return visibleLocal
      try {
        const rows = await commandUi.candidates(session, { query: queryText, position: 'leading', signal })
        return [...visibleLocal, ...rows.map((row) => ({ id: `command:${row.name}`, name: row.name, label: row.label || `/${row.name}`, detail: row.description || row.hint || '', command: `/${row.name}` }))]
      } catch {
        return visibleLocal
      }
    }

    function SearchModal({ ctx, sessionId, inputActions, state }) {
      const t = ctx.locale.bind(NS)
      useLocale(ctx)
      const [mode, setMode] = React.useState(state.mode || 'all')
      const [query, setQuery] = React.useState('')
      const [types, setTypes] = React.useState(() => { try { return localStorage.getItem('dsh-workspace-search.types') || '' } catch { return '' } })
      const [scope, setScope] = React.useState(() => { try { return localStorage.getItem('dsh-workspace-search.scope') || '' } catch { return '' } })
      const [root, setRoot] = React.useState('')
      const [rootName, setRootName] = React.useState('')
      const [workspaceRoots, setWorkspaceRoots] = React.useState([])
      const [results, setResults] = React.useState({ status: 'idle', files: [], textFiles: [], chats: [], actions: [], matches: 0 })
      const [activeIndex, setActiveIndex] = React.useState(0)
      const inputRef = React.useRef(null)

      React.useEffect(() => { setMode(state.mode || 'all'); requestAnimationFrame(() => inputRef.current?.focus()) }, [state.revision])
      React.useEffect(() => {
        const sessions = ctx.get('sessions')
        const refresh = () => {
          const snapshot = sessionListSnapshot(ctx)
          const seen = new Set()
          const roots = []
          for (const id of snapshot.ids || []) {
            const cwd = snapshot.byId[id] && snapshot.byId[id].cwd
            if (!cwd) continue
            const key = String(cwd).toLocaleLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            roots.push({ path: cwd, name: String(cwd).split(/[\\/]/).filter(Boolean).pop() || cwd })
          }
          setWorkspaceRoots(roots)
          const current = snapshot.byId[sessionId]
          if (!scope && current && current.cwd) {
            setRoot(current.cwd)
            setRootName(String(current.cwd).split(/[\\/]/).filter(Boolean).pop() || current.cwd)
          }
        }
        refresh()
        const list = sessions && sessions.list
        return list && typeof list.subscribe === 'function' ? list.subscribe(refresh) : undefined
      }, [ctx, sessionId, scope])
      React.useEffect(() => {
        const text = query.trim()
        const controller = new AbortController()
        const timer = setTimeout(async () => {
          setResults((old) => ({ ...old, status: 'loading' }))
          const use = (name) => mode === 'all' || mode === name
          const resources = mode === 'resources'
          const common = { q: text, session: sessionId, root: scope, types: resources ? '*.md,*.mdx,*.txt,*.pdf,*.doc,*.docx,*.rtf' : types }
          try {
            const [filePayload, textPayload, chatPayload, actions] = await Promise.all([
              use('files') || resources ? fetchJson(FILES_ROUTE, { ...common, action: text ? 'search' : 'recent' }, controller.signal) : null,
              use('text') && text ? fetchJson(SEARCH_ROUTE, common, controller.signal) : null,
              use('chats') ? loadChatResults(ctx, scope || root, text, controller.signal) : null,
              use('actions') ? loadCommandActions(ctx, sessionId, text, controller.signal) : [],
            ])
            if (controller.signal.aborted) return
            let files = filePayload ? filePayload.files || [] : []
            if (!text && files.length) {
              try {
                const order = new Map(JSON.parse(localStorage.getItem('dsh-workspace-search.recent') || '[]').map((path, index) => [path, index]))
                files = [...files].sort((a, b) => (order.get(a.path) ?? 10000) - (order.get(b.path) ?? 10000) || (b.modifiedAt || 0) - (a.modifiedAt || 0))
              } catch { /* modification order is the fallback */ }
            }
            const textFiles = textPayload ? textPayload.files || [] : []
            const chats = chatPayload ? chatPayload.chats || [] : []
            setRoot((filePayload && filePayload.root) || (textPayload && textPayload.root) || (chatPayload && chatPayload.root) || '')
            setRootName((filePayload && filePayload.rootName) || (chatPayload && chatPayload.rootName) || '')
            setResults({ status: files.length || textFiles.length || chats.length || actions.length ? 'ready' : 'empty', files, textFiles, chats, actions, matches: textPayload ? textPayload.total || 0 : 0, recent: !text, resources, truncated: Boolean((filePayload && filePayload.truncated) || (textPayload && textPayload.truncated) || (chatPayload && chatPayload.truncated)) })
            setActiveIndex(0)
          } catch (error) {
            if (!controller.signal.aborted) setResults({ status: 'error', files: [], textFiles: [], chats: [], actions: [], matches: 0, error: String(error && error.message || error) })
          }
        }, DEBOUNCE_MS)
        return () => { clearTimeout(timer); controller.abort() }
      }, [query, mode, types, scope, root, sessionId])

      const groups = []
      if (results.actions.length) groups.push({ id: 'actions', label: t('actions'), items: results.actions.map((action) => ({
        key: action.id,
        icon: 'bolt',
        title: action.label || t(action.labelKey),
        detail: action.detail || t(action.detailKey),
        side: action.command || '',
        run: () => {
          if (action.local) { action.local(); return }
          if (insertCommand(inputActions, action.command)) closeSearch()
          else navigator.clipboard?.writeText(action.command).then(closeSearch, closeSearch)
        },
      })) })
      if (results.chats.length) groups.push({ id: 'chats', label: t('chats'), items: results.chats.map((chat) => ({
        key: `chat:${chat.id}`,
        icon: 'chat',
        title: chat.title || t('untitledChat'),
        detail: chat.snippet || chat.cwd || '',
        side: formatDate(chat.eventTime || chat.createdAt),
        run: () => { const nav = ctx.get('uiWorkspace'); if (nav && typeof nav.openSession === 'function') { closeSearch(); nav.openSession(chat.id) } },
      })) })
      if (results.files.length) groups.push({ id: 'files', label: results.recent ? t('recent') : t(results.resources ? 'resources' : 'files'), items: results.files.map((file) => ({
        key: `file:${file.path}`,
        icon: 'file',
        title: file.name,
        detail: file.path,
        run: () => { if (openNativeResource(ctx, sessionId, file.path)) { rememberRecent(file.path); closeSearch() } },
      })) })
      if (results.textFiles.length) {
        const items = []
        for (const file of results.textFiles) for (const hit of file.matches || []) items.push({
          key: `text:${file.path}:${hit.line}:${hit.column}`,
          icon: 'search',
          title: `${file.path}:${hit.line}`,
          detail: hit.text,
          code: true,
          run: () => { if (openNativeResource(ctx, sessionId, file.path, hit.line)) { rememberRecent(file.path); closeSearch() } },
        })
        groups.push({ id: 'text', label: t('text'), items })
      }
      const flat = groups.flatMap((group) => group.items)
      React.useEffect(() => {
        const node = document.querySelector(`[data-wso-result-index="${activeIndex}"]`)
        node?.scrollIntoView({ block: 'nearest' })
      }, [activeIndex])

      let body
      if (results.status === 'loading') body = h('div', { className: 'wso-empty' }, t('searching'))
      else if (results.status === 'error') body = h('div', { className: 'wso-empty' }, results.error)
      else if (flat.length === 0) body = h('div', { className: 'wso-empty' }, t('noResults'))
      else {
        let runningIndex = 0
        body = groups.map((group) => h('section', { className: 'wso-group', key: group.id }, h('div', { className: 'wso-group-head' }, h('span', null, group.label), h('span', { className: 'wso-group-count' }, group.items.length)), group.items.map((item) => {
          const index = runningIndex++
          return h('button', { key: item.key, type: 'button', className: 'wso-result', 'data-active': index === activeIndex, 'data-wso-result-index': index, onMouseEnter: () => setActiveIndex(index), onClick: item.run }, h('span', { className: 'wso-result-glyph' }, h(Icon, { name: item.icon, size: 16 })), h('span', { className: 'wso-result-content' }, h('div', { className: 'wso-result-title' }, highlighted(item.title, query)), h('div', { className: `wso-result-detail${item.code ? ' wso-code' : ''}` }, highlighted(item.detail, query))), item.side ? h('span', { className: 'wso-result-side' }, item.side) : null)
        })))
      }
      const tabs = ['all', 'actions', 'chats', 'resources', 'files', 'text']
      return h('div', { className: 'wso-overlay wso-reset', role: 'dialog', 'aria-label': t('search'), onKeyDown: (event) => {
        if (event.key === 'Escape') { event.preventDefault(); closeSearch() }
        else if (event.key === 'ArrowDown' && flat.length) { event.preventDefault(); setActiveIndex((value) => (value + 1) % flat.length) }
        else if (event.key === 'ArrowUp' && flat.length) { event.preventDefault(); setActiveIndex((value) => (value - 1 + flat.length) % flat.length) }
        else if (event.key === 'Enter' && flat[activeIndex]) { event.preventDefault(); flat[activeIndex].run() }
      } },
        h('style', null, CSS), h('div', { className: 'wso-scrim', onMouseDown: closeSearch }),
        h('div', { className: 'wso-search-card' },
          h('div', { className: 'wso-search-head' }, h('input', { ref: inputRef, className: 'wso-search-input', value: query, placeholder: mode === 'files' ? t('searchFiles') : t('searchPlaceholder'), onChange: (event) => setQuery(event.target.value), spellCheck: false })),
          h('div', { className: 'wso-search-body' }, body),
          h('div', { className: 'wso-search-foot' }, h('div', { className: 'wso-tabs' }, tabs.map((id) => h('button', { key: id, type: 'button', className: 'wso-tab', 'data-active': mode === id, onClick: () => { setMode(id); setActiveIndex(0) } }, t(id)))), h('span', { className: 'wso-foot-spacer' }), h('label', { className: 'wso-select-like', title: root || scope }, h(Icon, { name: 'folder', size: 14 }), h('select', { value: scope || root, onChange: (event) => { const value = event.target.value; setScope(value); try { localStorage.setItem('dsh-workspace-search.scope', value) } catch {} } }, workspaceRoots.length ? workspaceRoots.map((item) => h('option', { key: item.path, value: item.path }, item.name)) : h('option', { value: scope || root }, rootName || driveLabel(root || scope) || t('workspace')))), h('label', { className: 'wso-select-like' }, h('span', null, `${t('fileType')}:`), h('input', { value: types, placeholder: t('fileTypeHint'), onChange: (event) => { setTypes(event.target.value); try { localStorage.setItem('dsh-workspace-search.types', event.target.value) } catch {} } }))))
      )
    }

    function SidebarExplorer({ ctx, sessionId }) {
      const t = ctx.locale.bind(NS)
      useLocale(ctx)
      const [scope] = React.useState(() => { try { return localStorage.getItem('dsh-workspace-search.scope') || '' } catch { return '' } })
      const model = useDirectoryModel(sessionId, scope)
      const [filter, setFilter] = React.useState('')
      const [flat, setFlat] = React.useState({ status: 'idle', files: [] })
      React.useEffect(() => { model.load('', true) }, [sessionId, scope])
      React.useEffect(() => {
        const text = filter.trim()
        if (!text) { setFlat({ status: 'idle', files: [] }); return undefined }
        const controller = new AbortController()
        const timer = setTimeout(async () => {
          setFlat({ status: 'loading', files: [] })
          try { const payload = await fetchJson(FILES_ROUTE, { action: 'search', q: text, session: sessionId, root: scope }, controller.signal); setFlat({ status: 'ready', files: payload.files || [] }) } catch (error) { if (!controller.signal.aborted) setFlat({ status: 'error', files: [], error: String(error && error.message || error) }) }
        }, DEBOUNCE_MS)
        return () => { clearTimeout(timer); controller.abort() }
      }, [filter, sessionId, scope])
      const open = (entry) => openNativeResource(ctx, sessionId, entry.path)
      let content
      if (!filter.trim()) content = h(TreeRows, { model, onFile: open, selectedPath: '', t })
      else if (flat.status === 'loading') content = h('div', { className: 'wso-tree-note' }, t('searching'))
      else if (flat.status === 'error') content = h('div', { className: 'wso-tree-note' }, flat.error)
      else content = flat.files.map((file) => h('button', { key: file.path, type: 'button', className: 'wso-tree-row', title: file.path, onClick: () => open(file) }, h('span', { className: 'wso-tree-caret' }), h(Icon, { name: 'file', size: 14 }), h('span', { className: 'wso-tree-name' }, file.path)))
      return h('div', { className: 'wso-sidebar wso-reset' }, h('style', null, CSS), h('div', { className: 'wso-sidebar-head' }, h('input', { className: 'wso-filter', value: filter, placeholder: t('filterFiles'), onChange: (event) => setFilter(event.target.value) }), h('button', { type: 'button', className: 'wso-icon-button', title: t('search'), onClick: () => openSearch('all') }, h(Icon, { name: 'search', size: 15 })), h('button', { type: 'button', className: 'wso-icon-button', title: t('refresh'), onClick: () => { model.reset(); model.load('', true) } }, '↻')), h('div', { className: 'wso-sidebar-root' }, model.rootName || t('workspace')), h('div', { className: 'wso-sidebar-tree' }, content))
    }

    function OverlayHost(props) {
      const state = useShell()
      React.useEffect(() => {
        closeSearch()
        closeFileWindow()
      }, [props.sessionId])
      const content = h(React.Fragment, null,
        state.searchOpen ? h(SearchModal, { ctx: props.ctx, sessionId: props.sessionId, inputActions: props.inputActions, state }) : null)
      return ReactDOM.createPortal(content, document.body)
    }
    function ShortcutBridge() {
      React.useEffect(() => {
        const handler = (event) => {
          if (event.key === 'Escape' && (shell.searchOpen || shell.fileOpen)) {
            event.preventDefault()
            closeSearch()
            closeFileWindow()
            return
          }
          const key = event.key.toLocaleLowerCase()
          if (event.ctrlKey || event.metaKey) {
            if (key === 'p') { event.preventDefault(); openSearch('files'); return }
            if (event.shiftKey && key === 'f') { event.preventDefault(); openSearch('text'); return }
            if (key === 'o') { event.preventDefault(); openSearch('files'); return }
          }
          const target = event.target
          const editing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
          if (editing || !(event.ctrlKey || event.metaKey)) return
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
      }, [])
      return null
    }
    function ToolButton({ ctx, kind, wide }) {
      const t = ctx.locale.bind(NS)
      useLocale(ctx)
      const file = kind === 'files'
      const activate = (event) => {
        event.currentTarget.blur()
        if (file) openSearch('files')
        else openSearch('all')
      }
      return h(React.Fragment, null,
        h('style', null, CSS),
        h('span', {
          role: 'button',
          tabIndex: 0,
          className: 'wso-tool wso-reset',
          title: t(file ? 'openFiles' : 'search'),
          onClick: activate,
          onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(event) } },
        }, h(Icon, { name: file ? 'toolbar-folder' : 'search', size: 16 }), wide ? h('span', null, t(file ? 'files' : 'search')) : null))
    }

    function registerDictionaries(ctx) {
      let locales = []
      try { locales = ctx.locale.getLocale().locales || [] } catch { /* use defaults */ }
      const ids = new Set(['en', 'zh', ...locales.map((item) => item.id)])
      for (const id of ids) {
        if (!id) continue
        try { ctx.effect(() => ctx.locale.register(NS, id, String(id).toLocaleLowerCase().startsWith('zh') ? ZH : EN)) } catch { /* already registered */ }
      }
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        registerDictionaries(ctx)
        ctx.effect(() => {
          const tabs = ctx.get('sidebarRightTabs')
          if (!tabs || typeof tabs.register !== 'function') return () => {}
          const disposeExplorer = tabs.register({ id: EXPLORER_TYPE_ID, kind: EXPLORER_KIND, title: () => ctx.locale.bind(NS)('files') })
          const disposeSearch = tabs.register({ id: SEARCH_TYPE_ID, kind: SEARCH_KIND, title: () => ctx.locale.bind(NS)('search') })
          return () => { if (typeof disposeSearch === 'function') disposeSearch(); if (typeof disposeExplorer === 'function') disposeExplorer() }
        })
        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: EXPLORER_TYPE_ID }, (props) => h(SidebarExplorer, { ...props, ctx })))
        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: SEARCH_TYPE_ID }, (props) => h(SidebarExplorer, { ...props, ctx })))
        ctx.slots.inject('sidebar.right.tab.files.actions', () => ctx.slots.register({ name: 'sidebar.right.tab.files.actions', id: 'workspace-search.open', order: 10, label: () => ctx.locale.bind(NS)('openFiles') }, (props) => h(ToolButton, { ...props, ctx, kind: 'files' })))
        ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({ name: 'conversation.input.overlay', id: 'workspace-search.overlays', order: 50 }, (props) => h(OverlayHost, { ...props, ctx })))
        ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({ name: 'conversation.input.overlay', id: 'workspace-search.shortcuts', order: 51 }, ShortcutBridge))
      },
    }
  },
})
