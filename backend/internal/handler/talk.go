package handler

import (
	"context"
	"fmt"
	"time"

	"math/rand"

	"cloud.google.com/go/firestore"
	"connectrpc.com/connect"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"

	apiv1 "github.com/ballfos/ideerthon/gen/proto/api/v1"
	"github.com/ballfos/ideerthon/gen/proto/api/v1/apiv1connect"
	"github.com/ballfos/ideerthon/internal/middleware"
)

type TalkHandler struct {
	apiv1connect.UnimplementedTalkServiceHandler
	firestore *firestore.Client
}

func NewTalkHandler(fs *firestore.Client) *TalkHandler {
	return &TalkHandler{
		firestore: fs,
	}
}

func (h *TalkHandler) CreateTalk(
	ctx context.Context,
	req *connect.Request[apiv1.CreateTalkRequest],
) (*connect.Response[apiv1.CreateTalkResponse], error) {
	uid, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	now := time.Now()
	id := uuid.New().String()

	// Firestore data
	data := map[string]interface{}{
		"ownerId":   uid,
		"topic":     req.Msg.Topic,
		"createdAt": now,
		"updatedAt": now,
	}

	// Save to Firestore
	_, err := h.firestore.Collection("talks").Doc(id).Set(ctx, data)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save talk: %v", err))
	}
	// Implement `StartTalkStream`:
	// - Validate user authentication.
	// - Check current talk status and `last_heartbeat`. Ignore if `RUNNING` and `last_heartbeat` < 20s ago.
	// - Update talk to `status=RUNNING`, `remaining_count=4`, `last_heartbeat=now`.
	// - Enter a loop:
	//     - Use a ticker or periodic check (e.g., every 1s) to monitor Firestore `status` and `ctx.Done()` for immediate cancellation.
	//     - Generate dummy message (4s total wait, but check cancellation periodically).
	//     - Save message to Firestore sub-collection `messages`.
	//     - Stream message to client.
	//     - Update `remaining_count` and `last_heartbeat` in Firestore.
	//     - Exit immediately if `ctx.Done()` is closed, `remaining_count` reached 0, or Firestore `status` becomes `STOPPED`.

	// Create the response talk object
	talk := &apiv1.Talk{
		Id:        id,
		OwnerId:   uid,
		Topic:     req.Msg.Topic,
		CreatedAt: timestamppb.New(now),
		UpdatedAt: timestamppb.New(now),
	}

	res := connect.NewResponse(&apiv1.CreateTalkResponse{
		Talk: talk,
	})

	return res, nil
}
func (h *TalkHandler) StartTalkStream(
	ctx context.Context,
	req *connect.Request[apiv1.StartTalkStreamRequest],
	stream *connect.ServerStream[apiv1.Message],
) error {
	uid, ok := middleware.GetUID(ctx)
	if !ok {
		return connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}
	_ = uid // Keep for future use if needed, or remove if strictly following no-unused rule

	talkID := req.Msg.TalkId
	docRef := h.firestore.Collection("talks").Doc(talkID)

	// Check current status
	doc, err := docRef.Get(ctx)
	if err != nil {
		return connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get talk: %v", err))
	}

	data := doc.Data()
	status, _ := data["status"].(int64)
	lastHeartbeat, _ := data["lastHeartbeat"].(time.Time)

	// Check if agents exist
	agentsData, _ := data["agents"].([]interface{})
	if len(agentsData) == 0 {
		return connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("no agents in this talk"))
	}

	if status == int64(apiv1.TalkStatus_TALK_STATUS_RUNNING) && time.Since(lastHeartbeat) < 20*time.Second {
		// Ignore Start command if already running and heartbeat is recent
		return nil
	}

	// Update to RUNNING
	now := time.Now()
	remainingCount := int32(4)
	_, err = docRef.Update(ctx, []firestore.Update{
		{Path: "status", Value: int64(apiv1.TalkStatus_TALK_STATUS_RUNNING)},
		{Path: "remainingCount", Value: remainingCount},
		{Path: "lastHeartbeat", Value: now},
	})
	if err != nil {
		return connect.NewError(connect.CodeInternal, fmt.Errorf("failed to update talk status: %v", err))
	}

	// Channel to signal STOPPED status from snapshot listener
	stopChan := make(chan struct{})
	go func() {
		iter := docRef.Snapshots(ctx)
		defer iter.Stop()
		for {
			snap, err := iter.Next()
			if err != nil {
				return
			}
			if !snap.Exists() {
				return
			}
			s, _ := snap.Data()["status"].(int64)
			if s == int64(apiv1.TalkStatus_TALK_STATUS_STOPPED) {
				close(stopChan)
				return
			}
		}
	}()

	for remainingCount > 0 {
		// Wait for 4s with cancellation check
		select {
		case <-ctx.Done():
			return nil
		case <-stopChan:
			return nil
		case <-time.After(4 * time.Second):
			// Proceed to generate message
		}

		// Re-check status before proceeding
		if remainingCount <= 0 {
			break
		}

		// Generate dummy message
		text := generateDummyText()
		msgID := uuid.New().String()
		msgTime := time.Now()

		// Select a random agent
		selectedAgent := agentsData[rand.Intn(len(agentsData))].(map[string]interface{})
		agentName, _ := selectedAgent["name"].(string)

		msgData := map[string]interface{}{
			"uid":       "ai", // System/AI UID
			"text":      text,
			"createdAt": msgTime,
			"talkId":    talkID,
			"agentName": agentName,
		}

		// Save to Firestore
		_, err = docRef.Collection("messages").Doc(msgID).Set(ctx, msgData)
		if err != nil {
			return connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save reply message: %v", err))
		}

		// Send to stream
		if err := stream.Send(&apiv1.Message{
			Id:        msgID,
			Uid:       "ai",
			Text:      text,
			CreatedAt: timestamppb.New(msgTime),
			TalkId:    talkID,
			AgentName: agentName,
		}); err != nil {
			return err
		}

		remainingCount--
		_, _ = docRef.Update(ctx, []firestore.Update{
			{Path: "remainingCount", Value: remainingCount},
			{Path: "lastHeartbeat", Value: time.Now()},
		})
	}

	// Finish loop, set to STOPPED
	_, _ = docRef.Update(ctx, []firestore.Update{
		{Path: "status", Value: int64(apiv1.TalkStatus_TALK_STATUS_STOPPED)},
	})

	return nil
}

func (h *TalkHandler) StopTalkStream(
	ctx context.Context,
	req *connect.Request[apiv1.StopTalkStreamRequest],
) (*connect.Response[apiv1.StopTalkStreamResponse], error) {
	_, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	_, err := h.firestore.Collection("talks").Doc(req.Msg.TalkId).Update(ctx, []firestore.Update{
		{Path: "status", Value: int64(apiv1.TalkStatus_TALK_STATUS_STOPPED)},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to stop talk: %v", err))
	}

	return connect.NewResponse(&apiv1.StopTalkStreamResponse{}), nil
}

func (h *TalkHandler) AddAgent(
	ctx context.Context,
	req *connect.Request[apiv1.AddAgentRequest],
) (*connect.Response[apiv1.AddAgentResponse], error) {
	_, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	talkID := req.Msg.TalkId
	agent := req.Msg.Agent

	if agent == nil || agent.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("agent name is required"))
	}

	docRef := h.firestore.Collection("talks").Doc(talkID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{
			Path:  "agents",
			Value: firestore.ArrayUnion(map[string]interface{}{"name": agent.Name, "description": agent.Description}),
		},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to add agent: %v", err))
	}

	return connect.NewResponse(&apiv1.AddAgentResponse{}), nil
}

func generateDummyText() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 20)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}
