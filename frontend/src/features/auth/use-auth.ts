import { useContext } from "react";

import { AuthReactContext } from "./provider";

/**
 * 認証情報と初期化状態をContextから取得するカスタムフックです。
 *
 * @returns {object} user: 認証済みのユーザー情報(未ログイン時はnull)、loading: 初期化中ならtrue
 */
export const useAuth = () => {
  return useContext(AuthReactContext);
};
