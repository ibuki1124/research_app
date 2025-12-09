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

function cleanUpModalBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
        backdrop.remove();
    });
    // bodyに残った不要なクラスも削除
    document.body.classList.remove('modal-open');
    document.body.classList.remove('modal-open-fix'); // 以前追加した可能性のあるカスタムfixクラスも削除
    document.body.style.overflow = '';
}

document.addEventListener('turbolinks:load', function() {
    $loadingSpinner = $('#loading-spinner');
    // ----------------------------------------------------------------------
    // 1. Ransack検索タイプの切り替え処理
    // ----------------------------------------------------------------------
    const searchTypeSelect = document.getElementById('search_type');
    // 入力フィールドのコンテナと要素の定義をDOM取得可能にする
    const normalSearchField = document.getElementById('normal-search-field');
    const aiSearchTextarea = document.getElementById('ai-search-textarea');

    const searchTypeContainer = document.getElementById('search-type-container');
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

        if (searchTypeContainer && searchTypeSelect) {
            if (isAiCheckOn) {
                // AI検証 ON の場合: セレクトボックスを非表示にし、値を 'cont' に強制設定
                searchTypeContainer.classList.add('d-none');
                searchTypeSelect.value = 'cont'; // 部分一致に固定
            } else {
                // AI検証 OFF の場合: セレクトボックスを表示
                searchTypeContainer.classList.remove('d-none');
            }
        }

        // name属性を動的に設定/削除し、サーバーへの送信を制御する
        if (currentActive) {
            currentActive.parentNode.style.display = 'block'; // 表示
            const baseName = currentActive.dataset.ransackBase;
            const selectedType = isAiCheckOn ? 'cont' : searchTypeSelect.value;
            const newName = `q[${baseName}_${selectedType}]`;
            currentActive.setAttribute('name', newName);
        }
        if (currentInactive) {
            currentInactive.removeAttribute('name');
            currentInactive.parentNode.style.display = 'none'; // 非表示
        }
        aiCheckLabel.textContent = isAiCheckOn ? 'ON' : 'OFF';
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

    function toggleBodyScrollFix(isModalOpen) {
        // 既存のBootstrapの .modal-open クラスを上書きし、
        // iOS/Safariで必要となる position: fixed; を適用するクラスを操作する
        const fixClass = 'modal-open-fix'; 
        if (isModalOpen) {
            document.body.classList.add(fixClass);
        } else {
            document.body.classList.remove(fixClass);
        }
    }

    if (searchModal && toggleButton) {
        // 検索モーダルが表示される直前のイベントを捕捉
        searchModal.addEventListener('show.bs.modal', function() {
            cleanUpModalBackdrops();
            // 現在のチェック状態に合わせてUIを強制的に再同期する
            const isCurrentAiCheckOn = toggleButton.checked;
            toggleSearchInput(isCurrentAiCheckOn); // name属性と表示を再設定
            toggleBodyScrollFix(true);
        });

        searchModal.addEventListener('hidden.bs.modal', function () {
            toggleBodyScrollFix(false);
        });
    }
    // 外部モーダル関連（既存コード）
    if (externalModal) {
        externalModal.addEventListener('show.bs.modal', function (event) {
            cleanUpModalBackdrops();
            toggleBodyScrollFix(true);
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
            toggleBodyScrollFix(false);
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
            // 5. タグ関連のクリア
            selectedTags = []; // 選択中のタグ配列をクリア
            renderSelectedTags(); // UIと隠しフィールドを更新
            if (tagInput) tagInput.value = ''; // 予測入力欄をクリア
            // 6. Ransackのq[...をクリアするために、フォーム内のすべてのq[...]という名前のフィールドをクリア
            // 検索実行後にモーダルを開いたときに残っている可能性のある古いRansackクエリをクリア
            $(searchForm).find('input[name^="q["]').val('');
        });
    }
    // ----------------------------------------------------------------------
    // タブ切り替え時のフォーム制御とタグ検索ロジック
    // ----------------------------------------------------------------------
    // const searchModal = document.getElementById('searchModal');
    const searchForm = searchModal ? searchModal.querySelector('form') : null;
    // タグ検索要素の取得
    const tagInput = document.getElementById('tag-search-input');
    const tagSuggestionsContainer = document.getElementById('tag-suggestions');
    const selectedTagsHidden = document.getElementById('selected-tags-hidden');
    const selectedTagsDisplay = document.getElementById('selected-tags-display');
    // 💡 全ての検索要素の name 属性を制御する関数
    function controlSearchParameters(isTagSearchActive) {
        // キーワードフィールドの制御
        const currentKeywordInput = getActiveInput(); // 現在表示されている入力フィールド
        if (currentKeywordInput) {
            if (isTagSearchActive) {
                // タグ検索時はキーワードフィールドを無効化 (name属性を削除)
                currentKeywordInput.removeAttribute('name');
            } else {
                // キーワード検索時はキーワードフィールドを有効化 (name属性を設定)
                updateSearchInputName();
            }
        }
        // タグ隠しフィールドの制御
        if (selectedTagsHidden) {
            if (isTagSearchActive) {
                // タグ検索時はタグ隠しフィールドを有効化
                selectedTagsHidden.setAttribute('name', 'q[tag_in]');
            } else {
                // キーワード検索時はタグ隠しフィールドを無効化
                selectedTagsHidden.removeAttribute('name');
            }
        }
        if (tagInput) {
            if (isTagSearchActive) {
                tagInput.removeAttribute('name');
            } else {
                // キーワード検索タブにいる場合、tag_inputはダミーのnameを設定しても良いが、
                // 最も安全なのは name を持たせないこと。ここではremoveAttributeのまま維持。
            }
        }
    }
    // --- タブ切り替え時のイベントリスナー ---
    const keywordTab = document.getElementById('keyword-tab');
    const tagTab = document.getElementById('tag-tab');

    if (keywordTab && tagTab) {
        // タブが切り替わったときにパラメータの制御を実行
        keywordTab.addEventListener('shown.bs.tab', () => controlSearchParameters(false));
        tagTab.addEventListener('shown.bs.tab', () => controlSearchParameters(true));
        // モーダルが初めて開かれたときにも実行（初期表示がタグ検索でない場合）
        searchModal.addEventListener('show.bs.modal', () => {
             // アクティブなタブの状態を確認してパラメータを初期設定
            const isTagSearch = tagTab.classList.contains('active');
            controlSearchParameters(isTagSearch);
        });
    }
    // --- タグ検索ロジック ---
    // ページロード時の初期値を取得
    let selectedTags = selectedTagsHidden && selectedTagsHidden.value ? selectedTagsHidden.value.split(',').filter(t => t.trim() !== '') : [];
    // 選択されたタグのUIを更新
    function renderSelectedTags() {
        if (!selectedTagsDisplay || !selectedTagsHidden) return;
        selectedTagsDisplay.innerHTML = '';
        // 隠しフィールドを更新 (Ransackの配列検索に対応するためカンマ区切り)
        selectedTagsHidden.value = selectedTags.join(','); 
        selectedTags.forEach(tag => {
            const tagChip = document.createElement('span');
            tagChip.className = 'badge bg-primary text-light tag-chip me-2 p-2';
            tagChip.innerHTML = `${tag} <span class="tag-remove" style="cursor: pointer; margin-left: 5px;">&times;</span>`;
            tagChip.dataset.tag = tag;
            // 削除ボタンのイベント
            tagChip.querySelector('.tag-remove').addEventListener('click', (e) => {
                e.preventDefault();
                // タグを配列から削除
                selectedTags = selectedTags.filter(t => t !== tag);
                renderSelectedTags();
                // タグを削除したときに、検索タイプも更新されるようにする
                controlSearchParameters(true);
            });
            selectedTagsDisplay.appendChild(tagChip);
        });
    }
    // --- ユーティリティ: デバウンス関数 ---
    function debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    // 予測表示ロジック (Ajax)
    if (tagInput) {
        // ページロード時に選択済みのタグをレンダリング (既存)
        renderSelectedTags();

        // --- フォーカスイベント ---
        tagInput.addEventListener('focus', function() {
            const query = tagInput.value.trim();
            // 入力が空の場合のみ、全タグ候補を取得 (q="")
            if (query.length === 0) {
                // queryを空にしてAjaxリクエストを実行
                fetchTagsAndRender('');
            }
        });
        // --- Inputイベント ---
        tagInput.addEventListener('input', debounce(function() {
            const query = tagInput.value.trim();
            if (query.length < 2) {
                tagSuggestionsContainer.innerHTML = '';
                return;
            }
            fetchTagsAndRender(query);

        }, 300));
        // --- Ajax実行ロジックを関数化 ---
        function fetchTagsAndRender(query) {
            fetch(`/tags/suggestions?q=${encodeURIComponent(query)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(tags => { 
                    renderSuggestions(tags); 
                })
                .catch(error => { 
                    console.error('Error in tag suggestion pipeline:', error); 
                    tagSuggestionsContainer.innerHTML = '';
                });
        }
        // タグの候補をレンダリング (既存)
        function renderSuggestions(tags) {
             // ... (既存のrenderSuggestions関数の内容) ...
            tagSuggestionsContainer.innerHTML = '';
            if (tags.length === 0) {
                tagSuggestionsContainer.innerHTML = '<div class="list-group-item text-muted">候補がありません</div>';
                return;
            }
            tags.forEach(tag => {
                // ... (タグのレンダリングロジックはそのまま) ...
                if (selectedTags.includes(tag)) return;
                const suggestion = document.createElement('button');
                suggestion.className = 'list-group-item list-group-item-action';
                suggestion.textContent = tag;
                suggestion.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!selectedTags.includes(tag)) {
                        selectedTags.push(tag);
                        renderSelectedTags();
                        tagInput.value = '';
                        tagSuggestionsContainer.innerHTML = '';
                    }
                });
                tagSuggestionsContainer.appendChild(suggestion);
            });
        }
        // ページロード時に選択済みのタグをレンダリング
        renderSelectedTags();
    }
});