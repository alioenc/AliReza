const { WebSocketServer } = require('ws');
const net = require('net');

// استفاده از نام‌های مستعار برای فریب سیستم مانیتورینگ
const START_SIGNAL = Buffer.from([0x05, 0x00, 0x00, 0x01]); 

export default async function handleTeamSync(req, res) {
    if (req.headers.upgrade !== 'websocket') {
        // ایجاد یک صفحه فرود (Landing Page) کاملاً عادی برای بازدیدکنندگان معمولی
        return res.status(200).send("<h1>System Status: Online</h1><p>Messaging API is running smoothly.</p>");
    }

    const socket = new WebSocketServer({ noServer: true });
    
    socket.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
        ws.on('message', (payload) => {
            // منطق پردازش داده‌ها به صورت کاملاً غیرمستقیم
            processDataStream(ws, payload);
        });
    });
}

function processDataStream(clientSocket, data) {
    // تمام پارامترهای اتصال را از ENV بخوانید نه از کد
    const nodeConfig = process.env.NODE_GATEWAY; 
    
    const tunnel = net.connect({ host: nodeConfig, port: 443 }, () => {
        tunnel.write(data);
    });

    tunnel.on('data', (chunk) => {
        if (clientSocket.readyState === 1) {
            clientSocket.send(chunk);
        }
    });

    clientSocket.on('close', () => tunnel.end());
    tunnel.on('close', () => clientSocket.terminate());
    tunnel.on('error', () => clientSocket.terminate());
}
