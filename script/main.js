// websocket stuff
const socket = new WebSocket("ws://176.112.158.14:8085/");
socket.addEventListener("open", (event) => {
    validateCookie()
});

const body = document.querySelector('body')
const usersDiv = document.getElementById('users')
const chatBoxDiv = document.getElementById('chat-box-div')
// let stuff
let currentUser = ""
let currentRecipient = ""
let users = [];
let messagesPerPage = 10;
let currentPost = 0
let currentPage = ""
let currentCategory = ""


socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === "register") {
        if (data.err === false) {
                nicknameInput.value = ''
                ageInput.value = ''
                genderSelect.value = ''
                firstNameInput.value = ''
                lastNameInput.value = ''
                emailInput.value = ''
                passwordInput.value = ''
                registerDiv.classList.add('hidden')
                setSessionCookie(data.sessionID)
                updateCurrentUser()
                logOut.classList.remove('hidden')
                usersDiv.classList.remove('hidden')
                chatBoxDiv.style.display = "flex"
                getCategories()
        } else {
            alert("Username or email is already taken")
        }
    }
    if (data.type === "login") {
        if (data.err === false) {
            loginUser.value = ''
            loginPassword.value = ''
            loginDiv.classList.add('hidden')
            setSessionCookie(data.sessionID)
            logOut.classList.remove('hidden')
            usersDiv.classList.remove('hidden')
            chatBoxDiv.style.display = "flex"
            updateCurrentUser()
            getCategories()
        } else {
            alert("Username or password is incorrect")
        }
    }
    if (data.type === "validateCookie") {
        if (data.err === false) {
            logOut.classList.remove('hidden')
            updateCurrentUser()
            usersDiv.classList.remove('hidden')
            chatBoxDiv.style.display = "flex"
            getCategories()
        } else {
            loginDiv.classList.remove('hidden')
        }
    }
    if (data.type === "getCategories") {
        const categorieDiv = document.createElement('div')
        categorieDiv.classList.add('categoriesDiv')
        for(let i = 0; i < data.categories.length; i++){
            const category = document.createElement('div')
            category.classList.add('category')
            const h1 = document.createElement('h1')
            h1.textContent = data.categories[i][0]
            category.appendChild(h1)

            const p = document.createElement('p')
            p.textContent = data.categories[i][1]
            category.appendChild(p)

            const categoryData = {
                type: "getCategory",
                category: i+1,
            }
            category.addEventListener('click', function(event) {  
                event.preventDefault()
                currentCategory = i+1
                socket.send(JSON.stringify(categoryData))
                removeCategories()
                backButton.classList.remove('hidden')
            })

            categorieDiv.appendChild(category)

        }
        body.appendChild(categorieDiv)
    }
    if (data.type === "getCategory") {
        const postDiv = document.createElement('div')
        postDiv.classList.add('postDiv')
        currentPage = "posts"
        for (let i = 0; i < data.posts.length; i++) {
            const post = document.createElement('div')
            post.classList.add('post')
            const h2 = document.createElement('h2')
            h2.textContent = data.posts[i][0]
            post.appendChild(h2)
            const user = document.createElement('p')
            user.classList.add('create-post-user')
            user.textContent = data.posts[i][3]
            post.appendChild(user)

            const time = document.createElement('p')
            time.classList.add('create-post-time')
            time.textContent = data.posts[i][4]
            post.appendChild(time)

            const p = document.createElement('p')
            p.innerHTML = data.posts[i][1].replace(/\\n/g, '<br>')
            post.appendChild(p)
            const postData = {
                type: "getComments",
                categorie: currentCategory,
                post: parseInt(data.posts[i][2]),
            }
            post.addEventListener('click', function(event) {
                currentPost = parseInt(data.posts[i][2])
                event.preventDefault()
                socket.send(JSON.stringify(postData))
                removePosts()
                deletePostDiv()
            })

            postDiv.appendChild(post)
        }
        body.appendChild(postDiv)
        createPostDiv()
    }
    if (data.type === "getComments") {
        const commentDiv = document.createElement('div')
        commentDiv.classList.add('commentDiv')
        currentPage = "comments"
        for (let i = 0; i < data.comments.length; i++) {
            const comment = document.createElement('div')
            comment.classList.add('comment')
            const h3 = document.createElement('h3')
            h3.textContent = data.comments[i][0]
            comment.appendChild(h3)

            const commentTime = document.createElement('p')
            commentTime.classList.add('create-comment-time')
            commentTime.textContent = data.comments[i][2]
            comment.appendChild(commentTime)
            
            const p = document.createElement('p')
            p.innerHTML = data.comments[i][1].replace(/\\n/g, '<br>')
            comment.appendChild(p)
            commentDiv.appendChild(comment)
        }
        body.appendChild(commentDiv)
        createCommentDiv()
    }
    if (data.type === "newPost") {
        const postDiv = document.querySelector('.postDiv')
        const post = document.createElement('div')
        post.classList.add('post')
        const user = document.createElement('p')
        user.classList.add('create-post-user')
        user.textContent = data.post[4]

        const time = document.createElement('p')
        time.classList.add('create-post-time')
        time.textContent = data.post[3]

        const h2 = document.createElement('h2')
        h2.textContent = data.post[0]
        post.appendChild(h2)
        post.appendChild(user)
        post.appendChild(time)

        const p = document.createElement('p')
        p.innerHTML = data.post[1].replace(/\\n/g, '<br>')
        post.appendChild(p)

        const postData = {
            type: "getComments",
            categorie: currentCategory,
            post: parseInt(data.post[2]),
        }
        post.addEventListener('click', function(event) {
            currentPost = parseInt(data.post[2])
            event.preventDefault()
            socket.send(JSON.stringify(postData))
            removePosts()
            deletePostDiv()
        })
        postDiv.appendChild(post)
    }
    if (data.type === "newComment") {
        const commentDiv = document.querySelector('.commentDiv')
        const comment = document.createElement('div')
        comment.classList.add('comment')
        const h3 = document.createElement('h3')
        h3.textContent = data.post[3]
        comment.appendChild(h3)

        const commentTime = document.createElement('p')
        commentTime.classList.add('create-comment-time')
        commentTime.textContent = data.post[4]
        comment.appendChild(commentTime)

        const p = document.createElement('p')
        p.innerHTML = data.post[0].replace(/\\n/g, '<br>')
        comment.appendChild(p)
        commentDiv.appendChild(comment)
    }
    if(data.type === "getUserName") {
        currentUser = data.data
    }
    if(data.type === "loggedUsers") {
            usersDiv.innerHTML = ""
            for(let i = 0; i < data.posts.length; i++) {
                if (data.posts[i][0] !== currentUser && data.posts[i][0] !== "") {
                    const user = document.createElement('div')
                    user.classList.add('user')
                    const a = document.createElement('a')
                    if (data.posts[i][1] === "false") {
                        const icon = document.createElement('i')
                        icon.classList.add('fa', 'fa-comment');
                        a.appendChild(icon);
                        a.appendChild(document.createTextNode(data.posts[i][0]));
                    } else {
                        a.textContent = data.posts[i][0]
                    }
                    a.id = data.posts[i][0]
                    a.href = "#"
                    a.addEventListener('click', function(event) {
                        event.preventDefault()
                        currentRecipient = data.posts[i][0]
                        messagesPerPage = 10
                        const messageData = {
                            type: "getMessages",
                            recipient: currentRecipient,
                            sender: currentUser,
                            messagesPerPage: messagesPerPage,
                        }
                        socket.send(JSON.stringify(messageData))
                    })

                    user.appendChild(a)
                    usersDiv.appendChild(user)
                }
            }
            for (let i = 0; i < data.posts.length; i++) {
                if (data.posts[i][0] !== "") {
                    if (data.posts[i][0] !== currentUser) {
                        if (data.post.includes(data.posts[i][0])) {
                          const a = document.getElementById(data.posts[i][0]);
                          a.classList.add("logged-in");
                        } else {
                          const a = document.getElementById(data.posts[i][0]);
                          a.classList.remove("logged-in");
                        }
                      }
                    }
                }   
    }
    if(data.type === "getMessages") {
        const messagesDiv = document.getElementById('chat-box-messages')
        messagesDiv.innerHTML = ""
        for (let i = 0; i < data.posts.length; i++) {
            const sender = data.posts[i][0]
            const time = data.posts[i][3];
            const dateObj = new Date(time);
            const formattedTime = dateObj.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'});
            const formattedDate = dateObj.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: '2-digit'});
            const formattedDateTime = `${formattedTime} ${formattedDate}`;

            const messageDiv = document.createElement('div')
            messageDiv.classList.add('message')
            if (sender === currentUser) {
                messageDiv.classList.add('message-sent')
            } else {
                messageDiv.classList.add('message-received')
            }

            const senderDiv = document.createElement('div')
            senderDiv.classList.add('sender')
            senderDiv.textContent = sender

            const timeDiv = document.createElement('div')
            timeDiv.classList.add('time')
            timeDiv.textContent = formattedDateTime

            const p = document.createElement('p')
            p.innerHTML = data.posts[i][2].replace(/\\n/g, '<br>')
            p.classList.add('message-content')

            messageDiv.appendChild(senderDiv)
            messageDiv.appendChild(timeDiv)
            messageDiv.appendChild(p)

            messagesDiv.appendChild(messageDiv)
        }
        setTimeout(function() {
            const messageData = {
                type: "getMessages",
                recipient: currentRecipient,
                sender: currentUser,
                messagesPerPage: messagesPerPage,
            }
            socket.send(JSON.stringify(messageData))
        }, 1000);   
    }
    if(data.type === "typingProgress") {
        if(data.data === currentRecipient) {
            updateTypingMessage(data);
        }
    }
}
socket.onerror = function(event) {
    console.error("WebSocket error:", event);
};
socket.onclose = function(event) {
    if (event.wasClean) {
        console.log(`Socket connection closed cleanly, code=${event.code} reason=${event.reason}`)
    } else {
        console.log(`Socket connection broken, code=${event.code} reason=${event.reason}`)
    }
}

// cookie stuff
function setSessionCookie(sessionID) {
    document.cookie = "sessionID=" + sessionID
}
function removeSessionCookie(sessionID) {
    let cookie = document.cookie
    if (cookie) {
        cookie = document.cookie.split('; ').find(row => row.startsWith('sessionID=')).split('=')[1];
        const sessionID = cookie.substring(0, cookie.length);
        const data = {
            type: "removeCookie",
            sessionID: sessionID,
        }
        socket.send(JSON.stringify(data))
    }
    document.cookie = "sessionID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
}
function validateCookie() {
    let cookie = document.cookie
    if (cookie) {
        cookie = document.cookie.split('; ').find(row => row.startsWith('sessionID=')).split('=')[1];
        const sessionID = cookie.substring(0, cookie.length);
        const data = {
            type: "validateCookie",
            sessionID: sessionID,
        }
        socket.send(JSON.stringify(data))
    } else {
        const data = {
            type: "validateCookie",
            sessionID: "",
        }
        socket.send(JSON.stringify(data))
    }
}

// login stuff
const loginDiv = document.getElementById('login-div')
const loginUser = document.getElementById('login-user')
const loginPassword = document.getElementById('login-password')
const loginButton = document.getElementById('login-submit')
loginButton.addEventListener('click', function(event) {
    event.preventDefault()
    handleLogin()
})
loginUser.addEventListener('keyup', function(event) {
    event.preventDefault()
    if (event.key === "Enter") {
        handleLogin()
    }
})
loginPassword.addEventListener('keyup', function(event) {
    event.preventDefault()
    if (event.key === "Enter") {
        handleLogin()
    }
})

// logout stuff
const logOut = document.getElementById('log-out')
logOut.addEventListener('click', function(event) {
    event.preventDefault()
    removeSessionCookie()
    logOut.classList.add('hidden')
    loginDiv.classList.remove('hidden')
    usersDiv.classList.add('hidden')
    chatBoxDiv.style.display = "none"
    currentUser = ""
    removeCategories()
    removePosts()
    removeComments()

    if (backButton) {
        backButton.classList.add('hidden')
    }
})

// register stuff
const registerDiv = document.getElementById('register-div')
const nicknameInput = document.getElementById('register-nickname')
const ageInput = document.getElementById('age')
const genderSelect = document.getElementById('gender')
const firstNameInput = document.getElementById('firstName')
const lastNameInput = document.getElementById('lastName')
const emailInput = document.getElementById('register-email')
const passwordInput = document.getElementById('register-password')
const submitButton = document.getElementById('register-submit')
submitButton.addEventListener('click', function(event) {
    event.preventDefault()
    handleRegister()
})
passwordInput.addEventListener('keyup', function(event) {
    event.preventDefault()
    if (event.key === "Enter") {
        handleRegister()
    }
})
const swapRegisterButton = document.getElementById('swap-register')
swapRegisterButton.addEventListener('click', function(event) {
    event.preventDefault()
    loginDiv.classList.add('hidden')
    registerDiv.classList.remove('hidden')
    }
)
const swapLoginButton = document.getElementById('swap-login')
swapLoginButton.addEventListener('click', function(event) {
    event.preventDefault()
    loginDiv.classList.remove('hidden')
    registerDiv.classList.add('hidden')
    }
)

// back stuff
const backButton = document.getElementById('back-button')
backButton.addEventListener('click', function(event){
    if (currentPage === "posts") {
        removePosts()
        deletePostDiv()
        getCategories()
        backButton.classList.add('hidden')
    }
    if (currentPage === "comments") {
        removeComments()
        deleteCommentDiv()
        getPosts()
    }
})

// create stuff
function createPostDiv() {
    updateCurrentUser()
    const createPostDiv = document.createElement('div')
    createPostDiv.id = "create-post-div"
    
    const createPostTitle = document.createElement('input')
    createPostTitle.id = "create-post-title"
    createPostTitle.placeholder = "Title"

    const titleInputDiv = document.createElement('div')
    titleInputDiv.id = "post-input-box"
    titleInputDiv.appendChild(createPostTitle)

    const createPostBody = document.createElement('textarea')
    createPostBody.id = "create-post-body"
    createPostBody.placeholder = "Your Post"

    const bodyInputDiv = document.createElement('div')
    bodyInputDiv.id = "post-input-box"
    bodyInputDiv.appendChild(createPostBody)

    const createPostSubmit = document.createElement('button')
    createPostSubmit.id = "create-post-submit"
    createPostSubmit.classList.add('fa-solid', 'fa-paper-plane')

    createPostDiv.appendChild(titleInputDiv)
    bodyInputDiv.appendChild(createPostSubmit)
    createPostDiv.appendChild(bodyInputDiv)
    document.body.appendChild(createPostDiv)
    createPostSubmit.addEventListener('click', function(event) {
        event.preventDefault()
        handlePostSubmit()
    })
    createPostDiv.addEventListener('keyup', function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            handlePostSubmit()
        }
    })
}
function createCommentDiv(){
    updateCurrentUser()
    const commentDiv = document.createElement('div')
    commentDiv.id = "comment-div"
    const commentInput = document.createElement('textarea')
    commentInput.id = "comment-input"
    commentInput.placeholder = "Enter your comment here"
    commentDiv.appendChild(commentInput)
    const commentSubmit = document.createElement('button')
    commentSubmit.id = "comment-submit"
    commentSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    commentDiv.appendChild(commentInput)
    commentDiv.appendChild(commentSubmit)
    document.body.appendChild(commentDiv)
    commentSubmit.addEventListener('click', function(event) {
        event.preventDefault()
        handleNewComment()
    })
    commentInput.addEventListener('keyup', function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            handleNewComment()
        }
    })
}

// get stuff
function getCategories() {
    const data = {
        type: "getCategories",
    }
    socket.send(JSON.stringify(data))
}
function getPosts(){
    const data = {
        type: "getCategory",
        category: currentCategory,
    }
    socket.send(JSON.stringify(data))
}

// remove stuff
function removeCategories() {
    const categories = document.querySelectorAll('.categoriesDiv')
    categories.forEach(category => {
        category.remove()
    })
}
function removePosts() {
    const posts = document.querySelectorAll('.postDiv')
    const createPostDiv = document.getElementById('create-post-div')
    posts.forEach(post => {
        post.remove()
    })
    if (createPostDiv){
        createPostDiv.remove()
    }
}
function removeComments() {
    const comments = document.querySelectorAll('.commentDiv')
    const commentDiv = document.getElementById('comment-div')
    comments.forEach(comment => {
        comment.remove()
    })
    if (commentDiv){
        commentDiv.remove()
    }
}
function deletePostDiv() {
    const createPostDiv = document.getElementById('create-post-div')
    if (createPostDiv){
        createPostDiv.remove()
    }
}
function deleteCommentDiv() {
    const commentDiv = document.getElementById('comment-div')
    if (commentDiv){
        commentDiv.remove()
    }
}
function updateCurrentUser() {
    let cookie = document.cookie
    if (cookie) {
        cookie = document.cookie.split('; ').find(row => row.startsWith('sessionID=')).split('=')[1];
        const sessionID = cookie.substring(0, cookie.length);
        const data = {
            type: "getUserName",
            sessionID: sessionID,
        }
        socket.send(JSON.stringify(data))
    }
}

//send message stuff
const chatInput = document.getElementById('chat-input')
const chatSubmit = document.getElementById('chat-submit')

chatSubmit.addEventListener('click', function(event) {
    event.preventDefault()
    handleChatSubmit()
})
chatInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleChatSubmit()
    }
})

// chat scroll stuff
const chatDiv = document.getElementById('chat-box-messages');
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}
function handleScroll(event) {
  const tolerance = 5; 
  const isAtTop = chatDiv.scrollTop * -1 >= chatDiv.scrollHeight - chatDiv.clientHeight - tolerance;

  if (isAtTop) {
    messagesPerPage += 10;
  }
}
chatDiv.addEventListener('scroll', debounce(handleScroll, 600));

// handle stuff
function handleLogin() {
    if (!loginUser.value || !loginPassword.value) {
        alert("Please enter Email/Username and Password")
        return
    }
    const data = {
        type: "login",
        user: loginUser.value,
        password: loginPassword.value,
    }
    socket.send(JSON.stringify(data))
}
function handleRegister() {
    const nickname = nicknameInput.value
    const age = ageInput.value
    const gender = genderSelect.value
    const firstName = firstNameInput.value
    const lastName = lastNameInput.value
    const email = emailInput.value
    const password = passwordInput.value

    if (!nickname || !age || !firstName || !lastName || !email || !password ) {
        alert("Please fill out all fields")
        return
    }

    if (nickname.length < 3 || nickname.length > 10) {
        alert('Please enter a valid nickname (3-10 characters)')
        return
    }

    if (!/^\d{1,3}$/.test(age) || age < 18 || age > 120) {
        alert('Please enter a valid age (between 18 and 120)')
        return
    }

    if (gender !== "male" && gender !== "female" && gender !== "other") {
        alert('Please select the gender')
        return
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        alert('Please enter a valid email address')
        return
    }

    if (!/^(?=.*[A-Z])(?=.*[a-z]).{5,}$/.test(password)) {
        alert('Please enter a valid password (at least 5 characters & one uppercase letter)')
        return
    }

    const data = {
        type: "register",
        nickname: nicknameInput.value,
        age: ageInput.value,
        gender: genderSelect.value,
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        email: emailInput.value,
        password: passwordInput.value,
    }
    socket.send(JSON.stringify(data))
}
function handlePostSubmit(){
    const createPostTitle = document.getElementById('create-post-title')
    const createPostBody = document.getElementById('create-post-body')
    const title = createPostTitle.value
    const body = createPostBody.value.replace(/\n/g, "\\n")
    if (!title || !body) {
        alert("Please fill all fields")
        return
    }
    const data = {
        type: "createPost",
        title: title,
        body: body,
        categorieID: currentCategory,
        user: currentUser,
    }
    socket.send(JSON.stringify(data))
    createPostTitle.value = ""
    createPostBody.value = ""
}
function handleNewComment(){
    const commentInput = document.getElementById('comment-input')
    const comment = commentInput.value.replace(/\n/g, "\\n")
    if (!comment) {
        alert("Please enter a comment")
        return
    }
    const data = {
        type: "createComment",
        comment: comment,
        postID: currentPost,
        categorieID: currentCategory,
        user: currentUser,
    }
    socket.send(JSON.stringify(data))
    commentInput.value = ""
}
function handleChatSubmit(){
    const message = chatInput.value.replace(/\n/g, "\\n")
    if (!message) {
        alert("Please enter a message")
        return
    }
    const data = {
        type: "newMessage",
        content: message,
        sender: currentUser,
        recipient: currentRecipient,
    }
    socket.send(JSON.stringify(data))
    chatInput.value = ""
}

let typingInterval;
let typingTimeout;
let typingDots = 0;

function startTypingInterval() {
    if (typingInterval) {
        clearInterval(typingInterval);
    }

    typingInterval = setInterval(() => {
        if (chatInput.value.trim() !== '') {
            const data = {
                type: "typing",
                sender: currentUser,
                recipient: currentRecipient,
            };
            socket.send(JSON.stringify(data));
        }
    }, 750);
}

function stopTypingInterval() {
    clearInterval(typingInterval);
    typingInterval = null;
}

chatInput.addEventListener('focus', startTypingInterval);
chatInput.addEventListener('blur', stopTypingInterval);

chatInput.addEventListener('input', function(event) {
    if (chatInput.value.trim() === '') {
        stopTypingInterval();
    } else if (!typingInterval) {
        startTypingInterval();
    }
});

function updateTypingAnimation() {
    typingDots = (typingDots + 1) % 4;
    const dots = '.'.repeat(typingDots);
    const typingDiv = document.getElementById('typing');
    typingDiv.classList.add('typing-bubble');
    typingDiv.innerHTML = `${currentRecipient} is typing${dots}`;
}

let typingAnimationInterval;

function startTypingAnimation() {
    if (typingAnimationInterval) {
        clearInterval(typingAnimationInterval);
    }
    typingAnimationInterval = setInterval(updateTypingAnimation, 250);
}

function stopTypingAnimation() {
    clearInterval(typingAnimationInterval);
    typingAnimationInterval = null;
    typingDots = 0;
}

function updateTypingMessage(data) {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    startTypingAnimation();

    typingTimeout = setTimeout(() => {
        const typingDiv = document.getElementById('typing');
        typingDiv.classList.remove('typing-bubble');
        typingDiv.innerHTML = '';
        stopTypingAnimation();
    }, 800);
}

