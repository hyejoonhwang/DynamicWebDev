const express = require("express");

const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

let messages = [];

app.get("/messages", (request, response) => {
  response.json({ messages: messages });
});

app.post("/messages", (request, response) => {
  messages.push({
    user: request.body.user,
    foodplace: request.body.foodplace,
    menu: request.body.menu,
  });
  response.redirect("/");
});

app.get("/messages/delete", (request, response) => {
  let index = request.query.index;
  let newMessages = [];
  for (let i = 0; i < messages.length; i++) {
    if (i != index) {
      newMessages.push(messages[i]);
    }
  }
  messages = newMessages;
  response.json({ success: true });
});

app.get("/messages/update", (request, response) => {
  let index = request.query.index;
  if (index >= 0 && index < messages.length) {
    messages[index].user = request.query.user;
    messages[index].foodplace = request.query.foodplace;
    messages[index].menu = request.query.menu;
  }
  response.json({ success: true });
});

app.listen(8000, () => {
  console.log("server is running");
});
