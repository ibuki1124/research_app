# app/jobs/ai_search_job.rb
class AiSearchJob < ApplicationJob
  queue_as :default

  # search_term: 検索キーワード, identifier: session.id (結果を返す接続の識別子)
  def perform(search_term, identifier)
    Rails.logger.info "AI Search Job started for term: #{search_term}"

    # 1. 外部APIの呼び出しを実行
    result = GeminiService.search_related_articles(search_term)
    
    # 2. 結果のレンダリングと通知
    if result[:error].present?
      # 成功時のみHTMLを送信
      Rails.logger.error "AI Search Error: #{result[:error]}"
    else
      # ⚠️ Viewヘルパーを使うために ApplicationController.render を使用
      html_output = ApplicationController.render(
          partial: 'articles/ai_results', 
          locals: { ai_articles: result[:articles], search_term: search_term }
      )
      
      # Action Cableでフロントエンドにブロードキャスト
      ActionCable.server.broadcast("ai_search_#{identifier}", { 
        html: html_output
      })
    end
  rescue => e
    Rails.logger.error "AI Search Job failed unexpectedly: #{e.message}"
  end
end