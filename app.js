const express = require("express");
const mongoose = require("mongoose");

const cookieParser = require("cookie-parser");

const cors = require("cors");
const serverController = require("./controllers/serverController");
const jwt = require("jsonwebtoken");

const userController = require("./controllers/userController");
const extraerUsuario = require("./middleware/extraerUsuario");
const ServerManager = require("./ServerManager");
let dbURI =
  "mongodb+srv://user:$Password12$@cluster0.nybh2.mongodb.net/game?retryWrites=true&w=majority";

const app = express();
const port = 3000;
let wsServer;

start();

async function start() {
  await mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  var server = app.listen(port, () => {
    console.log(`El servidor está escuchando en el puerto ${port}`);
  });
  const WebSocketServer = require("websocket").server;
  wsServer = new WebSocketServer({
    httpServer: server,
  });

  wsServer.on("request", wsServerRequest);
}
const corsOptions = {
  origin: true, //included origin as true
  credentials: true,
};
//   app.use(function(req, res, next) {
//     res.header('Access-Control-Allow-Origin', req.headers.origin);
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("*", extraerUsuario);

app.post("/user/signup", userController.signup);
app.post("/user/login", userController.login);
app.post("/server/create", serverController.create);

app.get("/server", serverController.getAll);

app.use("*", (req, res) => {
  const error =
    res.locals.user == null
      ? "el usuario no esta logeado"
      : "el recurso no existe";
  res.status(400).json({ error });
});

async function wsServerRequest(request) {
  const token = request.resourceURL.query.token;

  const decodedToken = await jwt.verify(token, "efe");

  const connection = request.accept(null, request.origin);
  const user = { username: decodedToken.username, connection };
  console.log("se conecto ", user.username);
  ServerManager.getInstance().setUser(user);
  connection.on("message", function (message) {
    let data = JSON.parse(message.utf8Data);
    wsServerController(data.action, user, data.content, connection);
  });

  connection.on("close", function (reasonCode, description) {
    ServerManager.getInstance().deleteUser(user);
    console.log("Client has disconnected. ",user.username);
  });
}

function wsServerController(action, user, content, connection) {
  if (action == "request/server/create") {
    ServerManager.getInstance().setServer(user);
    let resp = {
      action: "response/server/list",
      content: ServerManager.getInstance().getServers(),
    };
    let respJSON = JSON.stringify(resp);
    // connection.send(respJSON);
    for (const user of ServerManager.getInstance().getUsers()) {

    //   if (ServerManager.getInstance().servers.has(user.username)) {
    //     continue;
    //   }
      user.connection.send(respJSON);
    }
  } else if (action == "request/server/list") {
    let resp = {
      action: "response/server/list",
      content: ServerManager.getInstance().getServers(),
    };
    let respJSON = JSON.stringify(resp);
    connection.send(respJSON);
  } else if (action == "request/server/descriptionAnswer") {
    const server = ServerManager.getInstance().servers.get(
      content.creatorUsername
    );
    server.setCandidateOffer(user.username, content.candidate);

    let resp = {
      action: "request/server/descriptionAnswer",
      content: {
        descriptionOffer: content.description,
        friendUsername: user.username,
      },
    };
    let respJSON = JSON.stringify(resp);

    const creator = ServerManager.getInstance().users.get(
      content.creatorUsername
    );
    console.log("ENVIANDO SOLICITUD DE DESCRIPTION ANSWER AL SERVIDOR");
    creator.connection.send(respJSON);
  }else if (action == "response/server/descriptionAnswer") {
    let resp = {
      action: "response/server/descriptionAnswer",
      content: {
        descriptionAnswer: content.description,
        candidateAnswer:content.candidate,
        creatorUsername: user.username,
      },
    };
    let respJSON = JSON.stringify(resp);

    const friend = ServerManager.getInstance().users.get(content.friendUsername);
    friend.connection.send(respJSON);
  } else if (action == "request/server/endAnswer") {
    const creator = ServerManager.getInstance().users.get(      content.creatorUsername
        );
        const server = ServerManager.getInstance().servers.get( content.creatorUsername);
        const candidateOffer = server.getCandidateOffer(user.username);
      let resp = {
        action: "request/server/endAnswer",
        content: {
          
          friendUsername: user.username,
          candidateOffer
        },
      };
      let respJSON = JSON.stringify(resp);
      creator.connection.send(respJSON);

  }
}
