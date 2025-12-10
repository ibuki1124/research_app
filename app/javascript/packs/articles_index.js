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

// --- B. モーダル・UIヘルパー関数 ---

function cleanUpModalBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
        backdrop.remove();
    });
    // 💡 削除: bodyからクラスとスタイルを削除するロジックはBootstrapに任せる
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
});

// 💡 ページキャッシュ前にイベントを解除するためのリスナー
document.addEventListener('turbolinks:before-cache', removeEventListeners);