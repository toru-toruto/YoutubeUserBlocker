# YouTube User Blocker

YouTube の通常動画のコメント欄と Shorts のコメントパネルから、指定したユーザーのコメントを非表示にする Chrome 拡張（Manifest V3）。

## インストール

1. `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選ぶ

## 使い方

- **コメントからブロックする**: コメントにマウスを乗せると、投稿者名の横に「🚫 ブロック」が出る。押して確認すると、そのユーザーのコメントが消える
- **手動で追加する**: ツールバーの拡張アイコン → `@handle` / チャンネル URL / `UC...` を入力して「追加」
- **解除する**: ポップアップの一覧で「解除」

## 挙動

- トップレベルコメントがブロック対象なら、返信を含むスレッドごと非表示にする
- 返信がブロック対象なら、その返信だけ非表示にする
- ブロック一覧は `chrome.storage.local` に保存する（この端末の Chrome だけ）

## 制限

- ユーザーはコメントの投稿者リンク（通常は `/@handle`）で識別する。チャンネル ID（`UC...`）で登録したユーザーは、コメントのリンクがハンドル形式だと一致しないので、基本は `@handle` で登録する
- YouTube の DOM 構造が変わるとセレクタの修正が必要になる（`src/content.js` の `COMMENT_SELECTOR` / `AUTHOR_LINK_SELECTORS`）

## 構成

```
manifest.json
src/
  storage.js   ID 正規化とストレージ操作（content script / popup 共通）
  content.js   コメントの監視・非表示・ブロックボタン
  content.css
  popup.html / popup.js   ブロック一覧の管理
```
