const getMessages = async () => {
  let response = await fetch("/messages");
  let data = await response.json();
  let list = document.getElementById("message-list");
  list.innerHTML = "";

  for (let i = 0; i < data.messages.length; i++) {
    let msg = data.messages[i];
    let div = document.createElement("div");
    div.id = "message-" + i;
    div.innerHTML =
      "<strong>" + msg.user + ":</strong> " + msg.foodplace + " - " + msg.menu +
      ' <button onclick="deleteMessage(' + i + ')">Delete</button>' +
      ' <button onclick="editMessage(' + i + ')">Edit</button>';
    list.appendChild(div);
  }
};

const deleteMessage = async (index) => {
  let params = new URLSearchParams({ index: index });
  await fetch("/messages/delete?" + params);
  getMessages();
};

const editMessage = async (index) => {
  let response = await fetch("/messages");
  let data = await response.json();
  let msg = data.messages[index];

  let div = document.getElementById("message-" + index);
  div.innerHTML = "";

  let userInput = document.createElement("input");
  userInput.value = msg.user;
  div.appendChild(userInput);

  let foodInput = document.createElement("input");
  foodInput.value = msg.foodplace;
  div.appendChild(foodInput);

  let menuInput = document.createElement("input");
  menuInput.value = msg.menu;
  div.appendChild(menuInput);

  let saveBtn = document.createElement("button");
  saveBtn.innerHTML = "Save";
  saveBtn.addEventListener("click", async () => {
    let params = new URLSearchParams({
      index: index,
      user: userInput.value,
      foodplace: foodInput.value,
      menu: menuInput.value,
    });
    await fetch("/messages/update?" + params);
    getMessages();
  });
  div.appendChild(saveBtn);
};

getMessages();
