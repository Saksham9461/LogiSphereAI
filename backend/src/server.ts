import {env} from './config/env';

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
  const {app} = await import('./app');

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(
      `LogiSphere AI backend listening on http://0.0.0.0:${env.PORT}`
    );
  });
}

startServer().catch((error) => {
  console.error('\n❌ SERVER STARTUP FAILED:');
  console.error(error);
});