import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'

vi.mock('fs')

import { getSidecarPath, readSidecar, writeSidecar } from './layoutSidecar'

describe('getSidecarPath', () => {
  it('appends .layout.json to mmd path', () => {
    expect(getSidecarPath('/path/to/file.mmd')).toBe('/path/to/file.mmd.layout.json')
  })
})

describe('readSidecar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns file content when sidecar exists', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('{"version":1,"nodes":{},"viewport":{"x":0,"y":0,"zoom":1}}')
    const result = readSidecar('/path/to/file.mmd')
    expect(result).toBe('{"version":1,"nodes":{},"viewport":{"x":0,"y":0,"zoom":1}}')
    expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.mmd.layout.json', 'utf-8')
  })

  it('returns null when sidecar file does not exist', () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('ENOENT: no such file') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const result = readSidecar('/path/to/file.mmd')
    expect(result).toBeNull()
  })

  it('returns null on read error (non-ENOENT)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('EACCES: permission denied') as NodeJS.ErrnoException
      err.code = 'EACCES'
      throw err
    })
    const result = readSidecar('/path/to/file.mmd')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('writeSidecar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.writeFileSync).mockImplementation(() => {})
    vi.mocked(fs.renameSync).mockImplementation(() => {})
  })

  it('writes to tmp file then renames to final path', () => {
    writeSidecar('/path/to/file.mmd', '{"version":1}')
    expect(fs.writeFileSync).toHaveBeenCalledWith('/path/to/file.mmd.layout.json.tmp', '{"version":1}', 'utf-8')
    expect(fs.renameSync).toHaveBeenCalledWith('/path/to/file.mmd.layout.json.tmp', '/path/to/file.mmd.layout.json')
  })

  it('throws when writeFileSync fails', () => {
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('Disk full')
    })
    expect(() => writeSidecar('/path/to/file.mmd', '{"version":1}')).toThrow('Disk full')
  })
})
