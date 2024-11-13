const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Serve static files from the "public" folder
app.use(express.static('public'));

// Define multiple questions
const questions = [
    { text: "What's the capital of France?", options: { a: "Berlin", b: "Madrid", c: "Paris", d: "Rome" }, answer: "c" },
    { text: "What planet is known as the Red Planet?", options: { a: "Venus", b: "Mars", c: "Jupiter", d: "Saturn" }, answer: "b" },
    { text: "What PLC is the best?", options: { a: "Siemens", b: "Schneider", c: "Beckhoff", d: "WAGO" }, answer: "a" },
    { text: "What is the distance btwn the Sun & the Earth?", options: { a: "50km", b: "10 000km", c: "400 000km", d: "5 000 000" }, answer: "c" },
    { text: "What is the biggest Ocean?", options: { a: "Atlantic", b: "Indian", c: "Pacific", d: "nordic" }, answer: "c" },
    { text: "What name does Star Trek space Ship have?", options: { a: "U.S.S. Franklin", b: "U.S.S. Enterprise", c: "U.S.S. Lincoln", d: "U.S.S.ST" }, answer: "b" },
    { text: "What dinnosaur is the best killer?", options: { a: "T-Rex", b: "Spinosaurus", c: "Allosaurus", d: "Velociraptor" }, answer: "a" },
    { text: "What is the deepest lake?", options: { a: "Malawi", b: "Baikal", c: "Titicaca", d: "Genava" }, answer: "b" },
    { text: "What is Maros's favorite activity ?", options: { a: "programming", b: "drinking", c: "driving on the bus", d: "running" }, answer: "c" },
    { text: "How many kids does Rado have?", options: { a: "4", b: "2", c: "1", d: "3" }, answer: "c" }
];

const gameOver = { 
    winner: '', 
    maxScore: 0
}; 

let currentQuestionIndex = 0;

const players = {};  // { socketId: { name: 'PlayerName', score: 0, answered: false } }

// Function to send the current question to all clients
function sendQuestion() {
    //console.log("currentQIndex: " + currentQuestionIndex)
    if (currentQuestionIndex < questions.length) {
        const question = questions[currentQuestionIndex];
        io.emit('question', question); // Send question to all clients
        io.emit('updateAdmin', { question, players }); // Update admin view with question and players        
    } else {
        //Game is Over!
        for (const playerId in players) {
            if (players[playerId].score > gameOver.maxScore) {
                gameOver.maxScore = players[playerId].score;
                gameOver.winner = players[playerId].name;
            }
        }
        io.emit('gameOver', gameOver);
        console.log("winner is: " + gameOver.winner + " MaxScore is: " + gameOver.maxScore);
    }
}

// Reset each player's "answered" status for a new question
function resetPlayerAnswers() {
    for (const playerId in players) {
        players[playerId].answered = false;
    }
}

// Reset game state
function resetGame() {
    currentQuestionIndex = 0;  // Start with the first question
    for (const playerId in players) {
        players[playerId].score = 0;  // Reset player scores
        players[playerId].answered = false;  // Reset answer status
    }
    sendQuestion();  // Send the first question after resetting
}

// Check if all players have answered the current question
function allPlayersAnswered() {
    return Object.values(players).every(player => player.answered);
}

// Handle client connections
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle player joining
    socket.on('join', (userName) => {
        console.log("New Player assigned: " + userName);
        players[socket.id] = { name: userName, score: 0, answered: false };
        socket.emit('welcome', `Welcome, ${userName}!`);
        sendQuestion(); // Send the current question to the newly joined player
    });

    // Listen for answers from clients
    socket.on('answer', (data) => {
        const { answer } = data;
        const question = questions[currentQuestionIndex];

        // Check if the player's answer is correct and update their score
        if (answer === question.answer) {
            players[socket.id].score += 1;  // Add 1 point for a correct answer
        }

        players[socket.id].answered = true;  // Mark this player as having answered

        // Send feedback to the player about their answer
        socket.emit('answerResult', { isCorrect: answer === question.answer, currentScore: players[socket.id].score });

        // Check if all players have answered
        if (allPlayersAnswered()) {
            currentQuestionIndex += 1;  // Move to the next question
            resetPlayerAnswers();  // Reset answer status for all players
            sendQuestion();  // Send the new question
            console.log("allPlayersAnswered!");
        }

        // Update the admin view after each answer
        io.emit('updateAdmin', { question: questions[currentQuestionIndex], players, gameOver });
    });

    // Handle the reset game event
    socket.on('resetGame', () => {
        resetGame();  // Reset the game state
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete players[socket.id];
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
