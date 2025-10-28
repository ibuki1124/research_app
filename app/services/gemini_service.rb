# app/services/gemini_service.rb

# 🚨 Pythonとの連携にはOpen3ライブラリを使用
require 'open3'

class GeminiService
  # クライアント初期化のメソッドは不要になるため削除（Python側で処理）

  def self.search_related_articles(search_term)
    # 1. 必要な情報の準備
    python_executable = Rails.root.join('venv_gemini', 'bin', 'python3').to_s
    python_script = Rails.root.join('lib', 'python', 'gemini_search.py').to_s
    # 環境変数からAPIキーを取得
    gemini_api_key = ENV.fetch('GEMINI_API_KEY')
    
    # Pythonの実行コマンドを構築
    command = [python_executable, python_script, search_term, gemini_api_key]

    Rails.logger.info "Executing Python script with command: #{command.inspect}"

    # 2. Pythonスクリプトの実行
    # Open3.capture3で標準出力、標準エラー、終了ステータスを同時にキャプチャ
    stdout, stderr, status = Open3.capture3(*command)

    if status.success?
      # 3. 成功した場合: Pythonの標準出力（記事リスト）を返す
      # 🚨 Ruby側で受け取ったデータをそのまま返す
      return stdout.strip
    else
      # 4. 失敗した場合: 標準エラーの内容をログに出力し、エラーメッセージを返す
      Rails.logger.error "Python Gemini API Error (Exit Code #{status.exitstatus}): #{stderr}"
      return "AI検索でエラーが発生しました。（Python実行エラー）"
    end
  end
end