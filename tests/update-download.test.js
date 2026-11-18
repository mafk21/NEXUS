import { describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { downloadInstaller, verifyPrepared, safeDownloadUrl, releaseDownloadUrl, MAX_INSTALLER } = require('../electron/update-download.cjs')
const data = Buffer.from('dummy installer content')
const asset = (body = data) => ({ size: body.length, digest: `sha256:${createHash('sha256').update(body).digest('hex')}` })
function fakeNet({ body = data, status = 200, redirect } = {}) {
  const request = new EventEmitter(); request.setHeader = vi.fn(); request.followRedirect = vi.fn(); request.abort = vi.fn()
  request.end = () => { queueMicrotask(() => { if (redirect) request.emit('redirect', 302, 'GET', redirect); if (!request.abort.mock.calls.length) { const response = Readable.from([body]); response.statusCode = status; request.emit('response', response) } }) }
  return { request: vi.fn(() => request), instance: request }
}
describe('verified installer download', () => {
  it('streams only from the official URL, allows trusted redirects and verifies before install', async () => {
    const net = fakeNet({ redirect: 'https://release-assets.githubusercontent.com/file?token=abc' }), progress = vi.fn()
    const result = await downloadInstaller({ net, version: '1.2.0-rc.2', asset: asset(), progress })
    try {
      expect(net.request.mock.calls[0][0].url).toBe('https://github.com/mafk21/NEXUS/releases/download/v1.2.0-rc.2/NEXUS%20Setup%201.2.0-rc.2.exe')
      expect(net.instance.followRedirect).toHaveBeenCalledOnce(); expect(await fs.readFile(result.file)).toEqual(data)
      expect(progress).toHaveBeenLastCalledWith({ received: data.length, total: data.length }); await expect(verifyPrepared(result)).resolves.toBeUndefined()
      await fs.writeFile(result.file, Buffer.alloc(data.length)); await expect(verifyPrepared(result)).rejects.toThrow('changed')
    } finally { await fs.rm(result.dir, { recursive: true, force: true }) }
  })
  it('rejects untrusted redirects, size mismatch, missing digest and bad hash without leaving temp files', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-download-test-'))
    try {
      await expect(downloadInstaller({ net: fakeNet({ redirect: 'https://evil.example/foo' }), version: '1.0.1', asset: asset(), tempRoot: root })).rejects.toThrow('untrusted')
      await expect(downloadInstaller({ net: fakeNet(), version: '1.0.1', asset: { size: data.length, digest: `sha256:${'0'.repeat(64)}` }, tempRoot: root })).rejects.toThrow('integrity')
      await expect(downloadInstaller({ net: fakeNet(), version: '1.0.1', asset: { ...asset(), size: data.length - 1 }, tempRoot: root })).rejects.toThrow('exceeded')
      await expect(downloadInstaller({ net: fakeNet(), version: '1.0.1', asset: { size: MAX_INSTALLER + 1, digest: `sha256:${'0'.repeat(64)}` }, tempRoot: root })).rejects.toThrow('verifiable')
      expect(await fs.readdir(root)).toEqual([])
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  })
  it('times out while waiting for a response and cleans up', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-timeout-test-'))
    const request = new EventEmitter(); request.setHeader = vi.fn(); request.abort = vi.fn(); request.end = vi.fn()
    try {
      await expect(downloadInstaller({ net: { request: () => request }, version: '1.0.1', asset: asset(), tempRoot: root, timeoutMs: 10 })).rejects.toThrow('timed out')
      expect(request.abort).toHaveBeenCalled(); expect(await fs.readdir(root)).toEqual([])
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  })
  it('rejects insecure or credentialed redirect destinations', () => {
    for (const url of ['http://github.com/a', 'https://github.com.evil.example/', 'https://user@github.com/', 'file:///tmp/a', 'https://github.com:8443/a']) expect(safeDownloadUrl(url)).toBe(false)
    expect(safeDownloadUrl(releaseDownloadUrl('1.2.3'))).toBe(true)
  })
})
