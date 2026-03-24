import type {
  ForgotPasswordRequestInputDto,
  ResetPasswordInputDto,
  UpdateAccountInputDto,
  VerifyResetCodeInputDto
} from "@homemall/shared";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 7
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const payload = await authService.signup(email, password);
  res.cookie(env.COOKIE_NAME, payload.token, cookieOptions);
  res.status(201).json({ user: payload.user, token: payload.token });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const payload = await authService.login(email, password);
  if (payload.user.role !== "USER") {
    throw new ApiError(403, "Admin accounts must use the backoffice login at /admin/login");
  }
  res.cookie(env.COOKIE_NAME, payload.token, cookieOptions);
  res.json({ user: payload.user, token: payload.token });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.me(req.user!.id);
  res.json({ user });
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as UpdateAccountInputDto;
  const user = await authService.updateMe(req.user!.id, payload);
  res.json({ user });
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie(env.COOKIE_NAME, cookieOptions);
  res.status(204).send();
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const payload = req.body as ForgotPasswordRequestInputDto;
  const result = await authService.requestPasswordReset(payload.email);
  res.json(result);
};

export const verifyForgotPasswordCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  const payload = req.body as VerifyResetCodeInputDto;
  const result = await authService.verifyPasswordResetCode(
    payload.email,
    payload.code
  );
  res.json(result);
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const payload = req.body as ResetPasswordInputDto;
  const result = await authService.resetPassword(
    payload.email,
    payload.code,
    payload.newPassword
  );
  res.json(result);
};
