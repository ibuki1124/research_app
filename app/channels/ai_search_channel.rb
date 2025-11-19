# app/channels/ai_search_channel.rb

class AiSearchChannel < ApplicationCable::Channel
  def subscribed
    # ジョブから渡された session.id に基づいてストリームを購読
    identifier = params[:identifier]
    stream_from "ai_search_#{identifier}"
    cache_key = "ai_search_results_#{identifier}"
    Rails.cache.delete(cache_key)
  end

  def unsubscribed
  end
end