# app/jobs/fact_check_job.rb

require 'open3'
require 'json' 
require 'shellwords'

class FactCheckJob < ApplicationJob
  queue_as :default

  # AiSearchJob から渡された引数を受け取る
  def perform(search_term, internal_info_json, external_results_json, identifier)
    Rails.logger.info "Fact Check Job (Phase 2: Judgment) started."

    # 1. 判定用プロンプトの構築
    judgment_prompt = build_judgment_prompt(search_term, internal_info_json, external_results_json)

    # 2. Gemini APIへの第2リクエスト（判定専用）を実行
    judgment_result_json = call_gemini_api_for_judgment(judgment_prompt)
    clean_judgment_json = judgment_result_json.to_s.sub(/^```json\s*/, '').sub(/\s*```$/, '')
    
    # 3. 最終的な結果のレンダリング
    begin
      judgment_data = JSON.parse(clean_judgment_json)
    rescue JSON::ParserError => e
      Rails.logger.error "JSON Parsing Error in FactCheckJob: #{e.message} - Raw data: #{clean_judgment_json}"
      return 
    end
    
    # 外部記事がない場合に備えて空配列を設定
    external_articles = external_results_json.blank? ? [] : JSON.parse(external_results_json)

    final_html = ApplicationController.render(
      partial: 'articles/ai_judgment_results', 
      locals: { 
        judgment_data: judgment_data,
        external_articles: external_articles
      }
    )

    # 4. Action Cableで最終結果をブラウザに通知
    ActionCable.server.broadcast("ai_search_#{identifier}", {
      html: final_html, # フロントエンドが画面を置き換える
      search_term: search_term
    })

    Rails.logger.info "Fact Check Job completed and results broadcasted."
  rescue => e
    Rails.logger.error "Fact Check Job failed: #{e.message}"
  end
  
  private

  # 判定専用のプロンプトを生成するメソッド
  def build_judgment_prompt(search_term, internal_info_json, external_results_json)
    prompt = "ユーザーの検索キーワード: #{search_term}。\n\n"
    prompt += "【内部データ（Ransack結果）】: #{internal_info_json.to_s}\n"
    prompt += "【外部ソース（AI検索結果）】: #{external_results_json.to_s}\n\n"
    prompt += "これらの情報を比較し、検索内容の信憑性を分析してください。\n"
    prompt += "【判定ルール】情報源の数が極端に少ない、または互いに矛盾する情報しかない場合、'unverified' を選択してください。\n"
    prompt += "JSON形式で、misinformation_score(0-100)、verdict('true'/'misinformation'/'unverified')、reasonを返してください。"
    return prompt
  end

  # Gemini API呼び出しロジック（Fact Check Job専用）
  def call_gemini_api_for_judgment(prompt)
    python_executable = Rails.root.join('venv_gemini', 'bin', 'python3').to_s
    
    # 判定専用スクリプトのパス
    python_judgment_script = Rails.root.join('lib', 'python', 'gemini_judgment.py').to_s
    # 環境変数が設定されていない場合に備え、fetchでエラーを発生させる
    gemini_api_key = ENV.fetch('GEMINI_API_KEY')
    command = [python_executable, python_judgment_script, prompt, gemini_api_key]
    
    Rails.logger.info "Executing Judgment command..."

    stdout, stderr, status = Open3.capture3(*command)

    if status.success?
      # Pythonスクリプトの標準出力（JSON）を返す
      raw_output = stdout.to_s.strip
      Rails.logger.info "Judgment Python Raw Output: #{raw_output}"
      return raw_output
    else
      # Python実行エラー時の処理
      Rails.logger.error "Judgment Python Script Error: #{stderr}"
      # 失敗時はエラーJSONを返す
      return '{"misinformation_score": 0, "verdict": "unverified", "reason": "判定プロセス(Python)でエラーが発生しました"}'
    end
  end
end