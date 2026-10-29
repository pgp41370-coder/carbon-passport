/** Expected parse failures, identified by code (class names do not survive minification). */
export class ParseError extends Error {
  readonly code: 'password' | 'unreadable'

  constructor(code: 'password' | 'unreadable', message: string) {
    super(message)
    this.name = 'ParseError'
    this.code = code
  }
}
