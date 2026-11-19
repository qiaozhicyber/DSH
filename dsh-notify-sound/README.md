# 🔔 dsh-notify-sound · 提示音

![License](https://img.shields.io/badge/license-Unlicense-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![DSH](https://img.shields.io/badge/DSH-Desktop%20plugin-4D6BFE.svg)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)

> 当 DSH 需要你处理事情时，在主机上响一声——即使浏览器标签页不在前台、窗口被最小化也能听到。
>
> A host-side notification sound for **DeepSeek Harness (DSH)** permission/approval requests and questions that need your choice.

**中文** ｜ [English](#english)

---

## 它解决什么

DSH 在等你**批准权限**、或**回答一个选择题**时，往往只是静静地在页面里弹个框。如果你切到了别的标签页或窗口，就会错过，AI 只能干等。本插件在这两类弹窗出现时，于**主机**播放一声提示音，把你叫回来。

## 特性

- 🎯 **两类触发**：权限 / 批准申请；需要你选择的问题（`ask_user_question`）。
- 🖥️ **主机发声**：与浏览器标签页是否聚焦、是否静音无关（仍受主机系统音量 / 静音影响）。
- 🧩 **跨平台、零额外依赖**：Windows / macOS / Linux，全部使用系统自带的播放器。
- 🛡️ **纯观察、绝不干预**：不回答、不修改、不短路任何批准决定或问题答案。
- 🎚️ **可配置**：总开关、分类开关、音色（内置铃声 / 系统提示音）、最小发声间隔。
- 🔇 **不弹窗就不响**：被策略自动放行 / 自动拒绝（没有真正弹窗）的申请不会发声。

## 触发时机

| 场景 | 是否发声 |
| --- | --- |
| 权限 / 批准申请弹窗 | ✅ |
| 需要你选择 / 作答的问题 | ✅ |
| 被策略自动拒绝（`never`）或自动放行而**不弹窗** | ❌（不触发事件） |

## 安装

前提：**DSH Desktop**（主机进程运行在本机）。

1. 下载 / 克隆本仓库，找到包含 `package.json` 与 `cordis.patch.yml` 的插件目录（可能就是仓库根目录，也可能是 `dsh-notify-sound` 子目录）。
2. 打开 DSH 的「插件管理」→「安装本地插件 / 从文件夹安装」，选择该目录，安装并**启用**。
3. 完成。**无需构建、无需 `npm install`**——这是一个 host-only bundle，peer 依赖由 DSH 运行时提供。

> 高级用户也可通过 `plugin_manager` 的 `install_bundle` 指向该目录安装。

## 配置

在「插件管理 / 设置」里调整本插件配置：

| 配置项 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关。 |
| `onApproval` | `true` | 权限 / 批准申请时发声。 |
| `onQuestion` | `true` | 需要选择的问题时发声。 |
| `sound` | `chime` | `chime` = 内置清脆铃声；`system` = 系统提示音。`chime` 播放失败时自动回退为系统提示音。 |
| `cooldownMs` | `1000` | 同类两次发声的最小间隔（毫秒），防止连续弹窗刷屏式响铃。**批准与问题各自独立计时**：同类触发在窗口内只响一次，但批准和问题互不抑制（紧挨着出现时都能听到）。被跳过的触发不会延长冷却。 |

## 平台支持

| 平台 | 播放器 | 状态 |
| --- | --- | --- |
| Windows | PowerShell `Media.SoundPlayer`（回退 `SystemSounds.Asterisk`） | ✅ 已实测 |
| macOS | `afplay`（回退系统 `Glass.aiff` / `beep`） | ⚠️ 已实现，未在本机实测 |
| Linux | `paplay` → `aplay`（系统音用 freedesktop bell / `canberra-gtk-play`） | ⚠️ 已实现，未在本机实测 |
| 其它 | — | 静默跳过 |

- 内置铃声 `sound.wav` 是标准 PCM WAV，三大平台均可直接播放。
- Linux 需要 `paplay`（PulseAudio / PipeWire）或 `aplay`（ALSA）；`system` 音色依赖 freedesktop 声音主题或 libcanberra。
- macOS / Linux 路径已按各平台惯例实现，但作者只在 Windows 上亲耳验证过；欢迎在其它平台反馈。

## 试听与自测

想确认它到底会不会响、或对比两种音色，把下面的 `PATH_TO_PLUGIN` 换成你的实际插件目录后直接运行：

**Windows（PowerShell）**

```powershell
# 内置铃声 chime
powershell -NoProfile -Command "(New-Object Media.SoundPlayer 'PATH_TO_PLUGIN\sound.wav').PlaySync()"
# 系统提示音 system
powershell -NoProfile -Command "[System.Media.SystemSounds]::Asterisk.Play()"
```

**macOS**

```bash
afplay "PATH_TO_PLUGIN/sound.wav"                 # 内置铃声
afplay /System/Library/Sounds/Glass.aiff          # 系统提示音
```

**Linux**

```bash
paplay "PATH_TO_PLUGIN/sound.wav"                 # 内置铃声（或 aplay）
paplay /usr/share/sounds/freedesktop/stereo/bell.oga   # 系统提示音
```

## 工作原理与边界

- 纯**观察型**监听器：挂在 `approval/request` 与 `user-questions/request` 两个 waterfall 事件上，以 `{ prepend: true }` 注册在网关应答器**之前**，播放声音后无条件 `return next()`，**绝不回答、绝不修改、绝不短路**任何权限决定或问题答案。
- 声音由**主机进程**播放（拉起系统播放器发声），因此与浏览器标签页是否聚焦、是否静音无关（仍受主机系统音量 / 静音影响）。
- 发声失败会被静默忽略，不会影响请求本身。
- 触发即发声：若某条批准申请被下游策略自动应答而未真正弹窗，仍可能发声；如觉得吵可关闭 `onApproval`。

## 排查（没声音？）

1. **系统音量 / 静音**：主机发声跟随系统音量，先确认系统能出声。
2. **真的弹窗了吗**：自动放行 / 自动拒绝（不弹窗）不会触发事件、不响——这是正常行为。
3. **平台支持**：Linux 需 `paplay` / `aplay`；其它平台静默跳过。
4. **冷却窗口**：同类触发在 `cooldownMs` 内只响一次。
5. **开关**：确认 `enabled` / `onApproval` / `onQuestion` 没被关掉。
6. 用上面「试听与自测」的命令确认系统本身能播放该 WAV。

## 隐私

仅在本地播放声音：**不读取用户数据、不联网、不上传**。

## 文件结构

```
dsh-notify-sound/
├── index.js            # 主逻辑：跨平台播放 + 两个观察型监听器
├── cordis.patch.yml    # 插入插件行
├── sound.wav           # 内置清脆铃声（PCM WAV）
├── icon.svg            # 插件图标
├── locale/
│   ├── zh.json         # 中文标题 / 描述
│   └── en.json         # 英文标题 / 描述
├── package.json
├── README.md
├── CHANGELOG.md
└── LICENSE             # Unlicense
```

## 许可证

[Unlicense](LICENSE)（公有领域 dedication）。可自由复制、修改、分发，无任何限制。

---

<a name="english"></a>

## English

A host-side notification sound for **DeepSeek Harness (DSH)**. Whenever DSH raises a **permission/approval request** or a **question that needs your choice** (`ask_user_question`), it plays a short sound on the **host machine**, so you notice it even when the browser tab is unfocused or the window is minimized (still subject to the host's system volume/mute).

### Features

- 🎯 Two triggers: permission/approval requests, and questions needing your choice.
- 🖥️ Host-side playback: independent of browser tab focus/mute (still follows the host system volume/mute).
- 🧩 Cross-platform, zero extra dependencies: Windows / macOS / Linux, all via built-in system players.
- 🛡️ Observer-only: never answers, alters, or short-circuits any approval decision or question.
- 🎚️ Configurable: master toggle, per-trigger toggles, sound (`chime` / `system`), cooldown.
- 🔇 No popup, no sound: requests auto-granted / auto-rejected by policy (no real popup) stay silent.

### When it sounds

| Situation | Sound |
| --- | --- |
| Permission / approval popup | ✅ |
| Question needing your choice | ✅ |
| Auto-rejected (`never`) or auto-granted **without a popup** | ❌ (no event) |

### Install

Requires **DSH Desktop** (the host process runs on your machine).

1. Download / clone this repository and find the plugin directory containing `package.json` and `cordis.patch.yml` (it may be the repository root, or a `dsh-notify-sound` subdirectory).
2. In DSH's **Plugin Manager**, choose **Install local plugin / Install from folder**, select that directory, install and **enable** it.
3. Done. **No build step, no `npm install`** — this is a host-only bundle; peer dependencies are provided by the DSH runtime.

> Advanced: you can also install it via `plugin_manager`'s `install_bundle` pointing at that directory.

### Configuration

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Master switch. |
| `onApproval` | `true` | Sound on permission/approval requests. |
| `onQuestion` | `true` | Sound on questions needing your choice. |
| `sound` | `chime` | `chime` = built-in crisp bell; `system` = the OS notification sound. If the chime fails to play, it automatically falls back to the system sound. |
| `cooldownMs` | `1000` | Minimum interval (ms) between sounds **of the same kind**. Approval and question keep **independent clocks**: the same kind only sounds once per window, but the two kinds never suppress each other. Skipped triggers do not extend the cooldown. |

### Platform support

| Platform | Player | Status |
| --- | --- | --- |
| Windows | PowerShell `Media.SoundPlayer` (fallback `SystemSounds.Asterisk`) | ✅ Verified |
| macOS | `afplay` (fallback system `Glass.aiff` / `beep`) | ⚠️ Implemented, not verified on the author's machine |
| Linux | `paplay` → `aplay` (system sound: freedesktop bell / `canberra-gtk-play`) | ⚠️ Implemented, not verified on the author's machine |
| Other | — | Silent no-op |

The built-in `sound.wav` is a standard PCM WAV playable on all three platforms. Linux needs `paplay` (PulseAudio/PipeWire) or `aplay` (ALSA). macOS/Linux paths follow each platform's conventions but were only audibly verified on Windows — feedback on other platforms is welcome.

### Preview the sound

Replace `PATH_TO_PLUGIN` with your actual plugin directory:

```powershell
# Windows
powershell -NoProfile -Command "(New-Object Media.SoundPlayer 'PATH_TO_PLUGIN\sound.wav').PlaySync()"
powershell -NoProfile -Command "[System.Media.SystemSounds]::Asterisk.Play()"
```

```bash
# macOS
afplay "PATH_TO_PLUGIN/sound.wav"
afplay /System/Library/Sounds/Glass.aiff
# Linux
paplay "PATH_TO_PLUGIN/sound.wav"
paplay /usr/share/sounds/freedesktop/stereo/bell.oga
```

### How it works

Observer-only listeners on the `approval/request` and `user-questions/request` waterfall events, registered with `{ prepend: true }` so they run **before** the gateway answerer. After playing, they unconditionally `return next()` and never return an outcome — so they cannot answer, alter, or short-circuit any decision. Sound is played by the **host process** (spawning the system player); playback failures are silently ignored. Cooldown is tracked per trigger kind.

### Troubleshooting (no sound?)

1. **System volume/mute** — host playback follows the system volume.
2. **Did a popup actually appear?** Auto-granted/auto-rejected requests (no popup) dispatch no event and stay silent — this is expected.
3. **Platform** — Linux needs `paplay`/`aplay`; other platforms are a silent no-op.
4. **Cooldown** — the same kind only sounds once within `cooldownMs`.
5. **Toggles** — check `enabled` / `onApproval` / `onQuestion`.
6. Use the preview commands above to confirm the system can play the WAV at all.

### Privacy

Local sound only — **no user data is read, no network access, nothing uploaded**.

### License

[Unlicense](LICENSE) (public-domain dedication). Free to copy, modify, and distribute without restriction.
