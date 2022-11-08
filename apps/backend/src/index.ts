#!/usr/bin/env node
import { WebSocket } from "ws";
import * as http from "http";
import { setupWSConnection } from "./y-websocket/utils";
import CONFIG from "./config";
import { app } from "./api";

const wss = new WebSocket.Server({ noServer: true });
const host = CONFIG.host;
const port = CONFIG.port;

const server = http.createServer(app);

wss.on("connection", (conn, req) => setupWSConnection(conn, req));

server.on("upgrade", (request, socket, head) => {
  // console.log(request.headers);

  // You may check auth of request here..
  // See https://github.com/websockets/ws#client-authentication
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(port, () => {
  console.log(`running at '${host}' on port ${port}`);
});
