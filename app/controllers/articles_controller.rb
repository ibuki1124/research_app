# app/controllers/articles_controller.rb

class ArticlesController < ApplicationController
  def index
    # ----------------------------------------------------
    # 1. Ransackオブジェクトの初期化とクリーンアップ
    # ----------------------------------------------------
    @q = Article.ransack(params[:q])
    # Ransackが自動生成した tag_in のクエリを削除する
    if params[:q] && params[:q][:tag_in].present?
      ransack_params_without_tags = params[:q].except(:tag_in)
      @q = Article.ransack(ransack_params_without_tags)
    end
    # Ransackの結果をベースとして保持
    articles_scope = @q.result(distinct: true)
    # ----------------------------------------------------
    # 2. タグ検索のフィルタリング処理 (カスタムSQL適用)
    # ----------------------------------------------------
    if params[:q] && params[:q][:tag_in].present?
      selected_tags = params[:q][:tag_in].to_s.split(',').map(&:strip).reject(&:blank?)
      if selected_tags.present?
        # OR条件のSQLを構築し、Ransackの結果に適用する
        query_conditions = selected_tags.map do |tag|
          "articles.tag LIKE '%#{Article.sanitize_sql_like(tag)}%'"
        end.join(' OR ')
        # カスタムSQLの絞り込みを適用
        articles_scope = articles_scope.where(query_conditions)
      end
    end
    # ----------------------------------------------------
    # 3. ページネーションの適用
    # ----------------------------------------------------
    @articles = articles_scope.page(params[:page]).per(30)
    # ----------------------------------------------------
    # 4. 検索キーワードの取得とAI検索ロジック
    # ----------------------------------------------------
    if params[:q].present?
      search_param_key = params[:q].keys.find { |k| k.include?('article_title_or_lead_text') }
      @search_term = params[:q][search_param_key] if search_param_key
    else
      @search_term = nil
    end

    @use_ai = params[:use_ai_check].present?

    # 【AI検索機能の追加】
    if @search_term.present? && @use_ai && (params[:page].blank? || params[:page] == '1')
      @ai_search_id = SecureRandom.uuid

      internal_info_for_ai = @articles.map do |article|
        { id: article.id, title: article.article_title, lead: article.lead_text }
      end.to_json

      AiSearchJob.perform_later(
        @search_term,
        internal_info_for_ai,
        @ai_search_id
      )
    end
    @ai_articles = []
    respond_to do |format|
      format.html
      format.js
    end
  end

  def ai_search_status
    # データベースから検索
    result = AiSearchResult.find_by(session_id: params[:session_id])
    if result
      render json: { status: 'completed', html_content: result.html_content }
      result.destroy
    else
      render json: { status: 'processing' }
    end
  end

  # タグ候補を返すアクション
  def tag_suggestions
    query = params[:q].to_s.strip.downcase
    if query.present?
      # クエリがある場合: 絞り込み検索 (50件に制限)
      tags_data = Article.where('tag LIKE ?', "%#{query}%").limit(50).pluck(:tag)
    else
      # 💡 修正: クエリがない場合 (フォーカス時): 全てのタグを取得するために LIMIT を削除
      tags_data = Article.where.not(tag: [nil, '']).pluck(:tag)
    end
    
    # [2] カンマ区切りを解析し、ユニークなタグを抽出
    tags = tags_data.flat_map { |t| t.to_s.split(',') } # カンマ区切りを配列に展開
                    .map(&:strip) 
                    .map(&:downcase) # 小文字化してユニーク処理を確実にする
                    .reject(&:empty?) # 空白タグを除去
                    .uniq
    # 最終的な表示タグの決定
    final_tags = if query.present?
      # クエリがある場合は、絞り込み
      tags.select { |t| t.include?(query) }
    else
      # クエリがない場合は、すべてのタグ（ユニーク化済）
      tags
    end
    # JSON配列としてクライアントに返却 (大文字・空白を元に戻す処理はクライアント側で行う前提)
    render json: final_tags
  end
end