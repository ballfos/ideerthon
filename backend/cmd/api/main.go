package main

import (
	"context"
	"log"
	"net/http"

	"connectrpc.com/connect"
	firebase "firebase.google.com/go/v4"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/ballfos/ideerthon/gen/proto/api/v1/apiv1connect"
	"github.com/ballfos/ideerthon/internal/config"
	"github.com/ballfos/ideerthon/internal/handler"
	"github.com/ballfos/ideerthon/internal/middleware"
)

func main() {
	cfg := config.Load()

	log.Printf("Starting server on :%s\n", cfg.Port)
	log.Printf("Project ID: %s\n", cfg.ProjectID)

	ctx := context.Background()

	// Firebase App Initialization
	conf := &firebase.Config{ProjectID: cfg.ProjectID}
	app, err := firebase.NewApp(ctx, conf)
	if err != nil {
		log.Fatalf("error initializing firebase app: %v\n", err)
	}

	// Firebase Auth Client
	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("error getting firebase auth client: %v\n", err)
	}

	// Firestore Client
	firestoreClient, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("error getting firestore client: %v\n", err)
	}
	defer firestoreClient.Close()

	// Handlers
	talkHandler := handler.NewTalkHandler(firestoreClient)
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

	// Connect RPC requires specific headers: Content-Type, Connect-Protocol-Version,
	// Authorization (Firebase ID token), and Connect-Timeout-Ms.
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
	// Cloud Run terminates TLS and forwards traffic via h2c to this server.
	h2cHandler := h2c.NewHandler(corsHandler, &http2.Server{})
	if err := http.ListenAndServe(":"+cfg.Port, h2cHandler); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
