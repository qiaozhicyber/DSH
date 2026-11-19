/**
 * dsh-notify-sound — play a host-side notification sound when DSH raises a
 * permission/approval request, or a question that needs your choice.
 *
 * Observer-only by design: both listeners register with { prepend: true } so they
 * run before the gateway answerer, play a sound, then unconditionally `return next()`.
 * They never return an outcome, so they cannot answer, alter, or short-circuit any
 * approval decision or question. Requests that policy auto-grants / auto-rejects
 * (no popup) never dispatch the event, so they stay silent.
 *
 * Cross-platform playback, zero extra dependencies:
 *   Windows  PowerShell Media.SoundPlayer   (fallback: SystemSounds.Asterisk)
 *   macOS    afplay                          (fallback: system Glass.aiff / beep)
 *   Linux    paplay -> aplay                 (system: freedesktop bell / canberra)
 * Other platforms are a silent no-op.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-notify-sound'

export const Config = z.object({
  enabled: z.boolean().default(true),
  onApproval: z.boolean().default(true),
  onQuestion: z.boolean().default(true),
  sound: z.union([z.const('chime'), z.const('system')]).default('chime'),
  cooldownMs: z.number().default(1000),
}).loose()

const WAV_PATH = join(dirname(fileURLToPath(import.meta.url)), 'sound.wav')

// --- quoting helpers -------------------------------------------------------
function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}
function shQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

// --- per-platform command builders -----------------------------------------
// Each returns { file, args } for child_process.spawn, or null if unsupported.

function windowsCommand(sound) {
  const powershell = join(
    process.env.SystemRoot || 'C:\\Windows',
    'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe',
  )
  const systemBeep = '[System.Media.SystemSounds]::Asterisk.Play(); Start-Sleep -Milliseconds 600'
  const command = sound === 'system'
    ? systemBeep
    // Custom crisp chime; fall back to the system sound if the WAV is missing/undecodable.
    : `try { (New-Object Media.SoundPlayer ${psQuote(WAV_PATH)}).PlaySync() } catch { ${systemBeep} }`
  return { file: powershell, args: ['-NoProfile', '-NonInteractive', '-Command', command] }
}

function macCommand(sound) {
  const systemSound = '/System/Library/Sounds/Glass.aiff'
  const command = sound === 'system'
    ? `afplay ${shQuote(systemSound)} 2>/dev/null || osascript -e 'beep 1'`
    : `afplay ${shQuote(WAV_PATH)} 2>/dev/null || afplay ${shQuote(systemSound)} 2>/dev/null || osascript -e 'beep 1'`
  return { file: '/bin/sh', args: ['-c', command] }
}

function linuxCommand(sound) {
  const bell = '/usr/share/sounds/freedesktop/stereo/bell.oga'
  const command = sound === 'system'
    ? `paplay ${shQuote(bell)} 2>/dev/null || canberra-gtk-play -i bell 2>/dev/null`
    : `paplay ${shQuote(WAV_PATH)} 2>/dev/null || aplay ${shQuote(WAV_PATH)} 2>/dev/null`
  return { file: '/bin/sh', args: ['-c', command] }
}

function buildCommand(sound) {
  switch (process.platform) {
    case 'win32': return windowsCommand(sound)
    case 'darwin': return macCommand(sound)
    case 'linux': return linuxCommand(sound)
    default: return null
  }
}

export function apply(ctx, config) {
  const cooldownMs = Math.max(0, Number(config.cooldownMs) || 0)
  // Approval and question keep independent clocks: the same kind only sounds once
  // per cooldown window, but the two kinds never suppress each other.
  const lastPlay = { approval: 0, question: 0 }

  function play(kind) {
    if (!config.enabled) return
    const now = Date.now()
    if (now - lastPlay[kind] < cooldownMs) return
    const command = buildCommand(config.sound)
    if (!command) return // unsupported platform: silent no-op
    lastPlay[kind] = now
    try {
      const child = spawn(command.file, command.args, {
        detached: false,
        windowsHide: true,
        stdio: 'ignore',
      })
      child.on('error', () => {})
      child.unref()
    } catch {
      // Playback failure must never affect the approval/question flow.
    }
  }

  ctx.on('approval/request', function (request, next) {
    if (config.onApproval) play('approval')
    return next()
  }, { prepend: true })

  ctx.on('user-questions/request', function (request, next) {
    if (config.onQuestion) play('question')
    return next()
  }, { prepend: true })
}
