import * as fs from 'fs'

export function getSidecarPath(mmdFsPath: string): string {
  return `${mmdFsPath}.layout.json`
}

export function readSidecar(mmdFsPath: string): string | null {
  const sidecarPath = getSidecarPath(mmdFsPath)
  try {
    return fs.readFileSync(sidecarPath, 'utf-8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.error(`[mermvis] Failed to read layout sidecar: ${String(err)}`)
    }
    return null
  }
}

export function writeSidecar(mmdFsPath: string, layoutJson: string): void {
  const sidecarPath = getSidecarPath(mmdFsPath)
  const tmpPath = `${sidecarPath}.tmp`
  fs.writeFileSync(tmpPath, layoutJson, 'utf-8')
  fs.renameSync(tmpPath, sidecarPath)
}
