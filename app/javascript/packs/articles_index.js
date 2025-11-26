document.addEventListener('DOMContentLoaded', function() {
    // ----------------------------------------------------------------------
    // 1. Ransack検索タイプの切り替え処理 (既存コードを維持)
    // ----------------------------------------------------------------------
    const searchTypeSelect = document.getElementById('search_type');
    // 検索インプットのセレクタを汎用的に修正
    const searchInput = document.querySelector('input[name^="q[article_title_or_lead_text"]'); 

    function updateSearchInputName() {
        if (!searchTypeSelect || !searchInput) return;
        
        const selectedType = searchTypeSelect.value;
        const currentName = searchInput.getAttribute('name');
        
        // 正規表現を修正し、末尾の検索タイプ（cont|eq|start|end）を確実に置き換える
        // 末尾の ']' を考慮
        const newName = currentName.replace(/_(cont|eq|start|end)\]/, `_${selectedType}]`);
        searchInput.setAttribute('name', newName);
    }

    if (searchTypeSelect && searchInput) {
        updateSearchInputName();
        searchTypeSelect.addEventListener('change', updateSearchInputName);
    }

    // ----------------------------------------------------------------------
    // 2. AI検証トグルボタンの処理
    // ----------------------------------------------------------------------
    const toggleButton = document.getElementById('ai-check-toggle');
    const hiddenField = document.getElementById('use-ai-hidden-field');
    
    // トグルボタンのクリックイベント
    if (toggleButton && hiddenField) {
        toggleButton.addEventListener('click', () => {
            let currentState = toggleButton.getAttribute('data-current-state');
            let newState = (currentState === '1') ? '0' : '1';
            let newText = (newState === '1') ? 'ON' : 'OFF';

            // UI更新 (クラスを確実に削除/追加)
            toggleButton.classList.remove('btn-success', 'btn-danger');
            toggleButton.classList.add(newState === '1' ? 'btn-success' : 'btn-danger');
            toggleButton.textContent = newText;
            toggleButton.setAttribute('data-current-state', newState);

            // 💡 OFF (0) の場合、値を空にしてパラメータを送信させない
            if (newState === '0') {
                hiddenField.value = ''; 
            } else {
                hiddenField.value = '1';
            }
        });
    }

    // ----------------------------------------------------------------------
    // 3. モーダル関連のJavaScript (クリア後の安定性強化)
    // ----------------------------------------------------------------------
    const externalModal = document.getElementById('externalModal');
    const iframeElement = document.getElementById('embeddedIframe');
    const modalTitleElement = document.getElementById('externalModalLabel');
    const openInNewTabLink = document.getElementById('openInNewTab');
    
    // 💡 モーダルが表示される直前のイベントを捕捉
    if (externalModal) {
        externalModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            // 💡 buttonが存在しないか、データがない場合は処理を中断
            if (!button) {
                console.error("Clicked element (relatedTarget) not found.");
                return;
            }
            
            const url = button.getAttribute('data-detail-url');
            const title = button.getAttribute('data-article-title');

            if (url) {
                iframeElement.src = url;
                openInNewTabLink.href = url;
                openInNewTabLink.classList.remove('d-none');
            } else {
                iframeElement.src = 'about:blank'; // リンク切れの場合
                openInNewTabLink.classList.add('d-none');
            }

            modalTitleElement.textContent = title || '参考記事'; // titleがない場合はデフォルト
        });

        // モーダルが閉じられたときにiframeのsrcをクリア
        externalModal.addEventListener('hidden.bs.modal', function () {
            iframeElement.src = '';
            modalTitleElement.textContent = '参考記事';
        });
    }

    // ----------------------------------------------------------------------
    // 4. 新規: クリアボタンの処理
    // ----------------------------------------------------------------------
    const clearLink = document.getElementById('clear-search-link');
    if (clearLink) {
        clearLink.addEventListener('click', function(e) {
            e.preventDefault(); // リンクのデフォルト動作（即座の遷移）をキャンセル

            // 1. フォームのリセット (テキストフィールドなどをクリア)
            const form = document.querySelector('form');
            if (form) {
                form.reset(); // フォームをブラウザのデフォルト初期状態に戻す
            }
            
            // 2. AI検証ボタンの状態をデフォルト (ON/1) にリセット
            if (toggleButton && hiddenField) {
                // UIをON/緑に強制リセット
                toggleButton.classList.remove('btn-danger');
                toggleButton.classList.add('btn-success');
                toggleButton.textContent = 'ON';
                toggleButton.setAttribute('data-current-state', '1');
                
                // 隠しフィールドの値をデフォルトの '1' に設定
                hiddenField.value = '1';
            }
            
            // 3. root_pathへ遷移 (検索パラメータなしでリロード)
            window.location.href = clearLink.href; // <a href> の root_path へ遷移
        });
    }
});