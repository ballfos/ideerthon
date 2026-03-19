package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"connectrpc.com/connect"
	"firebase.google.com/go/v4/auth"
)

type contextKey string

// UIDKey はコンテキストからユーザーIDを取得するためのキーです。
const UIDKey contextKey = "uid"

type authInterceptor struct {
	authClient *auth.Client
}

// NewAuthInterceptor は Firebase Auth トークンを検証するインターセプターを作成します。
func NewAuthInterceptor(authClient *auth.Client) connect.Interceptor {
	return &authInterceptor{authClient: authClient}
}

func (i *authInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		uid, err := i.verify(ctx, req.Header())
		if err != nil {
			return nil, err
		}
		newCtx := context.WithValue(ctx, UIDKey, uid)
		return next(newCtx, req)
	}
}

func (i *authInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return next
}

func (i *authInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return func(ctx context.Context, conn connect.StreamingHandlerConn) error {
		uid, err := i.verify(ctx, conn.RequestHeader())
		if err != nil {
			return err
		}
		newCtx := context.WithValue(ctx, UIDKey, uid)
		return next(newCtx, conn)
	}
}

func (i *authInterceptor) verify(ctx context.Context, header http.Header) (string, error) {
	authHeader := header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return "", connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("missing or invalid authorization header"))
	}
	idToken := strings.TrimPrefix(authHeader, "Bearer ")

	token, err := i.authClient.VerifyIDToken(ctx, idToken)
	if err != nil {
		return "", connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid token: %w", err))
	}
	return token.UID, nil
}

// GetUID はコンテキストから認証済みのユーザーIDを取得します。
func GetUID(ctx context.Context) (string, bool) {
	uid, ok := ctx.Value(UIDKey).(string)
	return uid, ok
}
