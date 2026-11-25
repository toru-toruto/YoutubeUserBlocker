// YouTube の通常動画・Shorts のコメントから、ブロック済みユーザーのコメントを非表示にする。
//
// 通常動画のコメント欄も Shorts のコメントパネルも、同じコメント要素で描画される:
//   - ytd-comment-view-model（現行 UI）
//   - ytd-comment-renderer（旧 UI。フォールバック）
// トップレベルコメントは ytd-comment-thread-renderer の直下、返信は ytd-comment-replies-renderer の中にある。
//
// YouTube は DOM 要素を使い回す（要素はそのままで中身の投稿者だけ差し替わる）ため、
// 「一度処理した要素はスキップ」はせず、変化があるたびに全コメントを現在の投稿者で判定し直す。

(() => {
  const COMMENT_SELECTOR = "ytd-comment-view-model, ytd-comment-renderer";
  const AUTHOR_LINK_SELECTORS = [
    "a#author-text",
    "#author-text a",
    "a#author-thumbnail-button",
    "#author-thumbnail a",
    'a[href^="/@"]',
    'a[href*="/channel/UC"]',
  ];
  const HIDDEN_CLASS = "yub-hidden";
  const BUTTON_CLASS = "yub-block-btn";

  /** @type {Set<string>} */
  let blockedIds = new Set();

  /** コメント要素から投稿者 { id, name } を取り出す。取れなければ null。 */
  function getAuthor(commentEl) {
    for (const sel of AUTHOR_LINK_SELECTORS) {
      const link = commentEl.querySelector(sel);
      const href = link?.getAttribute("href");
      const id = href && yubNormalizeUserId(href);
      if (id) {
        const textEl = commentEl.querySelector("#author-text");
        const name = (textEl?.textContent || link.textContent || "").trim() || id;
        return { id, name };
      }
    }
    return null;
  }

  /** 非表示にする要素。トップレベルコメントなら返信ごとスレッド全体、返信ならその返信だけ。 */
  function getHideTarget(commentEl) {
    if (commentEl.closest("ytd-comment-replies-renderer")) return commentEl;
    return commentEl.closest("ytd-comment-thread-renderer") || commentEl;
  }

  function ensureBlockButton(commentEl) {
    if (commentEl.querySelector(`.${BUTTON_CLASS}`)) return;
    const header = commentEl.querySelector("#header-author");
    if (!header) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = BUTTON_CLASS;
    btn.textContent = "🚫 ブロック";
    btn.title = "このユーザーのコメントを非表示にする";
    btn.addEventListener("click", onBlockClick);
    header.appendChild(btn);
  }

  async function onBlockClick(e) {
    e.preventDefault();
    e.stopPropagation();
    // 要素が使い回されるので、投稿者はクリック時点で読み直す
    const commentEl = e.currentTarget.closest(COMMENT_SELECTOR);
    const author = commentEl && getAuthor(commentEl);
    if (!author) {
      alert("投稿者を特定できませんでした。");
      return;
    }
    if (!confirm(`${author.name}（${author.id}）をブロックして、コメントを非表示にしますか？`)) return;
    try {
      await yubAddBlockedUser(author.id, author.name);
    } catch (err) {
      // 拡張の再読み込み後など、古い content script からは保存できない
      alert("保存に失敗しました。ページを再読み込みしてください。");
      console.error("[YouTube User Blocker]", err);
    }
    // storage.onChanged 経由でも再判定されるが、即時に反映させる
    blockedIds.add(author.id);
    scan();
  }

  function scan() {
    const toHide = new Set();
    for (const commentEl of document.querySelectorAll(COMMENT_SELECTOR)) {
      ensureBlockButton(commentEl);
      const author = getAuthor(commentEl);
      if (author && blockedIds.has(author.id)) toHide.add(getHideTarget(commentEl));
    }
    // ブロック解除・要素の使い回しで対象外になったものは戻す
    for (const el of document.querySelectorAll(`.${HIDDEN_CLASS}`)) {
      if (!toHide.has(el)) el.classList.remove(HIDDEN_CLASS);
    }
    for (const el of toHide) el.classList.add(HIDDEN_CLASS);
  }

  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scan();
    }, 100);
  }

  async function loadBlocked() {
    const list = await yubGetBlockedUsers();
    blockedIds = new Set(list.map((u) => u.id));
    scan();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[YUB_STORAGE_KEY]) loadBlocked();
  });

  // コメントの追加読み込み（childList）と、要素使い回し時の投稿者リンク差し替え（href）を監視
  new MutationObserver(scheduleScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });

  loadBlocked();
})();
