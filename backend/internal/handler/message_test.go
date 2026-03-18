package handler

import (
	"context"
	"testing"

	"cloud.google.com/go/firestore"
	"connectrpc.com/connect"
	"google.golang.org/api/option"

	apiv1 "github.com/ballfos/ideerthon/gen/proto/api/v1"
	"github.com/ballfos/ideerthon/internal/middleware"
)

func TestMessageHandler_SendMessage(t *testing.T) {
	ctx := context.Background()

	// Create firestore client for emulator
	client, err := firestore.NewClient(ctx, "ideerthon", option.WithoutAuthentication())
	if err != nil {
		t.Fatalf("Failed to create firestore client: %v", err)
	}
	defer client.Close()

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
