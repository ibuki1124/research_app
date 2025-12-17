Rails.application.routes.draw do
  root 'articles#index'
  resources :articles, only: [:index] do
    collection do
      get :ai_search_status
    end
  end
  # タグ検索候補用
  get 'tags/suggestions', to: 'articles#tag_suggestions'
end
