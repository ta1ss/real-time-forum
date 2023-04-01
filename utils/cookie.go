package utils

import (
	"fmt"
	database "real-time-forum/database"

	"github.com/gofrs/uuid"
)

func setSessionID(username string) string {
	sessionID, _ := uuid.NewV4()
	_, err := database.Exec("DELETE FROM sessions WHERE nickname = ?", username)
	if err != nil {
		fmt.Println(err)
	}
	_, err = database.Exec("INSERT INTO sessions(uuid, nickname) VALUES (?,?)", sessionID.String(), username)
	if err != nil {
		fmt.Println(err)
	}
	return sessionID.String()
}

func validateCookie(cookie string) bool {
	var uuid string
	err := database.QueryRow("SELECT uuid FROM sessions WHERE uuid = ?", cookie).Scan(&uuid)
	if err != nil {
		fmt.Println(err)
		return false
	}
	return true
}

func getUserName(cookie string) string {
	var username string
	err := database.QueryRow("SELECT nickname FROM Sessions WHERE uuid = ?", cookie).Scan(&username)
	if err != nil {
		fmt.Println("getUserName error: ", err)
		return ""
	}
	return username
}

func getUserID(username string) float64 {
	var id float64
	err := database.QueryRow("SELECT id FROM Users WHERE nickname = ?", username).Scan(&id)
	if err != nil {
		fmt.Println("getUserID error: ", err)
		return 0
	}
	return id
}

func getusernameByID(id int) string {
	var username string
	err := database.QueryRow("SELECT nickname FROM Users WHERE id = ?", id).Scan(&username)
	if err != nil {
		fmt.Println("getusernameByID error: ", err)
		return ""
	}
	return username
}

func removeCookie(cookie string) {
	_, err := database.Exec("DELETE FROM sessions WHERE uuid = ?", cookie)
	if err != nil {
		fmt.Println("removeCookie error: ", err)
	}
}

// func getUserUUID(username string) string {
// 	var uuid string
// 	err := database.QueryRow("SELECT uuid FROM Sessions WHERE nickname = ?", username).Scan(&uuid)
// 	if err != nil {
// 		fmt.Println(err)
// 		return ""
// 	}
// 	return uuid
// }
