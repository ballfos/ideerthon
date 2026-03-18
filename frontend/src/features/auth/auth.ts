import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Googleアカウントを使用してサインインを行います。
 *
 * @returns {Promise<UserCredential>} サインインしたユーザーの認証情報
 * @throws サインイン処理中にエラーが発生した場合
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Failed to sign in with Google:", error);
    throw error;
  }
};

/**
 * GitHubアカウントを使用してサインインを行います。
 *
 * @returns {Promise<UserCredential>} サインインしたユーザーの認証情報
 * @throws サインイン処理中にエラーが発生した場合
 */
export const signInWithGithub = async (): Promise<UserCredential> => {
  const provider = new GithubAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Failed to sign in with GitHub:", error);
    throw error;
  }
};

/**
 * 現在のユーザーをサインアウトします。
 *
 * @returns {Promise<void>}
 * @throws サインアウト処理中にエラーが発生した場合
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Failed to sign out:", error);
    throw error;
  }
};

/**
 * 現在の認証状態を確実に1度だけ取得します。
 *
 * @returns {Promise<User | null>}
 */
export const getCurrentUser = (): Promise<
  import("firebase/auth").User | null
> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
    );
  });
};
