const listEl = document.getElementById("list");
const countEl = document.getElementById("count");
const formEl = document.getElementById("add-form");
const inputEl = document.getElementById("add-input");
const messageEl = document.getElementById("message");

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

async function render() {
  const list = await yubGetBlockedUsers();
  countEl.textContent = String(list.length);
  listEl.replaceChildren();

  if (list.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "まだ誰もブロックしていません";
    listEl.appendChild(li);
    return;
  }

  // 新しく追加した順
  for (const user of [...list].sort((a, b) => b.addedAt - a.addedAt)) {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "user";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = user.name;
    const id = document.createElement("span");
    id.className = "id";
    id.textContent = user.id;
    info.append(name, id);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "解除";
    btn.addEventListener("click", async () => {
      await yubRemoveBlockedUser(user.id);
      showMessage(`${user.name} のブロックを解除しました`);
      render();
    });

    li.append(info, btn);
    listEl.appendChild(li);
  }
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = inputEl.value;
  const id = yubNormalizeUserId(raw);
  if (!id) {
    showMessage("@handle かチャンネル URL を入力してください", true);
    return;
  }
  const added = await yubAddBlockedUser(id, id);
  if (added) {
    inputEl.value = "";
    showMessage(`${id} をブロックしました`);
    render();
  } else {
    showMessage(`${id} は既にブロック済みです`, true);
  }
});

render();
