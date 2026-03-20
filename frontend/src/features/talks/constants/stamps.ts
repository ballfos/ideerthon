export interface Stamp {
    id: string;
    name: string;
    path: string;
    prompt: string;
}

export const STAMPS: Stamp[] = [
    {
        id: "Hukabori",
        name: "深掘り",
        path: "/stamps/Hukabori.jpg",
        prompt: "このアイデアについて、もっと深掘りして。",
    },
    {
        id: "Wadaigae",
        name: "話題変え",
        path: "/stamps/Wadaigae1.jpg",
        prompt: "話題を変えて、新しい視点で話し合ってみましょう。",
    },
];

export const getStampByPrompt = (prompt: string) => STAMPS.find(s => s.prompt === prompt);
export const getStampById = (id: string) => STAMPS.find(s => s.id === id);
