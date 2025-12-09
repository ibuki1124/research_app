// app/javascript/packs/ai_search_channel.js

import consumer from "../channels/consumer"

// Viewに設定した data-identifier 属性から識別子を取得
const container = document.getElementById('ai-search-results');
const identifier = container ? container.dataset.identifier : null;

function normalizeTerm(term) {
  if (!term) return '';
  // 改行コード(\r, \n)とすべての空白文字(\s)を空文字に置換し、前後の空白を除去
  return term.replace(/[\r\n\s]/g, '').trim();
}

if (identifier) {
  consumer.subscriptions.create({ channel: "AiSearchChannel", identifier: identifier }, {
    connected() {
      console.log("Connected to AI Search Channel.");
    },

    disconnected() {
      console.log("Disconnected from AI Search Channel.");
    },

    // チャンネルからデータが届いた時の処理
    received(data) {
      const searchDataElement = document.getElementById('current-search-data');
      // 現在表示されているページの検索キーワードを取得
      const activeSearchTerm = searchDataElement ? searchDataElement.dataset.term : null;
      // Action Cableメッセージに含まれる検索キーワードを取得
      const receivedSearchTerm = data.search_term;
      const isMatch = (container && normalizeTerm(activeSearchTerm) === normalizeTerm(receivedSearchTerm));
      if (isMatch) {
        container.innerHTML = data.html;
      }
    }
  });
}