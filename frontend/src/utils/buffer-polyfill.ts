// Simple Buffer polyfill for browser environments
export class BufferPolyfill extends Uint8Array {
  constructor(input?: any, encoding?: string) {
    if (typeof input === 'string') {
      const encoder = new TextEncoder()
      super(encoder.encode(input))
    } else if (typeof input === 'number') {
      super(input)
    } else if (input instanceof ArrayBuffer) {
      super(input)
    } else if (Array.isArray(input)) {
      super(input)
    } else if (input) {
      super(input)
    } else {
      super()
    }
  }

  static fromString(input: string, encoding?: string): BufferPolyfill {
    return new BufferPolyfill(input, encoding)
  }

  static alloc(size: number): BufferPolyfill {
    return new BufferPolyfill(size)
  }

  toString(encoding?: string): string {
    const decoder = new TextDecoder(encoding || 'utf8')
    return decoder.decode(this)
  }
}

// Make it available globally if needed
if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = BufferPolyfill as any
}

export default BufferPolyfill
