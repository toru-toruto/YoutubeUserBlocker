// content script と popup で共有するストレージ／ID 正規化ヘルパー。
// ブロック対象は「ユーザー ID」で管理する:
//   - ハンドル: "@foo"（小文字化して保存。YouTube のハンドルは大文字小文字を区別しない）
//   - チャンネル ID: "UCxxxx"（大文字小文字を区別するのでそのまま保存）

const YUB_STORAGE_KEY = "blockedUsers";

/**
 * URL・パス・"@handle"・"UC..." のいずれかを受け取り、ユーザー ID に正規化する。
 * 解釈できなければ null。
 */
function yubNormalizeUserId(input) {
  if (!input) return null;
  let s = String(input).trim();
  if (!s) return null;

  // フル URL ならパス部分だけ取り出す
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
  } catch (_) {
    /* そのまま扱う */
  }

  try {
    s = decodeURIComponent(s);
  } catch (_) {
    /* 不正なエスケープはそのまま */
  }

  // "/@handle/..." または "@handle"
  let m = s.match(/(?:^|\/)(@[^/?#\s]+)/);
  if (m) return m[1].toLowerCase();

  // "/channel/UCxxxx" または "UCxxxx"
  m = s.match(/(?:^|\/channel\/)(UC[\w-]{22})(?:$|[/?#])/);
  if (m) return m[1];

  // "@" なしでハンドルが入力された場合
  if (/^[^\s/@]+$/.test(s)) return ("@" + s).toLowerCase();

  return null;
}

/** @returns {Promise<Array<{id: string, name: string, addedAt: number}>>} */
async function yubGetBlockedUsers() {
  const data = await chrome.storage.local.get(YUB_STORAGE_KEY);
  return Array.isArray(data[YUB_STORAGE_KEY]) ? data[YUB_STORAGE_KEY] : [];
}

async function yubSetBlockedUsers(list) {
  await chrome.storage.local.set({ [YUB_STORAGE_KEY]: list });
}

/** 追加できたら true、既に登録済み・不正な入力なら false */
async function yubAddBlockedUser(id, name) {
  const normalized = yubNormalizeUserId(id);
  if (!normalized) return false;
  const list = await yubGetBlockedUsers();
  if (list.some((u) => u.id === normalized)) return false;
  list.push({ id: normalized, name: name || normalized, addedAt: Date.now() });
  await yubSetBlockedUsers(list);
  return true;
}

async function yubRemoveBlockedUser(id) {
  const list = await yubGetBlockedUsers();
  await yubSetBlockedUsers(list.filter((u) => u.id !== id));
}
