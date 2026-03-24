import { cookies } from "next/headers";

const COOKIE_NAME = process.env.COOKIE_NAME || "homemall_token";

export const getServerSessionState = () => {
  const token = cookies().get(COOKIE_NAME)?.value;
  return {
    isAuthenticated: Boolean(token),
  };
};
