package main

import (
	"context"
	"log"
	"net/http"

	"connectrpc.com/connect"
	firebase "firebase.google.com/go/v4"
	"github.com/ballfos/ideerthon/gen/proto/api/v1/apiv1connect"
	"github.com/ballfos/ideerthon/internal/config"
	"github.com/ballfos/ideerthon/internal/handler"
	"github.com/ballfos/ideerthon/internal/middleware"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func run() error {
	cfg := config.Load()

	log.Printf("Starting server on :%s\n", cfg.Port)
	log.Printf("Project ID: %s\n", cfg.ProjectID)

	ctx := context.Background()

	// Firebase App Initialization
	conf := &firebase.Config{ProjectID: cfg.ProjectID}
	app, err := firebase.NewApp(ctx, conf)
	if err != nil {
		return err
	}

	// Firebase Auth Client
	authClient, err := app.Auth(ctx)
	if err != nil {
		return err
	}

	// Firestore Client
	firestoreClient, err := app.Firestore(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = firestoreClient.Close()
	}()

	// AI Client
	aiClient, err := handler.NewAIClient(ctx, cfg.VertexAIProjectID, cfg.VertexAILocation)
	if err != nil {
		return err
	}
	defer func() {
		_ = aiClient.Close()
	}()

	// Handlers
	talkHandler := handler.NewTalkHandler(firestoreClient, aiClient)
	messageHandler := handler.NewMessageHandler(firestoreClient)

	// Mux & Interceptors
	mux := http.NewServeMux()
	interceptors := connect.WithInterceptors(middleware.NewAuthInterceptor(authClient))

	// Register Connect Services
	mux.Handle(apiv1connect.NewTalkServiceHandler(talkHandler, interceptors))
	mux.Handle(apiv1connect.NewMessageServiceHandler(messageHandler, interceptors))

	// CORS Setup
	allowedOrigin := cfg.AllowedOrigin
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:3000"
	}

	// Connect RPC requires specific headers
	corsHandler := cors.New(cors.Options{
		AllowedOrigins: []string{allowedOrigin},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{
			"Authorization",
			"Content-Type",
			"Connect-Protocol-Version",
			"Connect-Timeout-Ms",
			"X-Grpc-Web",
			"Grpc-Timeout",
			"X-User-Agent",
		},
		ExposedHeaders:   []string{"Grpc-Status", "Grpc-Message", "Grpc-Status-Details-Bin"},
		AllowCredentials: true,
	}).Handler(mux)

	// Start Server
	// h2c enables HTTP/2 over cleartext (no TLS), required for gRPC / Connect streaming.
	h2cHandler := h2c.NewHandler(corsHandler, &http2.Server{})
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           h2cHandler,
		ReadHeaderTimeout: http.DefaultClient.Timeout, // G114 fix
	}
	return srv.ListenAndServe()
}
