# app/jobs/ai_search_job.rb
class AiSearchJob < ApplicationJob
  queue_as :default

  # search_term: 検索キーワード, identifier: session.id (結果を返す接続の識別子)
  def perform(search_term, internal_info_json, identifier)
    Rails.logger.info "AI Search Job (Phase 1: External Search) started for term: #{search_term}"

    # 1. 外部APIの呼び出しを実行
    external_results = GeminiService.search_related_articles(search_term)
    
    # 2. 結果のレンダリングと通知
    if external_results[:error].present?
      Rails.logger.error "AI Search Error: #{external_results[:error]}"
    else
      FactCheckJob.perform_later(
        search_term,
        internal_info_json,
        external_results[:articles].to_json, # 外部検索結果のJSON
        identifier                          # Action Cable識別子
      )
      Rails.logger.info "AI Search Job (Phase 1) completed and FactCheckJob enqueued."
    end
  rescue => e
    Rails.logger.error "AI Search Job failed unexpectedly: #{e.message}"
  end
end