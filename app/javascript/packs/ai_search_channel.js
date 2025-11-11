// app/javascript/packs/ai_search_channel.js

import consumer from "../channels/consumer"

// Viewに設定した data-identifier 属性から識別子を取得
const container = document.getElementById('ai-search-results');
const identifier = container ? container.dataset.identifier : null;

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
      if (container) {
        // コンテナ全体を受信したHTMLで置き換える
        container.innerHTML = data.html; 
      }
    }
  });
}