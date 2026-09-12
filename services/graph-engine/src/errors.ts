/** Error carrying an HTTP status; the Hono onError handler maps it to `{error}`. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}
