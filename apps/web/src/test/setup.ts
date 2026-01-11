// Vitest setup file
import { afterEach } from 'vitest'
import 'fake-indexeddb/auto'

// Mock crypto.randomUUID for Node.js environment
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  // @ts-ignore
  global.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      digest: async (algorithm: string, data: BufferSource) => {
        // Simple mock - in real tests we'd use Node's crypto
        return new ArrayBuffer(32)
      },
    },
  }
}

afterEach(() => {
  // Test cleanup will go here
})
