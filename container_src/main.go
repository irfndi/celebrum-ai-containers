package main

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
)

func handler(w http.ResponseWriter, r *http.Request) {
	message := os.Getenv("MESSAGE")
	instanceId := os.Getenv("CLOUDFLARE_DEPLOYMENT_ID")
	
	// Parse the URL to ensure it's valid
	parsedURL, err := url.Parse(r.URL.String())
	if err != nil {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	
	fmt.Fprintf(w, "Hi, I'm a container and this is my message: \"%s\", my instance ID is: %s, path: %s", message, instanceId, parsedURL.Path)
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
