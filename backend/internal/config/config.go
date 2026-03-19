package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                  string
	ProjectID             string
	AuthEmulatorHost      string
	FirestoreEmulatorHost string
	AllowedOrigin         string
	VertexAIProjectID     string
	VertexAILocation      string
}

func Load() *Config {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "ideerthon"
	}

	return &Config{
		Port:                  port,
		ProjectID:             projectID,
		AuthEmulatorHost:      os.Getenv("FIREBASE_AUTH_EMULATOR_HOST"),
		FirestoreEmulatorHost: os.Getenv("FIRESTORE_EMULATOR_HOST"),
		AllowedOrigin:         os.Getenv("ALLOWED_ORIGIN"),
		VertexAIProjectID:     os.Getenv("VERTEX_AI_PROJECT_ID"),
		VertexAILocation:      os.Getenv("VERTEX_AI_LOCATION"),
	}
}
