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
    prompt = "ユーザーの検索キーワード: #{search_term}\n\n"
    prompt += "【内部データ（Ransack結果）】: #{internal_info_json.to_s}\n"
    prompt += "【外部ソース（AI検索結果）】: #{external_results_json.to_s}\n\n"
    prompt += "これらの内部データと外部ソース（信頼性の高い情報源から収集）を比較し、検索内容の信憑性を分析してください。\n\n"
    prompt += "### 【判定基準】\n"
    prompt += "**1. Credibility Score (1-5) の基準:**\n"
    prompt += "このスコアは、検索キーワードの内容が「真実である」と判断できる信憑性の高さを表します。\n"
    prompt += "※この判定基準は、日本の主要なファクトチェック機関の基準を参考にしたものです。\n\n"
    prompt += "| スコア | 定義 | 偽情報である可能性 | 真実である可能性 |\n"
    prompt += "| :--- | :--- | :--- | :--- |\n"
    prompt += "| **5** | **正確** | 非常に低い（0-10%） | 非常に高い（90-100%） | 信頼できる情報源の**全て**が、検索内容の**真実性**を一貫して強く支持しており、**誤りが無く重要な要素が欠けていない**。|\n"
    prompt += "| **4** | **ほぼ正確** | 低い（11-30%） | 高い（70-89%） | 信頼できる情報源の**大半**が**真実性**を支持し、**重要な部分を含む大部分は正しい**が、一部に**軽微な誤り**の示唆がある程度。|\n"
    prompt += "| **3** | **真偽不明** | 中程度（31-70%） | 中程度（30-69%） | **根拠がないか不十分**であり事実の検証ができない。または、真偽について**意見が分かれている**（情報源が矛盾している）。|\n"
    prompt += "| **2** | **不正確** | 高い（71-89%） | 低い（11-30%） | **一部は正しい**が、信頼できる情報源が**重要な部分に誤りや欠落**があると複数指摘している、または**ミスリード**の可能性が高い。|\n"
    prompt += "| **1** | **誤り** | 非常に高い（90-100%） | 非常に低い（0-10%） | 信頼できる情報源の**全て**が、検索内容を**誤りである**、または**重要な要素が大きく欠けている**と一貫して強く指摘している。|\n\n"
    prompt += "**2. verdict の判定基準:**\n"
    prompt += "* **'true'**: `Credibility Score` が **4または5** であり、かつ**信頼できる情報源の大多数**が検索内容を**真実**と示している場合。\n"
    prompt += "* **'misinformation'**: `Credibility Score` が **1または2** であり、かつ**信頼できるファクトチェック記事や公的情報**が検索内容を**偽・誤情報**と強く示している場合。\n"
    prompt += "* **'unverified'**: `Credibility Score` が **3** であり、次のいずれかの条件を満たす場合：\n"
    prompt += "    * 情報源の**数が極端に少ない**（例：信頼できる情報源が合計1件以下）。\n"
    prompt += "    * **信頼できる情報源の間で**検索内容の**真偽について激しく矛盾**している（ある情報では正しい、ある情報ではデマ）。\n\n"
    prompt += "### 【出力形式】\n"
    prompt += "以下のJSON形式で、`credibility_score`(1-5の整数)、`verdict`('true'/'misinformation'/'unverified')、`reason`を返してください。JSON形式以外のテキスト、説明、Markdown記法（例：```json）は**一切含めないでください**。\n\n"
    prompt += "{{\"credibility_score\": 1-5の整数, \"verdict\": \"true/misinformation/unverifiedのいずれか\", \"reason\": \"判定に至った具体的な根拠と情報源の比較結果の要約\"}}"
    return prompt
  end

  # Gemini API呼び出しロジック（Fact Check Job専用）
  def call_gemini_api_for_judgment(prompt)
    if Rails.env.production? || ENV['RAILS_ENV'] == 'production'
      # Heroku (production) 環境の場合: PATH にある 'python3' を使用
      python_executable = 'python3'
    else
      # ローカル環境 (development/test) の場合: ローカル仮想環境のパスを使用
      python_executable = Rails.root.join('venv_gemini', 'bin', 'python3').to_s
    end
    
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