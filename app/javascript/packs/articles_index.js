document.addEventListener('DOMContentLoaded', function() {
  // 検索タイプの切り替え処理
  const searchTypeSelect = document.getElementById('search_type');
  const searchInput = document.querySelector('input[name="q[article_title_or_lead_text_cont]"]');

  function updateSearchInputName() {
      const selectedType = searchTypeSelect.value;
      const currentName = searchInput.getAttribute('name');
      // パラメータ名に含まれる現在の検索タイプを新しいタイプに置換
      const newName = currentName.replace(/_(cont|eq|start|end)/, `_${selectedType}`);
      searchInput.setAttribute('name', newName);
  }

  updateSearchInputName();
  searchTypeSelect.addEventListener('change', updateSearchInputName);

  // --- モーダル関連のJavaScript ---
  const externalModal = document.getElementById('externalModal');
  const iframeElement = document.getElementById('embeddedIframe');
  const modalTitleElement = document.getElementById('externalModalLabel');
  const openInNewTabLink = document.getElementById('openInNewTab');

  // モーダルが表示される直前のイベントを捕捉
  externalModal.addEventListener('show.bs.modal', function (event) {
      const button = event.relatedTarget;
      const url = button.getAttribute('data-detail-url');
      const title = button.getAttribute('data-article-title');

      if (url) {
          iframeElement.src = url;
      }

      if (title) {
          modalTitleElement.textContent = ` ${title}`;
      } else {
          modalTitleElement.textContent = `参考記事`;
      }

      if (url) {
          openInNewTabLink.href = url;
          openInNewTabLink.classList.remove('d-none');
      } else {
          openInNewTabLink.classList.add('d-none');
      }
  });

  // モーダルが閉じられたときにiframeのsrcをクリア
  externalModal.addEventListener('hidden.bs.modal', function () {
      iframeElement.src = '';
      modalTitleElement.textContent = '参考記事';
  });
});