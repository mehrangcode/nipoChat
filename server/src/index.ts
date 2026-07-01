import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { getFeatures } from './config/features';
import { runMigrations } from './db';
import { pushService } from './services/push.service';
import { initSockets } from './sockets';

runMigrations();

const app = createApp();
const server = http.createServer(app);
initSockets(server);

server.listen(env.port, () => {
  const f = getFeatures();
  console.log(`\n  Nipo Chat server ready`);
  console.log(`  ▸ http://localhost:${env.port}`);
  console.log(`  ▸ push: ${pushService.enabled ? 'enabled' : 'DISABLED (set VAPID keys)'}`);
  console.log(`  ▸ calls: voice=${f.voiceCall} video=${f.videoCall}`);
  console.log(`  ▸ allowed origins: ${env.clientOrigins.join(', ')}\n`);
});
