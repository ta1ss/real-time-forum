package utils

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	database "real-time-forum/database"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"text/template"
	"time"

	"github.com/gorilla/websocket"
)

var Response struct {
	Type       string     `json:"type"`
	Err        bool       `json:"err"`
	Data       string     `json:"data"`
	SessionID  string     `json:"sessionID"`
	Categories [][]string `json:"categories"`
	Posts      [][]string `json:"posts"`
	Post       []string   `json:"post"`
	Comments   [][]string `json:"comments"`
	Users      []string   `json:"users"`
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Upgrade") == "websocket" {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}
		conn.SetCloseHandler(func(code int, text string) error {
			return onCloseHandler(conn, code, text)
		})

		// Read messages from the WebSocket connection
		for {
			_, data, err := conn.ReadMessage()
			if err != nil {
				log.Println(err)
				return
			}

			var message map[string]interface{}
			err = json.Unmarshal(data, &message)
			if err != nil {
				log.Println(err)
				return
			}

			// get the type of the message
			messageType, ok := message["type"].(string)
			if !ok {
				log.Println("Invalid message type")
				return
			}

			switch messageType {
			case "register":
				nickname, _ := message["nickname"].(string)
				age, _ := message["age"].(string)
				gender, _ := message["gender"].(string)
				firstName, _ := message["firstName"].(string)
				lastName, _ := message["lastName"].(string)
				email, _ := message["email"].(string)
				password, _ := message["password"].(string)
				hashedPassword, _ := HashPassword(password)
				err := registerData(nickname, age, gender, firstName, lastName, email, hashedPassword)
				if err != nil {
					fmt.Println("User registration failed on server")
					response := Response
					response.Type = "register"
					response.Err = true
					err := conn.WriteJSON(response)
					if err != nil {
						log.Println(err)
					}
				} else {
					fmt.Println("User registration successful on server")
					response := Response
					response.Type = "register"
					response.Err = false
					response.SessionID = setSessionID(nickname)
					connMutex.Lock()
					safeConn := &SafeConn{conn: conn}
					connections[response.SessionID] = safeConn
					connMutex.Unlock()
					err := conn.WriteJSON(response)
					if err != nil {
						log.Println(err)
					}
					fmt.Println(nickname, age, gender, firstName, lastName, email, password)
				}
			case "login":
				username, _ := message["user"].(string)
				password, _ := message["password"].(string)
				if loginData(username, password) {
					fmt.Println("User Logged in with:", username, password)
					response := Response
					response.SessionID = setSessionID(username)
					response.Type = "login"
					response.Err = false
					connMutex.Lock()
					safeConn := &SafeConn{conn: conn}
					connections[response.SessionID] = safeConn
					connMutex.Unlock()
					err := conn.WriteJSON(response)
					if err != nil {
						log.Println(err)
					}
				} else {
					fmt.Println("User login failed with:", username, password)
					response := Response
					response.Type = "login"
					response.Err = true
					err := conn.WriteJSON(response)
					if err != nil {
						log.Println(err)
					}
				}
			case "validateCookie":
				cookieID := message["sessionID"].(string)
				response := Response
				response.Err = !validateCookie(cookieID)
				if !response.Err {
					connMutex.Lock()
					safeConn := &SafeConn{conn: conn}
					connections[cookieID] = safeConn
					connMutex.Unlock()
				}
				response.Type = "validateCookie"
				err := conn.WriteJSON(response)
				if err != nil {
					log.Println(err)
				}
			case "getCategories":
				response := Response
				response.Type = "getCategories"
				response.Categories, _ = getCategories()
				err := conn.WriteJSON(response)
				if err != nil {
					log.Println(err)
				}
			case "getCategory":
				response := Response
				response.Type = "getCategory"
				response.Posts, _ = getCategory(message["category"].(float64))
				err := conn.WriteJSON(response)
				if err != nil {
					log.Println(err)
				}
			case "getComments":
				response := Response
				response.Type = "getComments"
				response.Comments, _ = getComments(message["post"].(float64), message["categorie"].(float64))
				err := conn.WriteJSON(response)
				if err != nil {
					log.Println(err)
				}
			case "createPost":
				response := Response
				title := message["title"].(string)
				content := message["body"].(string)
				categorieID := message["categorieID"].(float64)
				user := getUserID(message["user"].(string))
				response.Post, _ = createPost(user, title, content, categorieID)
				response.Type = "newPost"
				err := conn.WriteJSON(response)
				if err != nil {
					log.Println(err)
				}
			case "createComment":
				response := Response
				comment := message["comment"].(string)
				postID := message["postID"].(float64)
				categorieID := message["categorieID"].(float64)
				user := getUserID(message["user"].(string))
				response.Post, _ = createComment(comment, postID, categorieID, user)
				response.Type = "newComment"
				err := conn.WriteJSON(response)
				if err != nil {
					log.Println(err)
				}
			case "getUserName":
				response := Response
				response.Type = "getUserName"
				response.Data = getUserName(message["sessionID"].(string))
				err := conn.WriteJSON(response)
				if err != nil {
					log.Println(err)
				}
			case "removeCookie":
				uuid := message["sessionID"].(string)
				removeCookie(uuid)
				connMutex.Lock()
				delete(connections, uuid)
				connMutex.Unlock()
			case "getMessages":
				sender := message["sender"].(string)
				recipient := message["recipient"].(string)
				messageCount := message["messagesPerPage"].(float64)
				response := Response
				response.Type = "getMessages"
				response.Posts = getMessages(sender, recipient, messageCount)
				err := conn.WriteJSON(response)
				if err != nil {
					log.Println(err)
				}
			case "newMessage":
				sender := message["sender"].(string)
				recipient := message["recipient"].(string)
				content := message["content"].(string)
				addMessage(sender, recipient, content)
			case "typing":
				sender := message["sender"].(string)
				recipient := message["recipient"].(string)
				sendTypingProgress(sender, recipient)
			default:
				log.Println("Invalid message type")
				return
			}

		}
	} else {
		tmpl := template.Must(template.ParseFiles("./static/index.html"))
		tmpl.Execute(w, nil)
	}
}

func registerData(nickname string, age string, gender string, firstName string, lastName string, email string, hashedPassword string) error {
	_, err := database.Exec("INSERT INTO Users (nickname, age, gender, firstName, lastName, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)", nickname, age, gender, firstName, lastName, email, hashedPassword)
	if err != nil {
		log.Println(err)
		return err
	}
	return nil
}

func loginData(username, password string) bool {
	emailregexp := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if emailregexp.MatchString(username) {
		var userName string
		err := database.QueryRow("SELECT nickname FROM Users WHERE email = ?", username).Scan(&userName)
		if err != nil {
			fmt.Println("Log in error: ", err)
		} else {
			return login(userName, password)
		}
	}
	return login(username, password)
}

func getCategories() ([][]string, error) {
	rows, err := database.Query("SELECT name, body FROM Categories")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := [][]string{}
	for rows.Next() {
		var name, description string
		err := rows.Scan(&name, &description)
		if err != nil {
			return nil, err
		}
		categories = append(categories, []string{name, description})
	}
	return categories, nil
}

func getCategory(category float64) ([][]string, error) {
	rows, err := database.Query("SELECT id, title, body, user, timestamp FROM Posts WHERE categoryID = ?", category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := [][]string{}
	for rows.Next() {
		var title, body, timestamp string
		var idInt, author int
		err := rows.Scan(&idInt, &title, &body, &author, &timestamp)
		if err != nil {
			fmt.Println("getCategory error: ", err)
			return nil, err
		}
		id := strconv.Itoa(idInt)
		posts = append(posts, []string{title, body, id, getusernameByID(author), timestamp})
	}
	return posts, nil
}

func getComments(postID, categorieID float64) ([][]string, error) {
	rows, err := database.Query("SELECT Users.nickname, Comments.body, Comments.time FROM Comments JOIN Users ON Comments.user = Users.id WHERE Comments.postID = ? AND Comments.categoryID = ?", postID, categorieID)
	if err != nil {
		fmt.Println("getComments error: ", err)
		return nil, err
	}

	defer rows.Close()

	comments := [][]string{}
	for rows.Next() {
		var user, body, timestamp string
		err := rows.Scan(&user, &body, &timestamp)
		if err != nil {
			fmt.Println("getComments error: ", err)
			return nil, err
		}
		comments = append(comments, []string{user, body, timestamp})
	}
	return comments, nil
}

func createPost(user float64, title string, body string, currentCategory float64) ([]string, error) {
	time := time.Now().Format("15:04 02-01-2006")
	stmt, err := database.Prepare("INSERT INTO Posts (user, title, body, categoryID, timestamp) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		return nil, err
	}
	_, err = stmt.Exec(user, title, body, currentCategory, time)
	if err != nil {
		return nil, err
	}
	var createdTitle, createdBody, timestamp string
	var id, author int
	err = database.QueryRow("SELECT title, body, id, user, timestamp FROM Posts WHERE categoryID = ? AND title = ? and body = ?", currentCategory, title, body).Scan(&createdTitle, &createdBody, &id, &author, &timestamp)
	if err != nil {
		return nil, err
	}
	post := []string{createdTitle, createdBody, strconv.Itoa(id), timestamp, getusernameByID(author)}
	return post, nil
}

func createComment(body string, currentPost float64, currentCategory float64, userID float64) ([]string, error) {
	time := time.Now().Format("15:04 02-01-2006")
	stmt, err := database.Prepare("INSERT INTO Comments (user, body, categoryID, postID, time) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		fmt.Println("createComment error: ", err)
		return nil, err
	}
	_, err = stmt.Exec(userID, body, currentCategory, currentPost, time)
	if err != nil {
		fmt.Println("createComment error: ", err)
		return nil, err
	}
	var createdBody, user, timestamp string
	var postID, categorieID int
	err = database.QueryRow("SELECT Comments.body, Comments.categoryID, Comments.postID, Comments.time, Users.nickname FROM Comments JOIN Users ON Comments.user = Users.id WHERE Comments.body = ? AND Comments.categoryID = ? AND Comments.postID = ?", body, currentCategory, currentPost).Scan(&createdBody, &categorieID, &postID, &timestamp, &user)
	if err != nil {
		fmt.Println("createComment error: ", err)
		return nil, err
	}
	comment := []string{createdBody, strconv.Itoa(categorieID), strconv.Itoa(postID), user, timestamp}
	return comment, nil
}

func getLoggedUsers() []string {
	var users []string
	for uuid := range connections {
		user := getUserName(uuid)
		users = append(users, user)
	}
	return users
}

func getAllUsers() []string {
	var users []string
	rows, err := database.Query("SELECT nickname FROM Users ORDER BY nickname ASC")
	if err != nil {
		return nil
	}
	defer rows.Close()

	for rows.Next() {
		var user string
		err := rows.Scan(&user)
		if err != nil {
			return nil
		}
		users = append(users, user)
	}
	return users
}

func getLastInteractions(currentUser string) ([]string, error) {
	rows, err := database.Query(`
	SELECT user, MAX(id), MAX(timestamp)
	FROM (
		SELECT recipient AS user, id, timestamp
		FROM Messages
		WHERE sender = ?
		UNION ALL
		SELECT sender AS user, id, timestamp
		FROM Messages
		WHERE recipient = ?
	) AS combined
	GROUP BY user
	ORDER BY MAX(timestamp) DESC;
	`, currentUser, currentUser)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var usersWithInteractions []string
	for rows.Next() {
		var user string
		var id int
		var timestamp string
		err := rows.Scan(&user, &id, &timestamp)
		if err != nil {
			return nil, err
		}

		usersWithInteractions = append(usersWithInteractions, user)
	}
	allUsers := getAllUsers()
	var usersWithoutInteractions []string
	for _, user := range allUsers {
		if !contains(usersWithInteractions, user) && user != currentUser {
			usersWithoutInteractions = append(usersWithoutInteractions, user)
		}
	}
	sort.Slice(usersWithoutInteractions, func(i, j int) bool {
		return strings.ToLower(usersWithoutInteractions[i]) < strings.ToLower(usersWithoutInteractions[j])
	})
	var orderedUsers []string
	orderedUsers = append(orderedUsers, usersWithInteractions...)
	orderedUsers = append(orderedUsers, usersWithoutInteractions...)
	return orderedUsers, nil
}

func contains(slc []string, str string) bool {
	for _, s := range slc {
		if s == str {
			return true
		}
	}
	return false
}

func broadcastLoggedUsers() {
	for {
		response := Response
		response.Type = "loggedUsers"
		response.Post = getLoggedUsers()
		for sessionID, safeConn := range connections {
			username := getUserName(sessionID)
			users, err := getLastInteractions(username)
			if err != nil {
				log.Println(err)
			}
			response.Posts = updateListWithNotifications(users, username)
			safeConn.mu.Lock()
			err = safeConn.conn.WriteJSON(response)
			safeConn.mu.Unlock()

			if err != nil {
				log.Println(err)
			}
		}
		time.Sleep(1 * time.Second)
	}
}

func onCloseHandler(conn *websocket.Conn, closeCode int, closeText string) error {
	for uuid, safeConn := range connections {
		if safeConn.conn == conn {
			delete(connections, uuid)
		}
	}
	return nil
}

func getMessages(sender, recipient string, messageCount float64) [][]string {
	messages := [][]string{}
	messageCountInt := int(messageCount)
	rows, err := database.Query("SELECT id, sender, recipient, content, timestamp, readstatus FROM Messages WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?) ORDER BY ID DESC LIMIT ?", sender, recipient, recipient, sender, messageCountInt)
	if err != nil {
		fmt.Println("CHAT ERROR: ", err)
		return nil
	}
	defer rows.Close()

	var unreadMessageIDs []int
	for rows.Next() {
		var id, readStatus int
		var sqlSender, sqlRecipient, content, timestamp string
		err := rows.Scan(&id, &sqlSender, &sqlRecipient, &content, &timestamp, &readStatus)
		if err != nil {
			fmt.Println("CHAT ROWS ERROR: ", err)
			return nil
		}
		messages = append(messages, []string{sqlSender, sqlRecipient, content, timestamp})
		if sender == sqlRecipient {
			unreadMessageIDs = append(unreadMessageIDs, id)
		}
	}
	if len(unreadMessageIDs) > 0 {
		updateReadStatus(unreadMessageIDs)
	}
	return messages
}

func updateReadStatus(messageIDs []int) {
	for _, messageID := range messageIDs {
		_, err := database.Exec("UPDATE Messages SET readstatus = 1 WHERE id = ?", messageID)
		if err != nil {
			fmt.Println("updateReadStatus ERROR: ", err)
		}
	}
}

func addMessage(sender, recipient, content string) {
	time := time.Now().Format("2006-01-02 15:04:05")
	readstatus := 0
	stmt, err := database.Prepare("INSERT INTO Messages (sender, recipient, content, timestamp, readstatus) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		fmt.Println("INSERT ERROR: ", err)
		return
	}
	_, err = stmt.Exec(sender, recipient, content, time, readstatus)
	if err != nil {
		fmt.Println("INSERT ERROR: ", err)
		return
	}
}

func updateListWithNotifications(users []string, currentUser string) [][]string {
	result := [][]string{}

	for _, user := range users {
		var readStatus int
		err := database.QueryRow("SELECT readstatus FROM Messages WHERE sender = ? AND recipient = ? ORDER BY id DESC LIMIT 1", user, currentUser).Scan(&readStatus)

		if err != nil {
			if err == sql.ErrNoRows {
				readStatus = 1
			} else {
				fmt.Println("UPDATE LIST WITH NOTIFICATIONS ERROR: ", err)
				continue
			}
		}
		var isRead string
		if readStatus == 1 {
			isRead = "true"
		} else {
			isRead = "false"
		}
		result = append(result, []string{user, isRead})
	}
	return result
}

func sendTypingProgress(username, recipient string) {
	response := Response
	response.Type = "typingProgress"
	response.Data = username
	for sessionID, safeConn := range connections {
		recipientName := getUserName(sessionID)
		if recipientName == recipient {
			safeConn.mu.Lock()
			err := safeConn.conn.WriteJSON(response)
			safeConn.mu.Unlock()
			if err != nil {
				log.Println(err)
			}
		}
	}
}
