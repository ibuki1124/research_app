import $ from 'jquery';
window.$ = $;

// --- ファイルスコープ変数 ---
let $loadingSpinner = null;
let selectedTags = [];
let searchTypeSelect = null;
let toggleButton = null;
let searchModal = null;
let externalModal = null;
let tagInput = null;
let selectedTagsHidden = null;
let selectedTagsDisplay = null;
let searchForm = null;
let keywordTab = null;
let tagTab = null;
let isFetchingArticles = false;

// --- A. 無限スクロール関連 ---

function checkScroll() {
    if (isFetchingArticles) return;
    if ($(window).scrollTop() >= $(document).height() - $(window).height() - 200) {
        const nextLink = $('#pagination-links a[rel="next"]');
        if (nextLink.length) {
            isFetchingArticles = true;
            if ($loadingSpinner) {
                $loadingSpinner.show();
            }
            setTimeout(handleDelayedClick, 2000, nextLink);
        }
    }
}
function handleDelayedClick(nextLink) {
    // nextLinkはjQueryオブジェクトなので[0]でDOM要素を取得
    nextLink[0].click();
}

// --- B. モーダル/オフキャンバス・UIヘルパー関数 ---

function completelyResetBootstrap() {
    // 1. 黒い背景幕をすべて物理削除
    document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach(b => b.remove());
    // 2. bodyのロック解除
    document.body.classList.remove('modal-open', 'overflow-hidden');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    // 3. 【最重要】Bootstrapの古いインスタンスを破棄（無限ループの元を断つ）
    document.querySelectorAll('.modal, .offcanvas').forEach(el => {
        const modal = bootstrap.Modal.getInstance(el);
        if (modal) modal.dispose();
        const offcanvas = bootstrap.Offcanvas.getInstance(el);
        if (offcanvas) offcanvas.dispose();
    });
}

function cleanUpModalBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
        backdrop.remove();
    });
    // 💡 削除: bodyからクラスとスタイルを削除するロジックはBootstrapに任せる
}

// --- D. モーダル/オフキャンバイベントハンドラ (手動制御) ---

// 検索モーダルを手動で開く
function openSearchModal(e) {
    e.preventDefault();
    completelyResetBootstrap(); // 開く前に掃除
    const el = document.getElementById('searchModal');
    const modal = new bootstrap.Modal(el);
    modal.show();
}

// オフキャンバスを手動で開く（モーダルとの競合を避ける）
function openHintOffcanvas(e) {
    e.preventDefault();
    // 💡 幕のゴミだけ消す（モーダルの幕は消さないようにする）
    document.querySelectorAll('.offcanvas-backdrop').forEach(b => b.remove());
    const el = document.getElementById('externalModalHint');
    // 💡 focus: false オプションをJSで強制適用
    const offcanvas = new bootstrap.Offcanvas(el, { focus: false });
    offcanvas.show();
}

function getActiveInput() {
    const activeElement = $(`#search-input-container input:visible, #search-input-container textarea:visible`)[0];
    return activeElement;
}
function updateSearchInputName() {
    const searchInput = getActiveInput();
    if (!searchTypeSelect || !searchInput) return;
    const baseName = searchInput.dataset.ransackBase;
    const selectedType = searchTypeSelect.value;
    const newName = `q[${baseName}_${selectedType}]`;
    searchInput.setAttribute('name', newName);
}

// --- C. AI検証/トグル関連関数 ---

function toggleSearchInput(isAiCheckOn) {
    const normalInput = document.getElementById('search-input-field');
    const aiTextarea = document.getElementById('search-input-textarea');
    const currentActive = isAiCheckOn ? aiTextarea : normalInput;
    const currentInactive = isAiCheckOn ? normalInput : aiTextarea;
    const searchTypeContainer = document.getElementById('search-type-container');
    const aiCheckLabel = document.getElementById('ai-check-label');

    if (searchTypeContainer && searchTypeSelect) {
        if (isAiCheckOn) {
            searchTypeContainer.classList.add('d-none');
            searchTypeSelect.value = 'cont';
        } else {
            searchTypeContainer.classList.remove('d-none');
        }
    }

    if (currentActive) {
        currentActive.parentNode.style.display = 'block';
        const baseName = currentActive.dataset.ransackBase;
        const selectedType = isAiCheckOn ? 'cont' : searchTypeSelect.value;
        const newName = `q[${baseName}_${selectedType}]`;
        currentActive.setAttribute('name', newName);
    }
    if (currentInactive) {
        currentInactive.removeAttribute('name');
        currentInactive.parentNode.style.display = 'none';
    }
    if (aiCheckLabel) aiCheckLabel.textContent = isAiCheckOn ? 'ON' : 'OFF';
    console.log("Toggle AI Check:", isAiCheckOn ? 'ON' : 'OFF');
}

function handleAiCheckChange() {
    const hiddenField = document.getElementById('use-ai-hidden-field');
    const normalInput = document.getElementById('search-input-field');
    const aiTextarea = document.getElementById('search-input-textarea');
    const isChecked = toggleButton.checked;
    hiddenField.value = isChecked ? '1' : '';
    toggleSearchInput(isChecked);
    if (isChecked) {
        aiTextarea.value = normalInput.value;
    } else {
        normalInput.value = aiTextarea.value;
    }
}

// --- D. モーダルイベントハンドラ (名前付き関数) ---

function onSearchModalShow() {
    cleanUpModalBackdrops();
    const isCurrentAiCheckOn = toggleButton.checked;
    toggleSearchInput(isCurrentAiCheckOn);
    if (tagTab) {
        const isTagSearch = tagTab.classList.contains('active');
        controlSearchParameters(isTagSearch);
    }
}

function onExternalModalShow(event) {
    cleanUpModalBackdrops();
    const iframeElement = document.getElementById('embeddedIframe');
    const modalTitleElement = document.getElementById('externalModalLabel');
    const openInNewTabLink = document.getElementById('openInNewTab');
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
        iframeElement.src = 'about:blank';
        openInNewTabLink.classList.add('d-none');
    }
    if (modalTitleElement) modalTitleElement.textContent = title || '参考記事';
}
function onExternalModalHidden() {
    const iframeElement = document.getElementById('embeddedIframe');
    const modalTitleElement = document.getElementById('externalModalLabel');
    if (iframeElement) iframeElement.src = '';
    if (modalTitleElement) modalTitleElement.textContent = '参考記事';
}

// --- E. タグ/タブ/クリア関連イベントハンドラ ---

function onKeywordTabShown() {
    controlSearchParameters(false);
}
function onTagTabShown() {
    controlSearchParameters(true);
}
function handleTagRemoveClick(e) {
    e.preventDefault();
    const tag = e.currentTarget.parentNode.dataset.tag;
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    controlSearchParameters(true);
}
function handleClearSearchClick() {
    const hiddenField = document.getElementById('use-ai-hidden-field');
    const normalInput = document.getElementById('search-input-field');
    const aiTextarea = document.getElementById('search-input-textarea');
    searchTypeSelect.value = 'cont';
    toggleButton.checked = false;
    if (hiddenField) hiddenField.value = '';
    if (normalInput) normalInput.value = '';
    if (aiTextarea) aiTextarea.value = '';
    toggleSearchInput(false);
    selectedTags = [];
    renderSelectedTags();
    if (tagInput) tagInput.value = '';
    if (searchForm) $(searchForm).find('input[name^="q["]').val('');
}
function handleTagInputFocus() {
    const query = tagInput.value.trim();
    if (query.length === 0) {
        fetchTagsAndRender('');
    }
}
function handleTagInputDebounced(func) {
    const tagSuggestionsContainer = document.getElementById('tag-suggestions');
    const query = tagInput.value.trim();
    if (query.length < 2) {
        if(tagSuggestionsContainer) tagSuggestionsContainer.innerHTML = '';
        return;
    }
    fetchTagsAndRender(query);
}
function handleSuggestionClick(e) {
    e.preventDefault();
    const tag = e.currentTarget.textContent;
    const tagSuggestionsContainer = document.getElementById('tag-suggestions');
    
    if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
        renderSelectedTags();
        if(tagInput) tagInput.value = '';
        if(tagSuggestionsContainer) tagSuggestionsContainer.innerHTML = '';
    }
}

// --- F. AJAX/FETCH関連ハンドラ ---

function handleFetchSuccess(response) {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}
function handleFetchRender(tags) {
    renderSuggestions(tags);
}
function handleFetchError(error) {
    const tagSuggestionsContainer = document.getElementById('tag-suggestions');
    console.error('Error in tag suggestion pipeline:', error); 
    if(tagSuggestionsContainer) tagSuggestionsContainer.innerHTML = '';
}
function fetchTagsAndRender(query) {
    fetch(`/tags/suggestions?q=${encodeURIComponent(query)}`)
        .then(handleFetchSuccess)
        .then(handleFetchRender)
        .catch(handleFetchError);
}

window.checkAiSearchResultStatus = function() {
    const container = document.getElementById('ai-search-results');
    if (!container || !container.querySelector('.ai-loading-message')) return;

    // 💡 検索ワードではなく、HTMLに埋め込まれた「開始時のID」を取得
    const sessionId = container.dataset.identifier;

    // session_id をパラメータとして送る
    fetch(`/articles/ai_search_status?session_id=${sessionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'completed') {
                container.innerHTML = data.html_content;
            }
        });
};

function handleVisibilityChange() {
    // タブが「隠れた状態」から「表示された状態」に変わったとき
    if (document.visibilityState === 'visible') {
        console.log("Tab became active. Checking AI status...");
        checkAiSearchResultStatus();
    }
}

// --- AI検索タイマー変数 ---
let aiSearchTimerInterval = null;
let secondsElapsed = 0;

function startAiSearchTimer() {
    const timerElement = document.getElementById('ai-timer');
    const progressBar = document.getElementById('ai-progress-bar');
    const statusText = document.getElementById('ai-status-announcement');
    const subText = document.getElementById('loading-sub-text');

    if (!timerElement) return;

    // タイマーリセット
    secondsElapsed = 0;
    if (aiSearchTimerInterval) clearInterval(aiSearchTimerInterval);

    aiSearchTimerInterval = setInterval(() => {
        secondsElapsed++;
        timerElement.textContent = secondsElapsed;

        // プログレスバーの疑似進捗 (30秒で100%に近づけるが、止まらないように調整)
        let progress = Math.min((secondsElapsed / 30) * 100, 95);
        if (progressBar) progressBar.style.width = `${progress}%`;

        // 経過時間に応じた文言の切り替え
        if (secondsElapsed >= 40) {
            if (statusText) statusText.innerHTML = "通常より時間がかかっています。<br>もうしばらくお待ちください...";
            if (subText) subText.classList.add('text-danger');
        } else if (secondsElapsed >= 20) {
            if (statusText) statusText.textContent = "回答を生成しています...";
        } else if (secondsElapsed >= 10) {
            if (statusText) statusText.textContent = "情報を解析中...";
        }
    }, 1000);
}

// 既存のステータスチェック関数を拡張
const originalCheckStatus = window.checkAiSearchResultStatus;
window.checkAiSearchResultStatus = function() {
    // コンテナが存在し、かつローディング中ならタイマー開始（初回のみ）
    const container = document.getElementById('ai-search-results');
    if (container && container.querySelector('.ai-loading-message') && !aiSearchTimerInterval) {
        startAiSearchTimer();
    }

    // 元のfetch処理
    const sessionId = container?.dataset.identifier;
    if (!sessionId) return;

    fetch(`/articles/ai_search_status?session_id=${sessionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'completed') {
                // 完了したらタイマー停止
                clearInterval(aiSearchTimerInterval);
                aiSearchTimerInterval = null;
                container.innerHTML = data.html_content;
            }
        });
};

// --- G. デバウンスとJQueryイベントハンドラ ---

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}
function handleAjaxComplete() {
    isFetchingArticles = false;
    if ($loadingSpinner) {
        $loadingSpinner.hide();
    }
}


// --- H. イベントリスナー解除関数 (完成版) ---

function removeEventListeners() {
    // 1. スクロールイベントの解除 (jQuery)
    $(window).off('scroll', checkScroll);
    // 2. jQuery document イベントの解除 (名前付き関数を使用)
    $(document).off('ajax:complete', handleAjaxComplete); 
    // 3. DOM要素のイベントリスナーの解除
    if (searchTypeSelect) {
        searchTypeSelect.removeEventListener('change', updateSearchInputName);
    }
    if (toggleButton) {
        toggleButton.removeEventListener('change', handleAiCheckChange);
    }
    if (searchModal) {
        searchModal.removeEventListener('show.bs.modal', onSearchModalShow);
    }
    if (externalModal) {
        externalModal.removeEventListener('show.bs.modal', onExternalModalShow);
        externalModal.removeEventListener('hidden.bs.modal', onExternalModalHidden);
    }
    if (keywordTab) {
        keywordTab.removeEventListener('shown.bs.tab', onKeywordTabShown);
    }
    if (tagTab) {
        tagTab.removeEventListener('shown.bs.tab', onTagTabShown);
    }
    const clearButton = document.getElementById('clear-search-link');
    if (clearButton) {
        clearButton.removeEventListener('click', handleClearSearchClick);
    }
    if (tagInput) {
        tagInput.removeEventListener('focus', handleTagInputFocus);
        tagInput.removeEventListener('input', handleTagInputDebounced);
    }
}

// --- I. Ransack/タグ検索ヘルパー関数 (既存を維持) ---

function renderSuggestions(tags) {
    const tagSuggestionsContainer = document.getElementById('tag-suggestions');
    if (!tagSuggestionsContainer) return;
    tagSuggestionsContainer.innerHTML = '';
    if (tags.length === 0) {
        tagSuggestionsContainer.innerHTML = '<div class="list-group-item text-muted">候補がありません</div>';
        return;
    }
    tags.forEach(tag => {
        if (selectedTags.includes(tag)) return;
        const suggestion = document.createElement('button');
        suggestion.className = 'list-group-item list-group-item-action';
        suggestion.textContent = tag;
        suggestion.addEventListener('click', handleSuggestionClick);
        tagSuggestionsContainer.appendChild(suggestion);
    });
}
function controlSearchParameters(isTagSearchActive) {
    const currentKeywordInput = getActiveInput();
    const selectedTagsHidden = document.getElementById('selected-tags-hidden');
    if (currentKeywordInput) {
        if (isTagSearchActive) {
            currentKeywordInput.removeAttribute('name');
        } else {
            updateSearchInputName();
        }
    }
    if (selectedTagsHidden) {
        if (isTagSearchActive) {
            selectedTagsHidden.setAttribute('name', 'q[tag_in]');
        } else {
            selectedTagsHidden.removeAttribute('name');
        }
    }
    if (tagInput) {
        if (isTagSearchActive) {
            tagInput.removeAttribute('name');
        }
    }
}
function renderSelectedTags() {
    const selectedTagsDisplay = document.getElementById('selected-tags-display');
    const selectedTagsHidden = document.getElementById('selected-tags-hidden');
    if (!selectedTagsDisplay || !selectedTagsHidden) return;
    selectedTagsDisplay.innerHTML = '';
    selectedTagsHidden.value = selectedTags.join(',');
    selectedTags.forEach(tag => {
        const tagChip = document.createElement('span');
        tagChip.className = 'badge bg-primary text-light tag-chip me-2 p-2';
        tagChip.innerHTML = `${tag} <span class="tag-remove" style="cursor: pointer; margin-left: 5px;">&times;</span>`;
        tagChip.dataset.tag = tag;
        tagChip.querySelector('.tag-remove').addEventListener('click', handleTagRemoveClick);
        selectedTagsDisplay.appendChild(tagChip);
    });
}


// --- J. メイン実行ブロック（Turbolinks:load） ---

document.addEventListener('turbolinks:load', function() {
    completelyResetBootstrap();
    // 💡 Turbolinksによるページ遷移で、古いイベントリスナーが残るのを防ぐ
    removeEventListeners();
    // --- 1. 変数の再取得 (ファイルスコープ変数に代入) ---
    $loadingSpinner = $('#loading-spinner');
    searchTypeSelect = document.getElementById('search_type');
    toggleButton = document.getElementById('ai-check-toggle');
    searchModal = document.getElementById('searchModal');
    externalModal = document.getElementById('externalModal');
    tagInput = document.getElementById('tag-search-input');
    selectedTagsHidden = document.getElementById('selected-tags-hidden');
    selectedTagsDisplay = document.getElementById('selected-tags-display');
    searchForm = searchModal ? searchModal.querySelector('form') : null;
    keywordTab = document.getElementById('keyword-tab');
    tagTab = document.getElementById('tag-tab');
    const hintBtn = document.querySelector('[data-bs-target="#externalModalHint"]');
    const hiddenField = document.getElementById('use-ai-hidden-field');
    const normalSearchField = document.getElementById('search-input-field');
    const aiSearchTextarea = document.getElementById('search-input-textarea');
    const clearButton = document.getElementById('clear-search-link');
    // ページロード時の初期タグ値を再取得
    selectedTags = selectedTagsHidden && selectedTagsHidden.value ? selectedTagsHidden.value.split(',').filter(t => t.trim() !== '') : [];
    if (!document.body) {
        return;
    }
    // --- 2. イベントリスナー登録 (名前付き関数を使用) ---
    // Ransack検索タイプの切り替え
    if (searchTypeSelect) {
        searchTypeSelect.addEventListener('change', updateSearchInputName);
    }
    // AI検証トグルボタン
    if (toggleButton && hiddenField && normalSearchField && aiSearchTextarea) {
        const isInitialAiCheckOn = hiddenField.value === '1';
        toggleButton.checked = isInitialAiCheckOn;
        toggleSearchInput(isInitialAiCheckOn);
        toggleButton.addEventListener('change', handleAiCheckChange);
    }
    // モーダルイベント
    if (searchModal) {
        searchModal.addEventListener('show.bs.modal', onSearchModalShow);
    }
    // オフキャンバスを開くボタン
    if (hintBtn) {
        hintBtn.removeAttribute('data-bs-toggle'); // 自動起動を殺す
        hintBtn.addEventListener('click', openHintOffcanvas);
    }
    if (externalModal) {
        externalModal.addEventListener('show.bs.modal', onExternalModalShow);
        externalModal.addEventListener('hidden.bs.modal', onExternalModalHidden);
    }
    // スクロールとAJAXイベント (無限スクロール)
    if ($(window).length > 0) {
        $(window).off('scroll', checkScroll).on('scroll', checkScroll);
    }
    $(document).off('ajax:complete', handleAjaxComplete).on('ajax:complete', handleAjaxComplete);

    // 検索クリアボタン
    if (clearButton) {
        clearButton.addEventListener('click', handleClearSearchClick);
    }

    // タブ切り替え
    if (keywordTab && tagTab) {
        keywordTab.addEventListener('shown.bs.tab', onKeywordTabShown);
        tagTab.addEventListener('shown.bs.tab', onTagTabShown);
        // searchModalのshowイベント内のタブ切り替え初期設定ロジックは、onSearchModalShow内に移動済み
    }
    // タグ検索ロジック
    if (tagInput) {
        renderSelectedTags();
        tagInput.addEventListener('focus', handleTagInputFocus);
        tagInput.addEventListener('input', handleTagInputDebounced);
    }

    // --- 3. タブ復帰時の AI ステータスチェック ---
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 初回読み込み時も実行
    checkAiSearchResultStatus();
});

// 💡 ページキャッシュ前にイベントを解除するためのリスナー
document.addEventListener('turbolinks:before-cache', removeEventListeners);