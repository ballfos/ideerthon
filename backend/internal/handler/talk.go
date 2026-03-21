package handler

import (
	"context"
	"fmt"
	"sort"
	"time"

	"cloud.google.com/go/firestore"
	"connectrpc.com/connect"
	apiv1 "github.com/ballfos/ideerthon/gen/proto/api/v1"
	"github.com/ballfos/ideerthon/gen/proto/api/v1/apiv1connect"
	"github.com/ballfos/ideerthon/internal/middleware"
	"github.com/google/uuid"
	"google.golang.org/api/iterator"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const userSenderName = "ユーザー"

// TalkHandler はトーク（対話）に関する操作を担当するハンドラーです。
type TalkHandler struct {
	apiv1connect.UnimplementedTalkServiceHandler
	firestore *firestore.Client
	ai        AIGenerator
}

// NewTalkHandler は新しい TalkHandler を作成します。
func NewTalkHandler(fs *firestore.Client, ai AIGenerator) *TalkHandler {
	return &TalkHandler{
		firestore: fs,
		ai:        ai,
	}
}

// CreateTalk は新しいトーク（対話）を作成します。
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

	// Extract agents from request
	agents := make([]map[string]interface{}, 0, len(req.Msg.Agents))
	for _, agent := range req.Msg.Agents {
		agents = append(agents, map[string]interface{}{
			"name":        agent.Name,
			"description": agent.Description,
			"icon":        agent.Icon,
		})
	}

	// Generate emoji icon based on topic
	emojiIcon, _ := h.ai.GenerateEmoji(ctx, req.Msg.Topic)
	if emojiIcon == "" {
		emojiIcon = "🦌" // Default
	}

	// Firestore data
	data := map[string]interface{}{
		"ownerId":   uid,
		"topic":     req.Msg.Topic,
		"emojiIcon": emojiIcon,
		"status":    int64(apiv1.TalkStatus_TALK_STATUS_STOPPED),
		"createdAt": now,
		"updatedAt": now,
		"agents":    agents,
	}

	// Save to Firestore
	_, err := h.firestore.Collection("talks").Doc(id).Set(ctx, data)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save talk: %w", err))
	}

	// Create the response talk object
	talk := &apiv1.Talk{
		Id:        id,
		OwnerId:   uid,
		Topic:     req.Msg.Topic,
		EmojiIcon: emojiIcon,
		CreatedAt: timestamppb.New(now),
		UpdatedAt: timestamppb.New(now),
	}

	res := connect.NewResponse(&apiv1.CreateTalkResponse{
		Talk: talk,
	})

	return res, nil
}

// StartTalkStream はトークの進行（AIの自動応答）をストリーミング形式で開始します。
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
		return connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get talk: %w", err))
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
		return connect.NewError(connect.CodeInternal, fmt.Errorf("failed to update talk status: %w", err))
	}

	// Channel and Context to signal STOPPED status from snapshot listener
	streamCtx, cancel := context.WithCancel(ctx)
	defer cancel()

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
				cancel()
				return
			}
		}
	}()

	// Cycle through agents
	agentIdx := 0
	for remainingCount > 0 {
		// Wait for 4s with cancellation check
		select {
		case <-streamCtx.Done():
			return nil
		case <-time.After(4 * time.Second):
		}

		// Refresh talk data to get latest summary and agents
		doc, err := docRef.Get(streamCtx)
		if err != nil {
			return connect.NewError(connect.CodeInternal, fmt.Errorf("failed to refresh talk: %w", err))
		}
		data := doc.Data()
		topic, _ := data["topic"].(string)
		agentsData, _ := data["agents"].([]interface{})
		whiteboard, _ := data["whiteboard"].(map[string]interface{})
		if whiteboard == nil {
			whiteboard = map[string]interface{}{
				"title":   "未定",
				"summary": "議論はこれから始まります。",
				"ideas":   []interface{}{},
			}
		}

		// Cycle through agents
		selectedAgent := agentsData[agentIdx%len(agentsData)].(map[string]interface{})
		agentName, _ := selectedAgent["name"].(string)
		agentDesc, _ := selectedAgent["description"].(string)
		agentIcon, _ := selectedAgent["icon"].(string)
		if agentIcon == "" {
			// Fallback: match by name for existing talks
			switch agentName {
			case "若手エンジニア":
				agentIcon = "monitor"
			case "女子高生":
				agentIcon = "cake-slice"
			case "デザイナー":
				agentIcon = "brush"
			case "おばちゃん":
				agentIcon = "candy"
			case "敏腕マーケター":
				agentIcon = "calculator"
			case "アメリカ人トム":
				agentIcon = "hamburger"
			case "辛口ベンチャーキャピタル":
				agentIcon = "building"
			case "小学生":
				agentIcon = "smile"
			case "おばあちゃん":
				agentIcon = "heart"
			case "アイディアー🦌":
				agentIcon = "🦌"
			}
		}

		// Fetch recent messages for context
		// We want: Recent 2 AI messages + Recent 1 Human message
		msgIter := docRef.Collection("messages").OrderBy("createdAt", firestore.Desc).Limit(20).Documents(streamCtx)
		msgDocs, err := msgIter.GetAll()

		type Msg struct {
			Sender string
			Text   string
			Time   time.Time
		}
		var aiMsgs []Msg
		var humanMsgs []Msg

		if err == nil {
			for _, doc := range msgDocs {
				m := doc.Data()
				uid, _ := m["uid"].(string)
				sender, _ := m["agentName"].(string)
				if sender == "" {
					sender = userSenderName
				}
				text, _ := m["text"].(string)
				createdAt, _ := m["createdAt"].(time.Time)

				if uid == "ai" {
					if len(aiMsgs) < 2 {
						aiMsgs = append(aiMsgs, Msg{Sender: sender, Text: text, Time: createdAt})
					}
				} else {
					if len(humanMsgs) < 1 {
						humanMsgs = append(humanMsgs, Msg{Sender: sender, Text: text, Time: createdAt})
					}
				}
				if len(aiMsgs) >= 2 && len(humanMsgs) >= 1 {
					break
				}
			}
		}

		// Combine and sort chronologically
		combined := make([]Msg, 0, len(aiMsgs)+len(humanMsgs))
		combined = append(combined, aiMsgs...)
		combined = append(combined, humanMsgs...)
		sort.Slice(combined, func(i, j int) bool {
			return combined[i].Time.Before(combined[j].Time)
		})

		// Extra context for replies
		var replyContext string
		var aiReplyInfo *ReplyContext
		if len(msgDocs) > 0 {
			latestMsg := msgDocs[0].Data()
			replyID, _ := latestMsg["replyToMessageId"].(string)
			if replyID != "" {
				// Fetch direct reply target
				var rs *firestore.DocumentSnapshot
				rs, err = docRef.Collection("messages").Doc(replyID).Get(streamCtx)
				if err == nil {
					rd := rs.Data()
					rText, _ := rd["text"].(string)
					rSender, _ := rd["agentName"].(string)
					if rSender == "" {
						rSender = userSenderName
					}
					rTime, _ := rd["createdAt"].(time.Time)

					aiReplyInfo = &ReplyContext{
						ReplyTargetText:   rText,
						ReplyTargetSender: rSender,
					}

					replyContext += fmt.Sprintf("\n--- REPLY TARGET ---\n[%s]: %s\n", rSender, rText)

					// Fetch previous context of the reply target
					prevIter := docRef.Collection("messages").
						Where("createdAt", "<", rTime).
						OrderBy("createdAt", firestore.Desc).
						Limit(1).
						Documents(streamCtx)
					var prevDocs []*firestore.DocumentSnapshot
					prevDocs, err = prevIter.GetAll()
					if err == nil && len(prevDocs) > 0 {
						pd := prevDocs[0].Data()
						pText, _ := pd["text"].(string)
						pSender, _ := pd["agentName"].(string)
						if pSender == "" {
							pSender = userSenderName
						}
						aiReplyInfo.PreviousContext = pText
						replyContext = fmt.Sprintf("\n--- PRE-REPLY CONTEXT ---\n[%s]: %s", pSender, pText) + replyContext
					}
				}
			}
		}

		recentContext := ""
		userInstruction := ""
		for i, m := range combined {
			msgText := m.Text
			// Format the very last message specially if it's a reply
			if i == len(combined)-1 && aiReplyInfo != nil {
				msgText = fmt.Sprintf("「%s」に対して「%s」", aiReplyInfo.ReplyTargetText, m.Text)
				aiReplyInfo.ReplyText = m.Text // Update the actual reply text for the refined system prompt
			}

			if m.Sender == userSenderName {
				userInstruction = msgText
			} else {
				recentContext += fmt.Sprintf("[%s]: %s\n", m.Sender, msgText)
			}
		}

		if replyContext != "" {
			recentContext += "\n[IMPORTANT: The latest message is a reply to a previous discussion point. Focus your response based on this specific context:]"
			recentContext += replyContext
		}

		// AI Response
		aiRes, err := h.ai.GenerateResponse(streamCtx, agentName, agentDesc, topic, whiteboard, recentContext, userInstruction, aiReplyInfo)
		if err != nil {
			if streamCtx.Err() != nil {
				return nil
			}
			fmt.Printf("AI error: %v\n", err)
			aiRes = map[string]interface{}{
				"message": "申し訳ありません、考えがまとまりませんでした。",
			}
		}

		messageText, _ := aiRes["message"].(string)
		summaryText, _ := aiRes["summary"].(string)
		ideas, _ := aiRes["ideas"].([]interface{})

		msgID := uuid.New().String()
		msgTime := time.Now()

		msgData := map[string]interface{}{
			"uid":       "ai",
			"text":      messageText,
			"createdAt": msgTime,
			"talkId":    talkID,
			"agentName": agentName,
			"agentIcon": agentIcon,
			"summary":   summaryText,
			"ideas":     ideas,
		}

		// Save the first idea's name for the idea map label
		if len(ideas) > 0 {
			if firstIdea, ok := ideas[0].(map[string]interface{}); ok {
				if name, ok := firstIdea["name"].(string); ok {
					msgData["ideaName"] = name
				}
			}
		}

		_, err = docRef.Collection("messages").Doc(msgID).Set(streamCtx, msgData)
		if err != nil {
			return connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save reply message: %w", err))
		}

		if err := stream.Send(&apiv1.Message{
			Id:        msgID,
			Uid:       "ai",
			Text:      messageText,
			CreatedAt: timestamppb.New(msgTime),
			TalkId:    talkID,
			AgentName: agentName,
			AgentIcon: agentIcon,
		}); err != nil {
			return err
		}

		remainingCount--
		agentIdx++

		// Update whiteboard every turn since the AI now returns it
		if summaryText != "" || ideas != nil {
			h.ai.UpdateTalkWhiteboard(ctx, docRef, summaryText, ideas)
		}

		// Asynchronously generate and save embedding for the first idea's name (or summary)
		textToEmbed := summaryText
		if len(ideas) > 0 {
			if firstIdea, ok := ideas[0].(map[string]interface{}); ok {
				if name, ok := firstIdea["name"].(string); ok && name != "" {
					textToEmbed = name
				}
			}
		}

		if textToEmbed != "" {
			// #nosec G118: Request-scoped context is NOT used because embedding should finish even if client disconnects.
			//nolint:contextcheck // バックグラウンドで実行するため、リクエストのctxではなくBackgroundを使用する。
			go func(mID string, text string) {
				bgCtx := context.Background()
				emb, err := h.ai.EmbedText(bgCtx, text)
				if err != nil {
					fmt.Printf("failed to embed summary: %v\n", err)
					return
				}

				_, err = docRef.Collection("messages").Doc(mID).Update(bgCtx, []firestore.Update{
					{Path: "embedding", Value: emb},
				})
				if err != nil {
					fmt.Printf("failed to update message with embedding: %v\n", err)
				}
			}(msgID, textToEmbed)
		}

		_, _ = docRef.Update(streamCtx, []firestore.Update{
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

// StopTalkStream はトークの進行を強制停止します。
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
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to stop talk: %w", err))
	}

	return connect.NewResponse(&apiv1.StopTalkStreamResponse{}), nil
}

// AddAgent はトークに新しいAIエージェントを追加します。
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
			Value: firestore.ArrayUnion(map[string]interface{}{"name": agent.Name, "description": agent.Description, "icon": agent.Icon}),
		},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to add agent: %w", err))
	}

	return connect.NewResponse(&apiv1.AddAgentResponse{}), nil
}

// RemoveAgent はトークからエージェントを削除します。
func (h *TalkHandler) RemoveAgent(ctx context.Context, req *connect.Request[apiv1.RemoveAgentRequest]) (*connect.Response[apiv1.RemoveAgentResponse], error) {
	talkID := req.Msg.TalkId
	idx := int(req.Msg.AgentIndex)

	docRef := h.firestore.Collection("talks").Doc(talkID)
	docSnap, err := docRef.Get(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("talk not found"))
	}

	var agents []interface{}
	if data, ok := docSnap.Data()["agents"].([]interface{}); ok {
		agents = data
	}

	if idx < 0 || idx >= len(agents) {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid agent index"))
	}

	// Remove at index
	agents = append(agents[:idx], agents[idx+1:]...)

	_, err = docRef.Update(ctx, []firestore.Update{
		{
			Path:  "agents",
			Value: agents,
		},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to remove agent: %w", err))
	}

	return connect.NewResponse(&apiv1.RemoveAgentResponse{}), nil
}

// UpdateAgent はトーク内のエージェントの設定を更新します。
func (h *TalkHandler) UpdateAgent(ctx context.Context, req *connect.Request[apiv1.UpdateAgentRequest]) (*connect.Response[apiv1.UpdateAgentResponse], error) {
	talkID := req.Msg.TalkId
	idx := int(req.Msg.AgentIndex)
	agent := req.Msg.Agent

	if agent == nil || agent.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("agent name is required"))
	}

	docRef := h.firestore.Collection("talks").Doc(talkID)
	docSnap, err := docRef.Get(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("talk not found"))
	}

	var agents []interface{}
	if data, ok := docSnap.Data()["agents"].([]interface{}); ok {
		agents = data
	}

	if idx < 0 || idx >= len(agents) {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid agent index"))
	}

	// Update at index
	agents[idx] = map[string]interface{}{
		"name":        agent.Name,
		"description": agent.Description,
		"icon":        agent.Icon,
	}

	_, err = docRef.Update(ctx, []firestore.Update{
		{
			Path:  "agents",
			Value: agents,
		},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to update agent: %w", err))
	}

	return connect.NewResponse(&apiv1.UpdateAgentResponse{}), nil
}

// DeleteTalk は指定されたトークを削除します。
func (h *TalkHandler) DeleteTalk(
	ctx context.Context,
	req *connect.Request[apiv1.DeleteTalkRequest],
) (*connect.Response[apiv1.DeleteTalkResponse], error) {
	uid, ok := middleware.GetUID(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	talkID := req.Msg.TalkId
	docRef := h.firestore.Collection("talks").Doc(talkID)

	// 権限チェック
	snap, err := docRef.Get(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("talk not found"))
	}
	if snap.Data()["ownerId"] != uid {
		return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("not an owner of this talk"))
	}
	// メッセージサブコレクションの全ドキュメントを削除
	msgIter := docRef.Collection("messages").Limit(500).Documents(ctx)
	for {
		doc, err := msgIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list messages for deletion: %w", err))
		}
		if _, err := doc.Ref.Delete(ctx); err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to delete message: %w", err))
		}
	}

	// 今回は親ドキュメントの削除のみ行う
	_, err = docRef.Delete(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to delete talk: %w", err))
	}

	return connect.NewResponse(&apiv1.DeleteTalkResponse{}), nil
}

