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

// AIGenerator はAIによる応答生成とホワイトボード更新のインターフェースです。
type AIGenerator interface {
	GenerateResponse(ctx context.Context, name, role, topic string, whiteboard map[string]interface{}, recentContext string, reply *ReplyContext) (map[string]interface{}, error)
	//nolint:contextcheck // 内部でUpdateを呼び出しているが、引数のctxを正しく渡しているため。
	UpdateTalkWhiteboard(ctx context.Context, docRef *firestore.DocumentRef, summary string, ideas []interface{})
	GenerateEmoji(ctx context.Context, topic string) (string, error)
	EmbedText(ctx context.Context, text string) ([]float32, error)
}

// AIClient は Vertex AI (Gemini) を使用した AIGenerator の実装です。
type AIClient struct {
	client *genai.Client
}

// Ensure AIClient implements AIGenerator
var _ AIGenerator = (*AIClient)(nil)

// ReplyContext はAIがリプライを行う際に必要なコンテキスト情報を保持します。
type ReplyContext struct {
	ReplyTargetText   string
	ReplyTargetSender string
	ReplyText         string
	PreviousContext   string
}

// NewAIClient は新しい AIClient を作成します。
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

// Close は AIClient のリソースを解放します。
func (a *AIClient) Close() error {
	// genai.Client は現状 Close メソッドを持っていないため、空の実装とします。
	return nil
}

// GenerateResponse は Gemini モデルを使用して対話の応答を生成します。
func (a *AIClient) GenerateResponse(ctx context.Context, name, role, topic string, whiteboard map[string]interface{}, recentContext string, reply *ReplyContext) (map[string]interface{}, error) {
	modelName := "gemini-2.5-flash"

	whiteboardJSON, _ := json.MarshalIndent(whiteboard, "", "  ")
	whiteboardText := string(whiteboardJSON)

	systemInstruction := fmt.Sprintf(`あなたは%sです。%s
必ず「要約」と「アイデア」の文脈を踏まえて発言してください。

【出力形式（JSONのみ）】
{
  "message": "150文字程度の簡潔な新しいアイデアを含む発言内容",
  "summary": "これまでの議論でどんなアイデアが出たかの要約（150文字程度）",
  "ideas": [
    {"name": "アイデア名", "details": "今回の発言に含まれる具体的なアイデアの内容を50文字くらいで"}
  ]
}

【厳守事項】
・「ideas」には、今回のあなたの発言（message）に含まれる新しいアイデアの名前と詳細のみを記述してください。
`, name, role)

	if reply != nil {
		systemInstruction += fmt.Sprintf("\n【リプライ】\nユーザーは「%s」の「%s」という発言に「%s」というリプライをしています。\nこの文脈を最大限に尊重し、その発言に沿って回答してください。", reply.ReplyTargetSender, reply.ReplyTargetText, reply.ReplyText)
	}

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

【現在の要約】
%s

【既存のアイデア名（※これらと被らないようにしてください）】
%s

【直近に出たアイデア】
%s

【直近の会話】
%s
`, topic, whiteboardText, existingIdeasText, lastIdeaText, recentContext)

	if reply != nil {
		prompt += fmt.Sprintf("\n【特定のリプライ先】\n対象発言: %s (%s)\nさらに遡った文脈: %s\n", reply.ReplyTargetText, reply.ReplyTargetSender, reply.PreviousContext)
	}

	prompt += "\n上記の文脈を踏まえて、あなたの役割として発言し、今回の発言内容に基づいたJSON（message, summary, ideas）を出力してください。\n既存のアイデアと重複しない、全く新しい切り口のアイデアを提案してください。"

	const maxOutputTokens = 4096

	config := &genai.GenerateContentConfig{
		Temperature:       genai.Ptr(float32(0.7)),
		ResponseMIMEType:  "application/json",
		MaxOutputTokens:   maxOutputTokens,
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

	// Log finish reason to detect truncation caused by token limit
	if reason := resp.Candidates[0].FinishReason; reason == "MAX_TOKENS" {
		fmt.Printf("warning: AI response was truncated (FinishReason=MAX_TOKENS). Consider increasing MaxOutputTokens (current: %d)\n", maxOutputTokens)
	}

	text := resp.Text()
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal AI response: %w, text: %s", err, text)
	}

	return result, nil
}

// UpdateTalkWhiteboard はトークの要約とアイデア一覧（ホワイトボード）を更新します。
func (a *AIClient) UpdateTalkWhiteboard(ctx context.Context, docRef *firestore.DocumentRef, summary string, ideas []interface{}) {
	_, _ = docRef.Update(ctx, []firestore.Update{
		{Path: "summary", Value: summary},
		{Path: "ideas", Value: ideas},
	})
}

// EmbedText はテキストを固定次元の数値ベクトルに変換（埋め込み）します。
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
// GenerateEmoji はお題に合わせた絵文字を一つ生成します。
func (a *AIClient) GenerateEmoji(ctx context.Context, topic string) (string, error) {
	modelName := "gemini-2.5-flash"

	systemInstruction := "与えられたお題に最もふさわしい絵文字を【一つだけ】出力してください。説明や装飾は一切不要です。"
	prompt := fmt.Sprintf("お題: %s", topic)

	config := &genai.GenerateContentConfig{
		Temperature:       genai.Ptr(float32(1.0)),
		MaxOutputTokens:   10,
		SystemInstruction: &genai.Content{Parts: []*genai.Part{{Text: systemInstruction}}},
	}

	resp, err := a.client.Models.GenerateContent(ctx, modelName, []*genai.Content{{Parts: []*genai.Part{{Text: prompt}}, Role: "user"}}, config)
	if err != nil {
		fmt.Printf("Emoji generation error for %s: %v\n", modelName, err)
		// Fallback to flash if lite fails or not available
		resp, err = a.client.Models.GenerateContent(ctx, "gemini-2.5-flash-lite", []*genai.Content{{Parts: []*genai.Part{{Text: prompt}}, Role: "user"}}, config)
		if err != nil {
			fmt.Printf("Emoji generation fallback error: %v\n", err)
			return "🦌", nil // Defaut fallack
		}
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		fmt.Printf("Emoji generation returned no candidates\n")
		return "🦌", nil
	}

	emoji := strings.TrimSpace(resp.Text())
	// Ensure it's not too long (just in case)
	if len([]rune(emoji)) > 5 {
		emoji = string([]rune(emoji)[0:1])
	}

	return emoji, nil
}
