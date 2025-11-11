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
    # 検索キーワードが存在する場合のみ、ジョブを非同期で実行
    if @search_term.present?
      AiSearchJob.perform_later(@search_term, session.id.to_s)
    end
    @ai_articles = []
    # ----------------------------------------------------
  end
  
  def show
    @article = Article.find(params[:id])
  end
end