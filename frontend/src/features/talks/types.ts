import { Timestamp } from "firebase/firestore";

export interface Talk {
    id: string;
    ownerId: string;
    topic: string;
    updatedAt: Timestamp;
}
