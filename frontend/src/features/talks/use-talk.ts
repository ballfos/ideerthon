import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth";
import { db } from "@/lib/firebase";

import type { Talk } from "./types";

export const useTalks = () => {
    const { user } = useAuth();
    const [talks, setTalks] = useState<Talk[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!user) {
            setTalks([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const talksRef = collection(db, "talks");
        // Firebaseの設定によってはインデックスエラーが出るため、ローカルでソートすることも可能ですが、
        // 要件に応じて orderBy を入れています。
        const q = query(
            talksRef,
            where("ownerId", "==", user.uid),
            orderBy("updatedAt", "desc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetchedTalks = snapshot.docs.map((doc) => {
                    const data = doc.data() as { ownerId: string; topic: string; updatedAt: import('firebase/firestore').Timestamp };
                    return {
                        id: doc.id,
                        ownerId: data.ownerId,
                        topic: data.topic,
                        updatedAt: data.updatedAt,
                    };
                });
                setTalks(fetchedTalks);
                setLoading(false);
            },
            (err) => {
                console.error("トーク一覧の取得に失敗しました:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => { unsubscribe(); };
    }, [user]);

    return { error, loading, talks };
};
