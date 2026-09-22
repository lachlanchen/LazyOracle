import { beforeEach, describe, expect, it } from 'vitest'
import { crashedDeviceModelId, DEVICE_MODELS, selectDeviceModel, selectedDeviceModel, takeCrashedDeviceModel } from './device-model'

const ATTEMPT_KEY = 'lazyoracle.deviceModel.attempt'

describe('on-device model catalogue', () => {
  it('offers the three Tianji tiers with a small context and a mirror', () => {
    expect(DEVICE_MODELS.map((m) => m.id)).toEqual(['tianji-mini', 'tianji-fast', 'tianji-pro'])
    for (const model of DEVICE_MODELS) {
      expect(model.url).toMatch(/^https:\/\/huggingface\.co\/.+\.gguf$/)
      expect(model.mirror).toBe(model.url.replace('huggingface.co', 'hf-mirror.com'))
      // The KV cache is what exhausts a phone, so the window stays modest.
      expect(model.contextTokens).toBeLessThanOrEqual(2048)
      expect(model.name.en).toMatch(/^Tianji /)
      expect(model.name.zh).toMatch(/^天机/)
    }
  })

  it('orders the tiers from smallest to largest, with one that fits a modest phone', () => {
    const sizes = DEVICE_MODELS.map((model) => model.sizeMb)
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b))
    // A four-gigabyte phone gives its web view a fraction of that, and
    // loading needs several times the file, so the smallest must stay small.
    expect(sizes[0]).toBeLessThan(320)
    expect(DEVICE_MODELS[0].contextTokens).toBeLessThanOrEqual(1024)
  })
})

describe('crash guard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reports nothing when the last load finished cleanly', () => {
    selectDeviceModel('tianji-fast')
    expect(takeCrashedDeviceModel()).toBeNull()
    expect(selectedDeviceModel()?.id).toBe('tianji-fast')
  })

  it('remembers the crash so the next attempt can start from a clean file', () => {
    selectDeviceModel('tianji-fast')
    localStorage.setItem(ATTEMPT_KEY, 'tianji-fast')
    takeCrashedDeviceModel()
    expect(localStorage.getItem('lazyoracle.deviceModel.crashed')).toBe('tianji-fast')
  })

  it('forgets a model whose load left an unfinished attempt behind', () => {
    selectDeviceModel('tianji-pro')
    localStorage.setItem(ATTEMPT_KEY, 'tianji-pro')
    const crashed = takeCrashedDeviceModel()
    expect(crashed?.id).toBe('tianji-pro')
    // Deselected, so the next start cannot repeat the same crash.
    expect(selectedDeviceModel()).toBeNull()
    expect(crashedDeviceModelId()).toBeNull()
    expect(takeCrashedDeviceModel()).toBeNull()
  })
})
