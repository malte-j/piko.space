import * as trpcExpress from "@trpc/server/adapters/express";
import * as cors from "cors";
import * as express from "express";
import { credential } from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import * as http from "http";
import * as path from "path";
import { WebSocket } from "ws";
import CONFIG from "./config";
import { appRouter } from "./routers/_app";
import { createContext } from "./trpc";
import { setupWSConnection } from "./y-websocket/utils";

initializeApp({
  credential: credential.cert({
    projectId: CONFIG.firebase.projectId,
    clientEmail: CONFIG.firebase.clientEmail,
    privateKey: CONFIG.firebase.privateKey,
  }),
});

// firebase attempt app init
const expressApp = express();
expressApp.disable("x-powered-by");
expressApp.use(
  cors({
    origin: CONFIG.frontendUrl,
  })
);

expressApp.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// serve static assets normally
expressApp.use(express.static(__dirname + "/dist"));
expressApp.set("view engine", "html");
expressApp.engine("html", require("hbs").__express);

// render index html with correct og image url
expressApp.get("/edit/:fileId", (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log("rendering", url.toString(), CONFIG.ogImageUrl);
  // TODO: check if fileId matches the correct format
  res.render(path.join(__dirname, "dist", "index"), {
    og_image_url: CONFIG.ogImageUrl + "?fileId=" + req.params.fileId,
    og_url: url.toString(),
  });
});

expressApp.get("/*", function (req, res) {
  console.log("sending file", req.url);
  res.sendFile(path.resolve(__dirname, "dist/index.html"));
});

// Set up yjs websocket
const wss = new WebSocket.Server({ noServer: true });
const host = CONFIG.host;
const port = CONFIG.port;

const server = http.createServer(expressApp);

wss.on("connection", (conn, req) => setupWSConnection(conn, req));
server.on("upgrade", (request, socket, head) => {
  // You may check auth of request here..
  // See https://github.com/websockets/ws#client-authentication
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(port, () => {
  console.log(`running at '${host}' on port ${port}`);
});
