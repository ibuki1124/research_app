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

# CSVファイルを読み込み、各行のデータをArticleモデルに保存
# BOMを無視してUTF-8として読み込む
CSV.foreach(file_path, headers: true, encoding: 'UTF-8') do |row|
  # 「詳細ページURL」をユニークキーとして、データが存在すれば更新、なければ新規作成
  Article.find_or_create_by!(detail_page_url: row['詳細ページURL']) do |article|
    article.tag = row['タグ']
    article.article_title = row['記事タイトル']
    article.published_date = row['記事投稿日']
    article.lead_text = row['リード文']
    article.verification_target = row['検証対象']
    article.verification_process = row['検証過程']
    article.judgment = row['判定']
    article.source_reference = row['出典・参考']
  end
end

puts "CSVデータのArticleモデルへの保存が完了しました。"