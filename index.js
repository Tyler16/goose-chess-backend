const { WebSocketServer } = require("ws")
const server = new WebSocketServer({ port: 8080 })

const users = {}

server.on("connection", socket => {
	// accept websocket connection
	const user = {
		socket,
		lookingForGame: false,
		opponent: null,
		id: Math.random().toString().slice(2) // Generate random user id
	}
	users[user.id] = user // add user to list of users
	console.log("got a new user with id", user.id)
	console.log("all users:", Object.keys(users))

	socket.on("message", data => {
		try {
			handleMessage(JSON.parse(data), user)
		} catch(error) {
			console.log(data)
			console.log("error handling message from user", user.id, error)
		}
	})

	socket.on("close", () => {
		//remove user from active users list
		console.log("user with id", user.id, "disconnected")
		if (user.opponent) {
			user.opponent.socket.send(JSON.stringify({type: "close"}))
			delete users[user.opponent.id]
		}
		delete users[user.id]
		console.log("all users:", Object.keys(users))
	})
})

function handleMessage(msg, user) {
	// message schema:
	// {
	// 	type: "queue" | "boardUpdate" | "endGame",
	// 	data: <message data>
	// }
	if (msg.type === "queue" || !user.opponent) {
		user.lookingForGame = true
		user.socket.send(JSON.stringify({type: "queue"})) // send a message to the client confirming they are in the queue
		updateGameQueue()
	} else if (msg.type === "boardUpdate" && user.opponent) {
		// assume board is correct and send board to opponent
		console.log(msg.data)
		user.opponent.socket.send(JSON.stringify({
			type: "boardUpdate",
			data: msg.data
		}))
	} else if (msg.type === "endGame" && user.opponent) {
		// assume end game message is correct and stop the game
		user.opponent.socket.send(JSON.stringify({
			type: "endGame"
		}))
		user.opponent.opponent = null
		user.opponent = null
	}
}

// pair users looking for a game

function updateGameQueue() {
	let seeking
	for (const user of Object.values(users)) {
		if (user.lookingForGame) {
			if (seeking) {
				console.log("matched", seeking.id, user.id)
				// match two users looking for a game
				seeking.lookingForGame = false
				seeking.opponent = user
				user.lookingForGame = false
				user.opponent = seeking
				// send game found notification to both users
				
				seeking.socket.send(JSON.stringify({
					type: "gameFound",
					playerNum: 1
				}))
				user.socket.send(JSON.stringify({
					type: "gameFound",
					playerNum: 2
				}))
				seeking = null
			}
			else {
				seeking = user
			}
		}
	}
}
