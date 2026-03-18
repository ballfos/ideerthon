package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/genai"
)

type AIClient struct {
	client *genai.Client
}

func NewAIClient(ctx context.Context, projectID, location string) (*AIClient, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		Project:  projectID,
		Location: location,
		Backend:  genai.BackendVertexAI,
	})
	if err != nil {
		return nil, err
	}
	return &AIClient{client: client}, nil
}

func (a *AIClient) Close() error {
	// genai.Client has no close method documented in the doc, let's keep it as is if needed or empty.
	return nil
}

func (a *AIClient) GenerateResponse(ctx context.Context, name, role, topic string, whiteboard map[string]interface{}, recentContext string) (map[string]interface{}, error) {
	modelName := "gemini-2.5-flash"

	whiteboardJSON, _ := json.MarshalIndent(whiteboard, "", "  ")
	whiteboardText := string(whiteboardJSON)

	systemInstruction := fmt.Sprintf(`あなたは%sです。%s
必ず「共有ホワイトボード」の文脈を踏まえて発言してください。

【出力形式（JSONのみ）】
{
  "message": "150文字程度の簡潔な新しいアイデアを含む発言内容",
  "summary": "これまでの議論の全体的な要約（150文字程度）",
  "ideas": [
    {"name": "アイデア名", "details": "今回の発言に含まれる具体的なアイデアの内容を50文字くらいで"}
  ]
}

【厳守事項】
・「ideas」には、今回のあなたの発言（message）に含まれる新しいアイデアの名前と詳細のみを記述してください。
`, name, role)

	// Extract existing idea names for duplication check
	var existingIdeaNames []string
	if ideas, ok := whiteboard["ideas"].([]interface{}); ok {
		for _, idea := range ideas {
			if ideaMap, ok := idea.(map[string]interface{}); ok {
				if name, ok := ideaMap["name"].(string); ok {
					existingIdeaNames = append(existingIdeaNames, name)
				}
			}
		}
	}

	existingIdeasText := "なし"
	if len(existingIdeaNames) > 0 {
		existingIdeasText = strings.Join(existingIdeaNames, ", ")
	}

	lastIdeaText := "なし"
	if len(existingIdeaNames) > 0 {
		lastIdeaText = existingIdeaNames[len(existingIdeaNames)-1]
	}

	prompt := fmt.Sprintf(`【お題】%s

【現在の共有ホワイトボード（Talk内）】
%s

【既存のアイデア名（※これらと被らないようにしてください）】
%s

【直近に出たアイデア】
%s

【直近の会話】
%s

上記の文脈を踏まえて、あなたの役割として発言し、今回の発言内容に基づいたJSON（message, summary, ideas）を出力してください。
既存のアイデアと重複しない、全く新しい切り口のアイデアを提案してください。`, topic, whiteboardText, existingIdeasText, lastIdeaText, recentContext)

	config := &genai.GenerateContentConfig{
		Temperature:       genai.Ptr(float32(0.7)),
		ResponseMIMEType:  "application/json",
		SystemInstruction: &genai.Content{Parts: []*genai.Part{{Text: systemInstruction}}},
	}

	var resp *genai.GenerateContentResponse
	var err error

	// Try primary model first
	resp, err = a.client.Models.GenerateContent(ctx, modelName, []*genai.Content{{Parts: []*genai.Part{{Text: prompt}}, Role: "user"}}, config)
	if err != nil {
		// If 429, try the lite fallback model
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "RESOURCE_EXHAUSTED") {
			fmt.Printf("Rate limit reached for %s. Falling back to gemini-2.5-flash-lite... 🛡️\n", modelName)
			resp, err = a.client.Models.GenerateContent(ctx, "gemini-2.5-flash-lite", []*genai.Content{{Parts: []*genai.Part{{Text: prompt}}, Role: "user"}}, config)
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from AI")
	}

	text := resp.Text()
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal AI response: %v, text: %s", err, text)
	}

	return result, nil
}

func (a *AIClient) UpdateTalkWhiteboard(ctx context.Context, docRef *firestore.DocumentRef, summary string, ideas []interface{}) {
	_, _ = docRef.Update(ctx, []firestore.Update{
		{Path: "summary", Value: summary},
		{Path: "ideas", Value: ideas},
	})
}

func (a *AIClient) EmbedText(ctx context.Context, text string) ([]float32, error) {
	if text == "" {
		return nil, fmt.Errorf("text is empty")
	}

	for {
		res, err := a.client.Models.EmbedContent(ctx, "text-multilingual-embedding-002", []*genai.Content{{Parts: []*genai.Part{{Text: text}}, Role: "user"}}, &genai.EmbedContentConfig{TaskType: "SEMANTIC_SIMILARITY"})
		if err != nil {
			if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "RESOURCE_EXHAUSTED") {
				fmt.Printf("Embedding rate limit reached (429). Waiting 60 seconds... ☕\n")
				select {
				case <-time.After(60 * time.Second):
					continue
				case <-ctx.Done():
					return nil, ctx.Err()
				}
			}
			return nil, err
		}

		if len(res.Embeddings) == 0 {
			return nil, fmt.Errorf("no embedding returned")
		}
		return res.Embeddings[0].Values, nil
	}
}
