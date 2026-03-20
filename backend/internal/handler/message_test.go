package handler

import (
	"context"
	"testing"

	"cloud.google.com/go/firestore"
	"connectrpc.com/connect"
	apiv1 "github.com/ballfos/ideerthon/gen/proto/api/v1"
	"github.com/ballfos/ideerthon/internal/middleware"
	"google.golang.org/api/option"
)

func TestMessageHandler_SendMessage(t *testing.T) {
	ctx := context.Background()

	// Create firestore client for emulator
	client, err := firestore.NewClient(ctx, "ideerthon", option.WithoutAuthentication())
	if err != nil {
		t.Fatalf("Failed to create firestore client: %v", err)
	}
	defer func() {
		_ = client.Close()
	}()

	h := NewMessageHandler(client)

	// Mock context with UID
	ctx = context.WithValue(ctx, middleware.UIDKey, "test-user")

	req := connect.NewRequest(&apiv1.SendMessageRequest{
		TalkId: "test-talk",
		Text:   "Hello from test",
	})

	res, err := h.SendMessage(ctx, req)
	if err != nil {
		t.Fatalf("SendMessage failed: %v", err)
	}

	if res.Msg.Message.Text != "Hello from test" {
		t.Errorf("Expected text 'Hello from test', got '%s'", res.Msg.Message.Text)
	}

	if res.Msg.Message.Uid != "test-user" {
		t.Errorf("Expected uid 'test-user', got '%s'", res.Msg.Message.Uid)
	}

	// Verify in Firestore
	doc, err := client.Collection("talks").Doc("test-talk").Collection("messages").Doc(res.Msg.Message.Id).Get(ctx)
	if err != nil {
		t.Fatalf("Failed to get message from firestore: %v", err)
	}

	if doc.Data()["text"] != "Hello from test" {
		t.Errorf("Expected text in firestore 'Hello from test', got '%v'", doc.Data()["text"])
	}
}

func FuzzSendMessage(f *testing.F) {
	ctx := context.Background()
	// エミュレータ用の Firestore クライアント
	client, err := firestore.NewClient(ctx, "ideerthon", option.WithoutAuthentication())
	if err != nil {
		f.Skip("Firestore emulator not available")
	}
	defer client.Close()

	h := NewMessageHandler(client)
	// UID をコンテキストにセット
	ctx = context.WithValue(ctx, middleware.UIDKey, "fuzz-user")

	// シードコーパスの追加
	f.Add("test-talk", "hello", "")
	f.Add("", "text", "")
	f.Add("talk", "", "")

	f.Fuzz(func(t *testing.T, talkID string, text string, replyTo string) {
		req := connect.NewRequest(&apiv1.SendMessageRequest{
			TalkId:           talkID,
			Text:             text,
			ReplyToMessageId: replyTo,
		})

		_, err := h.SendMessage(ctx, req)

		// バリデーションエラーが期待されるケース
		if talkID == "" || text == "" {
			if err == nil {
				t.Error("Expected error for empty talkID or text, but got nil")
			}
			return
		}

		// それ以外の場合、少なくともパニックを起こしてはならない
	})
}
