/** Shared errors — Track A owns middleware wiring; B seeded AppError / NotImplemented. */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: Array<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotImplementedError extends AppError {
  constructor(method: string) {
    super("NOT_IMPLEMENTED", 501, `${method} is not implemented yet`);
  }
}
