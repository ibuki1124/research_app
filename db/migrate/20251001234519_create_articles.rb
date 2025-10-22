class CreateArticles < ActiveRecord::Migration[6.1]
  def change
    create_table :articles do |t|
      t.string :tag
      t.string :article_title
      t.date :published_date
      t.string :detail_page_url, unique: true
      t.text :lead_text
      t.text :verification_target
      t.text :verification_process
      t.string :judgment
      t.text :source_reference

      t.timestamps
    end
  end
end
