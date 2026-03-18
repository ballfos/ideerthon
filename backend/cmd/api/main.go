package main

import (
	"context"
	"log"
	"net/http"

	"connectrpc.com/connect"
	firebase "firebase.google.com/go/v4"
	"github.com/rs/cors"
	"google.golang.org/api/option"

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
	app, err := firebase.NewApp(ctx, conf, option.WithoutAuthentication())
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

	corsHandler := cors.New(cors.Options{
		AllowedOrigins: []string{allowedOrigin},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}).Handler(mux)

	// Start Server
	if err := http.ListenAndServe(":"+cfg.Port, corsHandler); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
