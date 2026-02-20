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


app.listen(8000, () => {
  console.log("server is running");
});
