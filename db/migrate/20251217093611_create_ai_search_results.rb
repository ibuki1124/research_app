class CreateAiSearchResults < ActiveRecord::Migration[6.1]
  def change
    create_table :ai_search_results do |t|
      t.string :session_id
      t.text :html_content

      t.timestamps
    end
  end
end
