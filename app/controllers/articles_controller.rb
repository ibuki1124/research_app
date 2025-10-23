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
      # バックグラウンド処理（推奨）
      # API呼び出しは時間がかかる可能性があるため、
      # 実際にはSidekiqなどで非同期処理にすることを推奨しますが、
      # まずは動作確認のため同期的に実行します。
      @ai_articles_summary = GeminiService.search_related_articles(@search_term)
    end
    # ----------------------------------------------------

    # クッキーに検索条件を保存
    if params[:q].present?
      cookies[:recent_search_history] = {
        value: params[:q].to_json,
        expires: 1.minutes.from_now
      }
    end
  end
  def show
    @article = Article.find(params[:id])
  end
end