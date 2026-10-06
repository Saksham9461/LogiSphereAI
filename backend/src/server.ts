import http from 'http';
import { env } from './config/env';
import { initChatWebSocket } from './modules/chat/websocket';
import { startChatCleanupJob } from './modules/chat/cleanup';

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ UNHANDLED PROMISE REJECTION:');
  console.error(reason);
  console.error('JSON:', JSON.stringify(reason, null, 2));
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ UNCAUGHT EXCEPTION:');
  console.error(error);
});

async function startServer() {
  const { app } = await import('./app');
  const server = http.createServer(app);

  // Initialize WebSocket server attached to HTTP server
  initChatWebSocket(server);

  // Start 24-hour chat retention automatic cleanup job
  startChatCleanupJob();

  server.listen(env.PORT, '0.0.0.0', () => {
    console.log(
      `LogiSphere AI backend listening on http://0.0.0.0:${env.PORT} (WebSockets active on /ws/chat)`
    );
  });
}

startServer().catch((error) => {
  console.error('\n❌ SERVER STARTUP FAILED:');
  console.error(error);
});