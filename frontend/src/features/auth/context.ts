import { type User } from "firebase/auth";

export interface AuthContext {
    user: User | null;
    loading: boolean;
}
