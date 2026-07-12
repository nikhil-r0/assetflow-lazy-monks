import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public code: string;
  public httpStatus: number;
  public details?: any[];

  constructor(code: string, httpStatus: number, message: string, details?: any[]) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    Error.captureStackTrace(this);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle generic errors
  console.error('Unhandled Error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'An unexpected internal error occurred.',
    },
  });
};
