# app/controllers/articles_controller.rb

class ArticlesController < ApplicationController
  def index
    # Ransackに渡す検索クエリを初期化
    if params[:q].present?
      @search_term = params[:q].values.find(&:present?)
    else
      @search_term = nil
    end

    @q = Article.ransack(params[:q])
    @articles = @q.result(distinct: true)

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