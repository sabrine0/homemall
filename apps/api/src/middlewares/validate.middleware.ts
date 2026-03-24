import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "./error.middleware.js";

const formatIssueMessage = (path: Array<string | number>, message: string): string => {
  if (!path.length) {
    return message;
  }
  return `${path.join(".")}: ${message}`;
};

export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new ApiError(
          400,
          parsed.error.issues
            .map((issue) => formatIssueMessage(issue.path, issue.message))
            .join(", "),
        ),
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(
        new ApiError(
          400,
          parsed.error.issues
            .map((issue) => formatIssueMessage(issue.path, issue.message))
            .join(", "),
        ),
      );
      return;
    }
    req.query = parsed.data as Request["query"];
    next();
  };
};
