package handler

import (
	"context"

	"cloud.google.com/go/firestore"
)

// MockAIClient is a mock implementation of AIGenerator for testing
type MockAIClient struct {
	GenerateResponseFn     func(ctx context.Context, name, role, topic string, whiteboard map[string]interface{}, recentContext string, userInstruction string, reply *ReplyContext) (map[string]interface{}, error)
	UpdateTalkWhiteboardFn func(ctx context.Context, docRef *firestore.DocumentRef, summary string, ideas []interface{})
	GenerateEmojiFn        func(ctx context.Context, topic string) (string, error)
	EmbedTextFn            func(ctx context.Context, text string) ([]float32, error)

	GenerateResponseCalled     bool
	UpdateTalkWhiteboardCalled bool
	GenerateEmojiCalled        bool
	EmbedTextCalled            bool
}

// GenerateResponse はテスト用のモック実装です。
func (m *MockAIClient) GenerateResponse(ctx context.Context, name, role, topic string, whiteboard map[string]interface{}, recentContext string, userInstruction string, reply *ReplyContext) (map[string]interface{}, error) {
	m.GenerateResponseCalled = true
	if m.GenerateResponseFn != nil {
		return m.GenerateResponseFn(ctx, name, role, topic, whiteboard, recentContext, userInstruction, reply)
	}
	return map[string]interface{}{
		"message": "Mock response",
		"summary": "Mock summary",
		"ideas":   []interface{}{map[string]interface{}{"name": "Mock Idea", "details": "Mock details"}},
	}, nil
}

// UpdateTalkWhiteboard はテスト用のモック実装です。
func (m *MockAIClient) UpdateTalkWhiteboard(ctx context.Context, docRef *firestore.DocumentRef, summary string, ideas []interface{}) {
	m.UpdateTalkWhiteboardCalled = true
	if m.UpdateTalkWhiteboardFn != nil {
		m.UpdateTalkWhiteboardFn(ctx, docRef, summary, ideas)
	}
}

// GenerateEmoji はテスト用のモック実装です。
func (m *MockAIClient) GenerateEmoji(ctx context.Context, topic string) (string, error) {
	m.GenerateEmojiCalled = true
	if m.GenerateEmojiFn != nil {
		return m.GenerateEmojiFn(ctx, topic)
	}
	return "🦌", nil
}

// EmbedText はテスト用のモック実装です。
func (m *MockAIClient) EmbedText(ctx context.Context, text string) ([]float32, error) {
	m.EmbedTextCalled = true
	if m.EmbedTextFn != nil {
		return m.EmbedTextFn(ctx, text)
	}
	return []float32{0.1, 0.2, 0.3}, nil
}

var _ AIGenerator = (*MockAIClient)(nil)
