# app/channels/ai_search_channel.rb

class AiSearchChannel < ApplicationCable::Channel
  def subscribed
    # ジョブから渡された session.id に基づいてストリームを購読
    stream_from "ai_search_#{params[:identifier]}" 
  end

  def unsubscribed
  end
end