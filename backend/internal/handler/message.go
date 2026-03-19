package handler

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"connectrpc.com/connect"
	apiv1 "github.com/ballfos/ideerthon/gen/proto/api/v1"
	"github.com/ballfos/ideerthon/gen/proto/api/v1/apiv1connect"
	"github.com/ballfos/ideerthon/internal/middleware"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// MessageHandler はメッセージに関連する操作を担当するハンドラーです。
type MessageHandler struct {
	apiv1connect.UnimplementedMessageServiceHandler
	firestore *firestore.Client
}

// NewMessageHandler は新しい MessageHandler を作成します。
func NewMessageHandler(fs *firestore.Client) *MessageHandler {
	return &MessageHandler{
		firestore: fs,
	}
}

// SendMessage は新しいメッセージを送信します。
func (h *MessageHandler) SendMessage(
	ctx context.Context,
	req *connect.Request[apiv1.SendMessageRequest],
) (*connect.Response[apiv1.SendMessageResponse], error) {
	uid, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	if req.Msg.TalkId == "" {
		fmt.Printf("Error: talk_id is empty\n")
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("talk_id is required"))
	}
	if req.Msg.Text == "" {
		fmt.Printf("Error: text is empty\n")
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("text is required"))
	}

	fmt.Printf("Processing SendMessage: TalkId=%s, UID=%s, Text=%s\n", req.Msg.TalkId, uid, req.Msg.Text)

	now := time.Now()
	id := uuid.New().String()

	// Firestore data
	data := map[string]interface{}{
		"uid":              uid,
		"text":             req.Msg.Text,
		"createdAt":        now,
		"talkId":           req.Msg.TalkId,
		"isFavorite":       false,
		"replyToMessageId": req.Msg.ReplyToMessageId,
	}

	// Save to Firestore: talks/{talkId}/messages/{messageId}
	fmt.Printf("Saving message to Firestore: talks/%s/messages/%s\n", req.Msg.TalkId, id)
	_, err := h.firestore.Collection("talks").Doc(req.Msg.TalkId).Collection("messages").Doc(id).Set(ctx, data)
	if err != nil {
		fmt.Printf("Failed to save message: %v\n", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save message: %w", err))
	}
	fmt.Printf("Message saved successfully\n")

	// Update talk's updatedAt
	_, err = h.firestore.Collection("talks").Doc(req.Msg.TalkId).Update(ctx, []firestore.Update{
		{Path: "updatedAt", Value: now},
	})
	if err != nil {
		fmt.Printf("Failed to update talk updatedAt: %v\n", err)
		// メッセージ保存自体は成功しているので、トークの更新失敗はログのみに留める（オプション：エラーとして返すことも可能）
	}

	// Create the response message object
	msg := &apiv1.Message{
		Id:         id,
		Uid:        uid,
		Text:       req.Msg.Text,
		CreatedAt:  timestamppb.New(now),
		IsFavorite: false,
		TalkId:     req.Msg.TalkId,
	}

	res := connect.NewResponse(&apiv1.SendMessageResponse{
		Message: msg,
	})

	return res, nil
}

// ToggleFavorite はメッセージのお気に入り状態を切り替えます。
func (h *MessageHandler) ToggleFavorite(
	ctx context.Context,
	req *connect.Request[apiv1.ToggleFavoriteRequest],
) (*connect.Response[apiv1.ToggleFavoriteResponse], error) {
	uid, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	docRef := h.firestore.Collection("talks").Doc(req.Msg.TalkId).Collection("messages").Doc(req.Msg.MessageId)

	var isFavorite bool
	err := h.firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(docRef)
		if err != nil {
			return err
		}

		data := doc.Data()
		favoritedBy, _ := data["favoritedBy"].([]interface{})

		found := false
		for _, u := range favoritedBy {
			if s, ok := u.(string); ok && s == uid {
				found = true
				break
			}
		}

		if found {
			// Remove
			return tx.Update(docRef, []firestore.Update{
				{Path: "favoritedBy", Value: firestore.ArrayRemove(uid)},
			})
		} else {
			// Add
			return tx.Update(docRef, []firestore.Update{
				{Path: "favoritedBy", Value: firestore.ArrayUnion(uid)},
			})
		}
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to toggle favorite: %w", err))
	}

	// 最終的な状態を再取得
	updatedDoc, _ := docRef.Get(ctx)
	updatedData := updatedDoc.Data()
	updatedFavoritedBy, _ := updatedData["favoritedBy"].([]interface{})
	isFavorite = false
	for _, u := range updatedFavoritedBy {
		if s, ok := u.(string); ok && s == uid {
			isFavorite = true
			break
		}
	}

	return connect.NewResponse(&apiv1.ToggleFavoriteResponse{
		IsFavorite: isFavorite,
	}), nil
}

// ListFavoriteMessages はお気に入り登録されたメッセージの一覧を取得します。
func (h *MessageHandler) ListFavoriteMessages(
	ctx context.Context,
	req *connect.Request[apiv1.ListFavoriteMessagesRequest],
) (*connect.Response[apiv1.ListFavoriteMessagesResponse], error) {
	uid, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	// CollectionGroup を使用してお気に入りを全件取得
	// 全ユーザー共通ではなく、ログイン中のユーザーが含まれるもののみ
	iter := h.firestore.CollectionGroup("messages").
		Where("favoritedBy", "array-contains", uid).
		Documents(ctx)

	docs, err := iter.GetAll()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch favorite messages: %w", err))
	}

	var messages []*apiv1.Message
	for _, doc := range docs {
		data := doc.Data()
		createdAt, _ := data["createdAt"].(time.Time)
		// ドキュメントパス talks/{talkId}/messages/{messageId} から talkID を取得
		talkID := doc.Ref.Parent.Parent.ID

		agentName, _ := data["agentName"].(string)
		ideaName, _ := data["ideaName"].(string)

		messages = append(messages, &apiv1.Message{
			Id:         doc.Ref.ID,
			Uid:        data["uid"].(string),
			Text:       data["text"].(string),
			CreatedAt:  timestamppb.New(createdAt),
			IsFavorite: true,
			TalkId:     talkID,
			AgentName:  agentName,
			IdeaName:   ideaName,
		})
	}

	return connect.NewResponse(&apiv1.ListFavoriteMessagesResponse{
		Messages: messages,
	}), nil
}

// DiscardIdea はアイデアを破棄（非表示）にします。
func (h *MessageHandler) DiscardIdea(
	ctx context.Context,
	req *connect.Request[apiv1.DiscardIdeaRequest],
) (*connect.Response[apiv1.DiscardIdeaResponse], error) {
	docRef := h.firestore.Collection("talks").Doc(req.Msg.TalkId).Collection("messages").Doc(req.Msg.MessageId)

	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "isDiscarded", Value: true},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to discard idea: %w", err))
	}

	return connect.NewResponse(&apiv1.DiscardIdeaResponse{}), nil
}

// RecycleIdea はアイデアをリサイクルボックスに送ります。
func (h *MessageHandler) RecycleIdea(
	ctx context.Context,
	req *connect.Request[apiv1.RecycleIdeaRequest],
) (*connect.Response[apiv1.RecycleIdeaResponse], error) {
	docRef := h.firestore.Collection("talks").Doc(req.Msg.TalkId).Collection("messages").Doc(req.Msg.MessageId)

	var ideaName, ideaDetails string
	err := h.firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(docRef)
		if err != nil {
			return err
		}
		data := doc.Data()
		ideaName, _ = data["ideaName"].(string)

		// Extract from ideas list if present
		if ideas, ok := data["ideas"].([]interface{}); ok && len(ideas) > 0 {
			if firstIdea, ok := ideas[0].(map[string]interface{}); ok {
				ideaDetails, _ = firstIdea["details"].(string)
			}
		}
		// Fallback to text
		if ideaDetails == "" {
			ideaDetails, _ = data["text"].(string)
		}

		return tx.Update(docRef, []firestore.Update{
			{Path: "isRecycled", Value: true},
		})
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to recycle idea: %w", err))
	}

	// Add to global recycle box
	if ideaName != "" {
		_, _, _ = h.firestore.Collection("recycled_ideas").Add(ctx, map[string]interface{}{
			"name":        ideaName,
			"details":     ideaDetails,
			"createdAt":   time.Now(),
			"randomValue": time.Now().UnixNano() % 1000000, // For simple random shuffle
		})
	}

	return connect.NewResponse(&apiv1.RecycleIdeaResponse{}), nil
}

// ListRecycledIdeas はリサイクルされたアイデアの一覧を取得します。
func (h *MessageHandler) ListRecycledIdeas(
	ctx context.Context,
	req *connect.Request[apiv1.ListRecycledIdeasRequest],
) (*connect.Response[apiv1.ListRecycledIdeasResponse], error) {
	limit := int(req.Msg.Limit)
	if limit <= 0 {
		limit = 10
	}

	// Simple random: use current time to skip some or start at different point
	// Firestore random is hard without specific tricks, but we'll just Grab newest for now or shuffle in app
	iter := h.firestore.Collection("recycled_ideas").
		OrderBy("createdAt", firestore.Desc).
		Limit(limit).
		Documents(ctx)

	docs, err := iter.GetAll()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch recycled ideas: %w", err))
	}

	var ideas []*apiv1.RecycledIdea
	for _, doc := range docs {
		data := doc.Data()
		created, _ := data["createdAt"].(time.Time)
		ideas = append(ideas, &apiv1.RecycledIdea{
			Id:        doc.Ref.ID,
			Name:      data["name"].(string),
			Details:   data["details"].(string),
			CreatedAt: timestamppb.New(created),
		})
	}

	return connect.NewResponse(&apiv1.ListRecycledIdeasResponse{
		Ideas: ideas,
	}), nil
}
