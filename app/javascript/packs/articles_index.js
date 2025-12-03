import $ from 'jquery';
window.$ = $;

let $loadingSpinner = null;

function checkScroll() {
    if ($(window).scrollTop() >= $(document).height() - $(window).height() - 200) {
        // 1. 次のページへのリンクを取得
        const nextLink = $('#pagination-links a[rel="next"]');
        if (nextLink.length) {
            $(window).off('scroll');
            // 2. 💡 ローディングアイコンを表示
            if ($loadingSpinner) {
                $loadingSpinner.show();
            }
            // 3. 💡 2秒間の遅延を設定
            setTimeout(function() {
                // 4. 遅延後、AJAXリクエストをトリガー
                nextLink[0].click();
            }, 2000);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    $loadingSpinner = $('#loading-spinner');
    // ----------------------------------------------------------------------
    // 1. Ransack検索タイプの切り替え処理
    // ----------------------------------------------------------------------
    const searchTypeSelect = document.getElementById('search_type');
    const NAME_ATTR_PATTERN = 'q\\[article_title_or_lead_text';
    // 入力フィールドのコンテナと要素の定義をDOM取得可能にする
    const normalSearchField = document.getElementById('normal-search-field');
    const aiSearchTextarea = document.getElementById('ai-search-textarea');

    // *DOM要素は関数内で毎回取得し、最新の状態を反映させる*
    function getActiveInput() {
        const activeElement = $(`#search-input-container input:visible, #search-input-container textarea:visible`)[0];
        return activeElement;
    }

    function updateSearchInputName() {
        const searchInput = getActiveInput();
        if (!searchTypeSelect || !searchInput) return;
        // data属性からRansackのベース名を取得 (例: q[article_title_or_lead_text)
        const baseName = searchInput.dataset.ransackBase; // q[article_title_or_lead_text
        const selectedType = searchTypeSelect.value;
        const newName = `q[${baseName}_${selectedType}]`;
        searchInput.setAttribute('name', newName);
    }

    // 初回ロード時の初期name属性の設定は、toggleSearchInputで実行されるため削除
    if (searchTypeSelect) {
        searchTypeSelect.addEventListener('change', updateSearchInputName); // 検索タイプ変更時
    }

    // ----------------------------------------------------------------------
    // 2. AI検証トグルボタンの処理
    // ----------------------------------------------------------------------
    const toggleButton = document.getElementById('ai-check-toggle');
    const hiddenField = document.getElementById('use-ai-hidden-field');
    const aiCheckLabel = document.getElementById('ai-check-label');

    // AI検証ON/OFF時の表示を切り替える関数
    function toggleSearchInput(isAiCheckOn) {
        const normalInput = document.getElementById('search-input-field');
        const aiTextarea = document.getElementById('search-input-textarea');
        
        const currentActive = isAiCheckOn ? aiTextarea : normalInput;
        const currentInactive = isAiCheckOn ? normalInput : aiTextarea;

        // name属性を動的に設定/削除し、サーバーへの送信を制御する
        if (currentActive) {
            currentActive.parentNode.style.display = 'block'; // 表示
            const baseName = currentActive.dataset.ransackBase;
            const selectedType = searchTypeSelect.value;
            const newName = `q[${baseName}_${selectedType}]`;
            currentActive.setAttribute('name', newName);
        }
        if (currentInactive) {
            currentInactive.removeAttribute('name');
            currentInactive.parentNode.style.display = 'none'; // 非表示
        }
        aiCheckLabel.textContent = isAiCheckOn ? '検証 ON' : '検証 OFF';
        console.log("Toggle AI Check:", isAiCheckOn ? 'ON' : 'OFF');
    }
    // トグルボタンの変更イベント
    if (toggleButton && hiddenField && normalSearchField && aiSearchTextarea) {
        // 初回ロード時の状態判定
        const isInitialAiCheckOn = hiddenField.value === '1';
        // HTML側のチェックボックスの状態をサーバー側の値に合わせる
        toggleButton.checked = isInitialAiCheckOn;
        // 初回ロード時の表示調整 (name属性設定も実行される)
        toggleSearchInput(isInitialAiCheckOn);
        // eventListenerは'change'を使用
        toggleButton.addEventListener('change', () => {
            const isChecked = toggleButton.checked;
            // 隠しフィールドの値を設定
            hiddenField.value = isChecked ? '1' : '';
            // 表示の切り替えとname属性の設定/削除
            toggleSearchInput(isChecked);
            // 検索フィールド間で値を引き継ぐ
            const normalInput = document.getElementById('search-input-field');
            const aiTextarea = document.getElementById('search-input-textarea');
            if (isChecked) {
                // OFFからONに切り替えた場合 (normal -> textarea)
                aiTextarea.value = normalInput.value;
            } else {
                // ONからOFFに切り替えた場合 (textarea -> normal)
                normalInput.value = aiTextarea.value;
            }
        });
    }

    // ----------------------------------------------------------------------
    // 3. モーダル関連のJavaScript (検索モーダルの再同期処理を追加)
    // ----------------------------------------------------------------------
    const externalModal = document.getElementById('externalModal');
    const iframeElement = document.getElementById('embeddedIframe');
    const modalTitleElement = document.getElementById('externalModalLabel');
    const openInNewTabLink = document.getElementById('openInNewTab');
    // 検索モーダル
    const searchModal = document.getElementById('searchModal');
    if (searchModal && toggleButton) {
        // 検索モーダルが表示される直前のイベントを捕捉
        searchModal.addEventListener('show.bs.modal', function() {
            // 現在のチェック状態に合わせてUIを強制的に再同期する
            const isCurrentAiCheckOn = toggleButton.checked;
            toggleSearchInput(isCurrentAiCheckOn); // name属性と表示を再設定
        });
    }
    // 外部モーダル関連（既存コード）
    if (externalModal) {
        externalModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
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
            modalTitleElement.textContent = title || '参考記事';
        });
        externalModal.addEventListener('hidden.bs.modal', function () {
            iframeElement.src = '';
            modalTitleElement.textContent = '参考記事';
        });
    }
    $(document).ready(function() {
        $(window).on('scroll', checkScroll);
    });
    $(document).on('ajax:complete', function() {
        if ($loadingSpinner) {
            $loadingSpinner.hide();
        }
        setTimeout(function() {
            if ($('#pagination-links').length) {
                $(window).on('scroll', checkScroll);
            }
        }, 100);
    });
    // ----------------------------------------------------------------------
    // 4. 【新規】検索クリアボタンの処理
    // ----------------------------------------------------------------------
    const clearButton = document.getElementById('clear-search-link');
    const searchForm = clearButton.closest('form'); // フォーム全体を取得

    if (clearButton && searchTypeSelect && toggleButton && hiddenField) {
        clearButton.addEventListener('click', () => {
            // 1. 検索タイプをデフォルト値に戻す (cont: 部分一致)
            searchTypeSelect.value = 'cont';
            // 2. AI検証トグルを強制的にOFFの状態に設定
            toggleButton.checked = false;
            hiddenField.value = ''; // 隠しフィールドの値もクリア
            // 3. 検索フィールドの値をクリア
            const normalInput = document.getElementById('search-input-field');
            const aiTextarea = document.getElementById('search-input-textarea');
            if (normalInput) {
                normalInput.value = '';
            }
            if (aiTextarea) {
                aiTextarea.value = '';
            }
            // 4. AI検証トグルOFFの状態にUIを再同期し、name属性を適切に設定し直す
            // toggleSearchInput内で、normalInputにname属性が設定され、aiTextareaからname属性が削除される
            toggleSearchInput(false);
            // 5. Ransackのq[...をクリアするために、フォーム内のすべてのq[...]という名前のフィールドをクリア
            // 検索実行後にモーダルを開いたときに残っている可能性のある古いRansackクエリをクリア
            $(searchForm).find('input[name^="q["]').val('');
        });
    }
});