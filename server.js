const WebSocket = require('ws');

// 建立 WebSocket 伺服器
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

// 等待玩家連線的暫存區
let waitingPlayer = null;
let rooms = {};

wss.on('connection', (ws) => {
    console.log('新玩家已連接！');
    const playerId = `player_${Date.now()}`;
    ws.playerId = playerId;

    // 發送歡迎訊息
    ws.send(JSON.stringify({ type: 'welcome', playerId }));

    // 嘗試配對
    if (waitingPlayer) {
        const roomId = `room_${Date.now()}`;
        rooms[roomId] = [waitingPlayer, ws];
        waitingPlayer.send(JSON.stringify({ type: 'match', roomId, opponentId: ws.playerId }));
        ws.send(JSON.stringify({ type: 'match', roomId, opponentId: waitingPlayer.playerId }));
        waitingPlayer = null; // 清空等待玩家
    } else {
        waitingPlayer = ws;
        ws.send(JSON.stringify({ type: 'waiting', message: '等待對手加入...' }));
    }

    // 處理玩家訊息
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'action') {
            const opponent = rooms[data.roomId]?.find((player) => player !== ws);
            if (opponent) {
                opponent.send(JSON.stringify({ type: 'action', action: data.action }));
            }
        }
    });

    // 玩家斷線處理
    ws.on('close', () => {
        console.log(`玩家 ${playerId} 已斷線`);
        if (waitingPlayer === ws) {
            waitingPlayer = null;
        } else {
            Object.keys(rooms).forEach((roomId) => {
                rooms[roomId] = rooms[roomId].filter((player) => player !== ws);
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                }
            });
        }
    });
});

console.log('伺服器已啟動');
