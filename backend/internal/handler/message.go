package handler

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"connectrpc.com/connect"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"

	apiv1 "github.com/ballfos/ideerthon/gen/proto/api/v1"
	"github.com/ballfos/ideerthon/gen/proto/api/v1/apiv1connect"
	"github.com/ballfos/ideerthon/internal/middleware"
)

type MessageHandler struct {
	apiv1connect.UnimplementedMessageServiceHandler
	firestore *firestore.Client
}

func NewMessageHandler(fs *firestore.Client) *MessageHandler {
	return &MessageHandler{
		firestore: fs,
	}
}

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
		"uid":        uid,
		"text":       req.Msg.Text,
		"createdAt":  now,
		"talkId":     req.Msg.TalkId,
		"isFavorite": false,
	}

	// Save to Firestore: talks/{talkId}/messages/{messageId}
	fmt.Printf("Saving message to Firestore: talks/%s/messages/%s\n", req.Msg.TalkId, id)
	_, err := h.firestore.Collection("talks").Doc(req.Msg.TalkId).Collection("messages").Doc(id).Set(ctx, data)
	if err != nil {
		fmt.Printf("Failed to save message: %v\n", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save message: %v", err))
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

func (h *MessageHandler) ToggleFavorite(
	ctx context.Context,
	req *connect.Request[apiv1.ToggleFavoriteRequest],
) (*connect.Response[apiv1.ToggleFavoriteResponse], error) {
	_, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	docRef := h.firestore.Collection("talks").Doc(req.Msg.TalkId).Collection("messages").Doc(req.Msg.MessageId)

	err := h.firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(docRef)
		if err != nil {
			return err
		}

		isFavorite, _ := doc.Data()["isFavorite"].(bool)
		return tx.Update(docRef, []firestore.Update{
			{Path: "isFavorite", Value: !isFavorite},
		})
	})

	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to toggle favorite: %v", err))
	}

	// 最終的な状態を取得して返す（トランザクション後）
	doc, err := docRef.Get(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch updated message: %v", err))
	}
	isFavorite, _ := doc.Data()["isFavorite"].(bool)

	return connect.NewResponse(&apiv1.ToggleFavoriteResponse{
		IsFavorite: isFavorite,
	}), nil
}

func (h *MessageHandler) ListFavoriteMessages(
	ctx context.Context,
	req *connect.Request[apiv1.ListFavoriteMessagesRequest],
) (*connect.Response[apiv1.ListFavoriteMessagesResponse], error) {
	uid, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	// CollectionGroup を使用してお気に入りを全件取得
	// 注意: インデックス作成が必要な場合がありますが、エミュレータでは自動的に動作することが多いです
	iter := h.firestore.CollectionGroup("messages").
		Where("uid", "==", uid).
		Where("isFavorite", "==", true).
		Documents(ctx)

	docs, err := iter.GetAll()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch favorite messages: %v", err))
	}

	var messages []*apiv1.Message
	for _, doc := range docs {
		data := doc.Data()
		createdAt, _ := data["createdAt"].(time.Time)
		// ドキュメントパス talks/{talkId}/messages/{messageId} から talkId を取得
		talkId := doc.Ref.Parent.Parent.ID

		messages = append(messages, &apiv1.Message{
			Id:         doc.Ref.ID,
			Uid:        data["uid"].(string),
			Text:       data["text"].(string),
			CreatedAt:  timestamppb.New(createdAt),
			IsFavorite: true,
			TalkId:     talkId,
		})
	}

	return connect.NewResponse(&apiv1.ListFavoriteMessagesResponse{
		Messages: messages,
	}), nil
}
