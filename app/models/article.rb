class Article < ApplicationRecord
  def self.ransackable_attributes(auth_object = nil)
    ["article_title", "created_at", "detail_page_url", "id", "judgment", "lead_text", "published_date", "source_reference", "tag", "updated_at", "verification_process", "verification_target"]
  end
  
  def self.ransackable_associations(auth_object = nil)
    []
  end
end
