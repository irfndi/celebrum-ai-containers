package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func handler(w http.ResponseWriter, r *http.Request) {
	message := os.Getenv("MESSAGE")
	instanceId := os.Getenv("CLOUDFLARE_DEPLOYMENT_ID")

	if _, err := fmt.Fprintf(w, "Hi, I'm a container and this is my message: \"%s\", my instance ID is: %s", message, instanceId); err != nil {
		log.Printf("Error writing response: %v", err)
	}
}

func errorHandler(w http.ResponseWriter, r *http.Request) {
	panic("This is a panic")
}

func main() {
	http.HandleFunc("/", handler)
	http.HandleFunc("/container", handler)
	http.HandleFunc("/error", errorHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
