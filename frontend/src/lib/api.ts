import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { TalkService } from "../gen/proto/api/v1/talk_pb";
import { MessageService } from "../gen/proto/api/v1/message_pb";
import { getAuth } from "firebase/auth";

const transport = createConnectTransport({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    interceptors: [
        (next) => async (req) => {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            if (token) {
                req.header.set("Authorization", `Bearer ${token}`);
            }
            return await next(req);
        },
    ],
});

export const talkClient = createClient(TalkService, transport);
export const messageClient = createClient(MessageService, transport);
