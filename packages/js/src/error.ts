/** Error thrown when the QR Studio API returns a non-2xx response. */
export class QrStudioError extends Error {
  /** HTTP status code from the API (e.g. 400, 413, 429, 500). */
  readonly status: number;
  /** The API's raw response body, when available (usually `{ "error": "…" }`). */
  readonly body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = 'QrStudioError';
    this.status = status;
    this.body = body;
    // Restore prototype chain for instanceof across transpile targets.
    Object.setPrototypeOf(this, QrStudioError.prototype);
  }
}
