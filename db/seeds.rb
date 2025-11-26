# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)

require 'csv'

# CSVファイルのパスをRails.root.joinで指定
file_path = Rails.root.join('db', 'seeds', 'fact_check_articles_full_data.csv')

# データを一時的に保持する配列（ハッシュの配列として格納）
articles_to_insert = []

puts "CSVデータの読み込みを開始します..."

# CSVファイルを読み込み、各行のデータを配列に格納
CSV.foreach(file_path, headers: true, encoding: 'UTF-8') do |row|
  
  # データを代入する前に、文字列をクリーンアップ (文字コードエラー回避のため維持)
  verification_target_cleaned = row['検証対象'] ? 
                                row['検証対象'].encode('UTF-8', invalid: :replace, undef: :replace, replace: '') : 
                                nil
  
  # ハッシュとして配列に追加
  articles_to_insert << {
    tag: row['タグ'],
    article_title: row['記事タイトル'],
    published_date: row['記事投稿日'],
    detail_page_url: row['詳細ページURL'],
    lead_text: row['リード文'],
    verification_target: verification_target_cleaned,
    verification_process: row['検証過程'],
    judgment: row['判定'],
    source_reference: row['出典・参考'],
    
    # insert_all はタイムスタンプを自動設定しないため、手動で追加
    created_at: Time.current,
    updated_at: Time.current
  }
end

puts "CSVデータ #{articles_to_insert.size} 件の読み込みが完了しました。"
puts "バルク挿入を開始します（重複チェックなし）..."

# 💡 標準機能 insert_all の実行 (バリデーションやコールバックはスキップされます)
Article.insert_all(articles_to_insert)

puts "CSVデータのArticleモデルへのバルク挿入が完了しました。🎉"