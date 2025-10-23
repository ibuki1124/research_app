# app/services/gemini_service.rb

require 'google/genai'

class GeminiService
  # クライアントの初期化（シングルトンパターンとしてアプリケーション起動時に一度だけ行う）
  def self.client
    @client ||= Google::Genai::Client.new(
      credentials: {
        service: 'generative-language-api',
        api_key: ENV.fetch('GEMINI_API_KEY')
      }
    )
  end

  # インターネットから関連記事を検索し、その要約を返すメソッド
  def self.search_related_articles(search_term)
    # プロンプトの定義
    prompt_text = <<~PROMPT
      あなたは、SNS上の偽・誤情報のファクトチェックに必要な信頼できる情報源を収集する専門家です。
      以下の検索キーワード「#{search_term}」について、インターネット上で情報を検索してください。

      検索の際、特に以下の条件を満たす記事や情報を優先して収集してください。
      1.  **信頼性の高い情報源**: 公的機関の発表、主要な報道機関、大学や研究機関、または特定の分野の専門家が発信する記事。
      2.  **検証や解説を含む記事**: 単なるニュースの速報ではなく、情報の真偽や科学的根拠について検証・解説している記事。

      ## 出力形式

      収集した情報源の「記事タイトル」と「URL」を、信頼性が高い順に最大5件まで、以下の厳密な形式でリストアップしてください。
      それ以外のテキストは一切含めないでください。

      例:
      - [記事タイトル1] - [URL1]
      - [記事タイトル2] - [URL2]
      - [記事タイトル3] - [URL3]
    PROMPT

    response = client.models.generate_content(
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{text: prompt_text}] }]
    )
    response.text
    
  rescue => e
    Rails.logger.error "Gemini API Error: #{e.class} #{e.message}\n#{e.backtrace.join("\n")}"
    "AI検索でエラーが発生しました。（エラーコード：#{e.class}）"
  end
end