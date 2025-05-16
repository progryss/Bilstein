// sseManager.js to manage SSE connections globally

const clients = {};

// Function to add a client
function addClient(clientId, response) {
    clients[clientId] = response;
}

// Function to remove a client
function removeClient(clientId) {
    delete clients[clientId];
}

// Function to send a message to all clients
function sendToAll(message) {
    Object.values(clients).forEach(client => client.write(`data: ${JSON.stringify(message)}\n\n`));
}

const invEventController = (req, res) => {
    const clientId = Date.now();
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    addClient(clientId, res); // Add client to the manager

    req.on('close', () => {
        removeClient(clientId); // Remove client when they disconnect
        res.end();
    });
}

module.exports = { addClient, removeClient, sendToAll, invEventController };