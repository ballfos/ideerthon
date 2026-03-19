package handler

import (
	"context"
	"testing"

	"cloud.google.com/go/firestore"
	"connectrpc.com/connect"
	apiv1 "github.com/ballfos/ideerthon/gen/proto/api/v1"
	"github.com/ballfos/ideerthon/internal/middleware"
	"github.com/stretchr/testify/assert"
	"google.golang.org/api/option"
)

func TestTalkHandler_CreateTalk(t *testing.T) {
	ctx := context.Background()

	// Firebase Emulator connection
	client, err := firestore.NewClient(ctx, "ideerthon", option.WithoutAuthentication())
	if err != nil {
		t.Fatalf("Failed to create firestore client: %v", err)
	}
	defer func() {
		_ = client.Close()
	}()

	mockAI := &MockAIClient{}
	h := NewTalkHandler(client, mockAI)

	uid := "test-user-123"
	ctx = context.WithValue(ctx, middleware.UIDKey, uid)

	req := connect.NewRequest(&apiv1.CreateTalkRequest{
		Topic: "Test Topic",
		Agents: []*apiv1.Agent{
			{Name: "Agent 1", Description: "Description 1"},
		},
	})

	res, err := h.CreateTalk(ctx, req)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "Test Topic", res.Msg.Talk.Topic)
	assert.Equal(t, uid, res.Msg.Talk.OwnerId)

	// Verify in Firestore
	doc, err := client.Collection("talks").Doc(res.Msg.Talk.Id).Get(ctx)
	assert.NoError(t, err)
	assert.True(t, doc.Exists())
	data := doc.Data()
	assert.Equal(t, "Test Topic", data["topic"])
	assert.Equal(t, uid, data["ownerId"])

	agents := data["agents"].([]interface{})
	assert.Len(t, agents, 1)
	agent := agents[0].(map[string]interface{})
	assert.Equal(t, "Agent 1", agent["name"])
}
