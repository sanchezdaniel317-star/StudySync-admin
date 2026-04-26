import Cookies from "js-cookie";

const TOKEN_KEY = "ss_admin_token";

export const auth = {
  saveToken: (token: string) =>
    Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: "strict" }),
  getToken: (): string | undefined => Cookies.get(TOKEN_KEY),
  removeToken: () => Cookies.remove(TOKEN_KEY),
  isAuthenticated: (): boolean => !!Cookies.get(TOKEN_KEY),
};
