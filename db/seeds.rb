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

# --- クリーンアップ関数 ---
def cleanup_string(str)
  # strがnilでないことを保証し、スペース除去とエンコードを適用
  str.to_s.strip.encode('UTF-8', invalid: :replace, undef: :replace, replace: '') unless str.nil?
end
# -------------------------

puts "CSVデータの読み込みを開始します..."

# 💡 最終修正: CSVファイルを文字列として一度読み込み、ヘッダーを正規化する
raw_csv_data = File.read(file_path, encoding: 'bom|UTF-8')

# ヘッダーを正規化するための処理
raw_headers = raw_csv_data.lines.first.strip # 最初の行（ヘッダー）を取得
# ヘッダーから全ての不可視文字（BOM、NULL文字、制御文字）を強制的に削除し、空白も除去
sanitized_headers = raw_headers.split(',').map { |h| h.gsub(/[^[:print:]\t\r\n]/, '').strip }

# データベースアクセスに使用するタグキーを取得
# このキーは "タグ" であるべきだが、念のため正規化された配列から取得する
tag_key = sanitized_headers[0] # CSVの最初のカラムをタグとして使用

# CSVファイルを再度オープンし、ヘッダーを正規化された配列で指定
CSV.parse(raw_csv_data, headers: true, encoding: 'UTF-8', skip_blanks: true) do |row|
  # 💡 row.to_h を使用してハッシュに変換し、正規化されたキーを使ってアクセスする
  data_hash = row.to_h.transform_keys { |key| key.to_s.gsub(/[^[:print:]\t\r\n]/, '').strip }
  articles_to_insert << {
    tag: cleanup_string(data_hash[tag_key]),
    article_title: cleanup_string(data_hash['記事タイトル']),
    published_date: cleanup_string(data_hash['記事投稿日']),
    detail_page_url: cleanup_string(data_hash['詳細ページURL']),
    lead_text: cleanup_string(data_hash['リード文']),
    verification_target: cleanup_string(data_hash['検証対象']),
    verification_process: cleanup_string(data_hash['検証過程']),
    judgment: cleanup_string(data_hash['判定']),
    source_reference: cleanup_string(data_hash['出典・参考']),
    created_at: Time.current,
    updated_at: Time.current
  }
end

puts "CSVデータ #{articles_to_insert.size} 件の読み込みが完了しました。"
puts "バルク挿入を開始します（重複チェックなし）..."
Article.insert_all(articles_to_insert)
puts "CSVデータのArticleモデルへのバルク挿入が完了しました。🎉"