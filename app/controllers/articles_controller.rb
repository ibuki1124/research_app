# app/controllers/articles_controller.rb

class ArticlesController < ApplicationController
  def index
    @q = Article.ransack(params[:q])
    @articles = @q.result(distinct: true)
    # Ransackのハッシュから、ユーザーが入力したキーワードを確実に取得する
    # キー名は動的に変わるが、`article_title_or_lead_text` を含む値を取得する
    if params[:q].present?
      search_param_key = params[:q].keys.find { |k| k.include?('article_title_or_lead_text') }
      @search_term = params[:q][search_param_key] if search_param_key
    else
      @search_term = nil
    end

    # ----------------------------------------------------
    # 【AI検索機能の追加】
    # 検索キーワードが存在する場合のみ、GeminiServiceを呼び出す
    if @search_term.present?
      result = GeminiService.search_related_articles(@search_term)
      @ai_articles = result[:articles]
      @ai_error = result[:error]
    end
    # ----------------------------------------------------
  end
  
  def show
    @article = Article.find(params[:id])
  end
end