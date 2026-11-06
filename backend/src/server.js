import {createServer} from 'node:http';import {Server} from 'socket.io';
import app from './app.js';import {env} from './config/env.js';import {setupSocket} from './sockets/chat.js';
const http=createServer(app);
const io=new Server(http,{cors:{origin:env.CLIENT_ORIGIN,credentials:true},maxHttpBufferSize:1024*1024});
setupSocket(io);
http.listen(env.PORT,()=>console.info(`Marketplace COD API: http://localhost:${env.PORT}/api/health`));
