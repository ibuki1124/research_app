class CreateArticles < ActiveRecord::Migration[6.1]
  def change
    create_table :articles do |t|
      t.string :tag
      t.string :article_title
      t.string :detail_page_url, unique: true
      t.text :lead_text

      t.timestamps
    end
  end
end
