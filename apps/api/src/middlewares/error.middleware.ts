import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

type HttpError = Error & {
  expose?: boolean;
  status?: number;
  statusCode?: number;
  type?: string;
};

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  const httpError = error as HttpError;
  const statusCode =
    httpError.type === "entity.parse.failed"
      ? 400
      : httpError.statusCode ?? httpError.status;

  if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 600) {
    res.status(statusCode).json({
      message:
        httpError.expose && error.message
          ? error.message
          : statusCode >= 500
            ? "Internal server error"
            : "Request failed"
    });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
};
