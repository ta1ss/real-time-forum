package utils

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type SafeConn struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

var (
	connections = make(map[string]*SafeConn)
	connMutex   sync.RWMutex
)

func RunServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", indexHandler)

	cssServer := http.FileServer(http.Dir("./static/"))
	mux.Handle("/static/", http.StripPrefix("/static/", cssServer))

	jsServer := http.FileServer(http.Dir("./script/"))
	mux.Handle("/script/", http.StripPrefix("/script/", jsServer))

	fmt.Println("server started at: http://localhost:8085/")
	go broadcastLoggedUsers()
	log.Fatal(http.ListenAndServe(":8085", mux))
}
