window.onload =  () => {
const getMessages = async () => {
  const response = await fetch("/messages");
  const data = await response.json();
  const list = document.getElementById("message-list");
  list.innerHTML = "";

  for (let i = 0; i < data.messages.length; i++) {
    let msg = data.messages[i];
    let div = document.createElement("div");
    div.innerHTML =
      "<strong>" + msg.user + ":</strong> " + msg.foodplace + " - " + msg.menu;
    list.appendChild(div);
  }
};

getMessages();
}