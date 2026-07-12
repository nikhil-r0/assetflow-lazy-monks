import type { NextFunction, Request, Response } from "express";

/** Shared application errors. */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: Array<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "AppError";

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace?.(this);
  }
}

export class NotImplementedError extends AppError {
  constructor(method: string) {
    super("NOT_IMPLEMENTED", 501, `${method} is not implemented yet`);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", 404, message);
  }
}

/**
 * Global Express error handler.
 * Must be registered last in app.ts.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error("Unhandled Error:", err);

  return res.status(500).json({
    error: {
      code: "INTERNAL",
      message: "An unexpected internal error occurred.",
    },
  });
}