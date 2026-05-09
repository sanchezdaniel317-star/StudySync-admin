import Cookies from "js-cookie";

const TOKEN_KEY = "ss_admin_token";

export const auth = {
  saveToken: (token: string) =>
    Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: "strict" }),
  getToken: (): string | undefined => Cookies.get(TOKEN_KEY),
  removeToken: () => Cookies.remove(TOKEN_KEY),
  isAuthenticated: (): boolean => !!Cookies.get(TOKEN_KEY),
  getAdminEmail: (): string | null => {
    const token = Cookies.get(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      return (payload.sub as string) ?? (payload.email as string) ?? null;
    } catch {
      return null;
    }
  },
};
