require 'open3'
require 'json' 
require 'cgi' 

class GeminiService
  
  private
  def self.resolve_single_url(url)
    # 外部Pythonスクリプトでリダイレクトを追跡し、安定URLを取得
    python_executable = Rails.root.join('venv_gemini', 'bin', 'python3.9').to_s
    python_resolver = Rails.root.join('lib', 'python', 'resolve_url.py').to_s
    
    stdout, stderr, status = Open3.capture3(python_executable, python_resolver, url)
    
    if status.success? && stdout.present?
      return stdout.strip
    else
      # 失敗時は元のURLをフォールバックとして使用
      Rails.logger.error "URL Resolver Failed for #{url}: #{stderr}"
      return url 
    end
  end
  
  public
  def self.search_related_articles(search_term)
    
    # Pythonスクリプトの実行コマンドを構築
    python_executable = Rails.root.join('venv_gemini', 'bin', 'python3.9').to_s
    python_gemini = Rails.root.join('lib', 'python', 'gemini_search.py').to_s
    gemini_api_key = ENV.fetch('GEMINI_API_KEY')
    
    command = [python_executable, python_gemini, search_term, gemini_api_key]
    
    Rails.logger.info "Executing command: #{command.join(' ')}"
    stdout, stderr, status = Open3.capture3(*command)

    if status.success?
      # stdoutがnilの場合に備えて to_s.strip を使用 (以前の修正を反映)
      raw_json = stdout.to_s.strip 
      Rails.logger.info "Python Raw Output (for JSON): #{raw_json}"
      
      # 1. JSONクリーンアップ: モデルが追加するMarkdown記法を削除
      clean_json = raw_json.sub(/^```json\s*/, '').sub(/\s*```$/, '')
      
      articles = []
      
      # 🚨 JSONパースエラー回避のための防御的パースロジック 🚨
      # JSONの配列要素を抽出し、不正な要素をスキップする
      
      # {"title": "...", "url": "..."} 形式のブロックを抽出する
      json_elements = clean_json.scan(/\{[^{}]*?"title"[^\{\}]*?"url"[^\{\}]*?\}/m)
      
      json_elements.each_with_index do |element, index|
          begin
              # 不正な要素内の改行を削除し、パースを試みる
              safe_element = element.gsub(/[\r\n]/, '').strip
              
              article = JSON.parse(safe_element)
              articles << article
          rescue JSON::ParserError => e
              # 不正な要素はログに出力し、無視する
              Rails.logger.error "Skipping Bad JSON Element #{index}: #{e.message} in #{element}"
          end
      end
      
      begin
        
        # 2. リダイレクト解決の実行と表示の修正
        articles.each do |article|
          if article['url'].present?
            original_url = article['url']
            
            # 記事タイトル内の特殊文字を自然な表示に戻す
            if article['title'].present?
              # JSONパース成功後、残る可能性のあるエスケープ文字(\\)や引用符(")を自然な表現に置換
              article['title'] = article['title'].gsub(/\\/, '').gsub(/"/, '”').gsub(/'/,'’')
            end
            
            # 外部プロセスを呼び出し、URLを安定版に置き換える
            article['url'] = resolve_single_url(article['url'])
            Rails.logger.info "URL Resolved: #{original_url} -> #{article['url']}"

            # リダイレクト失敗時のフォールバック (Google検索リンクへの置き換え)
            if article['url'].include?('vertexaisearch.cloud.google.com')
               search_query = CGI.escape(article['title'])
               article['url'] = "https://www.google.com/search?q=#{search_query}"
               Rails.logger.warn "URL Fallback: Google Search link used for: #{article['title']}"
            end
          end
        end
        
        # 3. フィルタリング: titleとurlが両方存在する安全なデータのみ残す
        filtered_articles = articles.select do |a|
            a.is_a?(Hash) && a['title'].present? && a['url'].present?
        end
        
        return { articles: filtered_articles, error: nil }
        
      rescue => e
        # 予期せぬ致命的な処理エラー
        error_message = "AI検索処理中に致命的なエラーが発生しました。"
        Rails.logger.error "Critical Processing Error: #{e.class} - #{e.message}"
        return { articles: [], error: error_message }
      end
    else
      # Python実行エラー時の処理
      error_message = "AI検索でエラーが発生しました。（Python実行エラー）"
      Rails.logger.error "Python Script Error: #{stderr}"
      return { articles: [], error: error_message }
    end
  end
end