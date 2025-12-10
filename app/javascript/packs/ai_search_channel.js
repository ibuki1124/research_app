// app/javascript/packs/ai_search_channel.js

import consumer from "../channels/consumer"

let container = null;
let identifier = null;
let subscription = null;

function normalizeTerm(term) {
  if (!term) return '';
  return term.replace(/[\r\n\s]/g, '').trim();
}

function subscribeToChannel() {
  // 既に購読済みであれば何もしない
  if (subscription) return;
  container = document.getElementById('ai-search-results');
  identifier = container ? container.dataset.identifier : null;
  if (identifier) {
    subscription = consumer.subscriptions.create({ channel: "AiSearchChannel", identifier: identifier }, {
      connected() {
        console.log("Connected to AI Search Channel.");
      },

      disconnected() {
        console.log("Disconnected from AI Search Channel.");
      },

      // チャンネルからデータが届いた時の処理
      received(data) {
        const searchDataElement = document.getElementById('current-search-data');
        if (!container) {
          console.error("Action Cable: Target container not found in DOM.");
          return;
        }
        const activeSearchTerm = searchDataElement ? searchDataElement.dataset.term : null;
        const receivedSearchTerm = data.search_term;
        const isMatch = (normalizeTerm(activeSearchTerm) === normalizeTerm(receivedSearchTerm));
        if (isMatch) {
          container.innerHTML = data.html;
          const loadingMessage = container.querySelector('.ai-loading-message');
          if (loadingMessage) {
            loadingMessage.remove();
          }
        }
      }
    });
  }
}

// 💡 修正5: DOMが構築され、Turbolinksが読み込まれた後に購読を開始
document.addEventListener('turbolinks:load', subscribeToChannel);


document.addEventListener('turbolinks:before-cache', function() {
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
    console.log("Unsubscribed from AI Search Channel.");
  }
});