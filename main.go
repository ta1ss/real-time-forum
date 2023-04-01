package main

import (
	database "real-time-forum/database"
	"real-time-forum/utils"
)

func main() {
	database.ConnectDB()
	defer database.CloseDB()

	utils.RunServer()
}
