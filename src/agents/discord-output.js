/**
 * Discord出力処理エージェント
 * 生成されたコンテンツをDiscordに送信します
 */

module.exports = async function discordOutputAgent(inputs, context) {
  const { message, discordInput } = inputs;
  
  // メッセージの内容チェック
  if (!message) {
    console.error('❌ No message content to send');
    return { 
      success: false,
      error: 'No message content to send'
    };
  }
  
  try {
    // 出力タイプによって処理を分岐
    if (typeof message === 'string') {
      // テキストメッセージの場合
      await discordInput.reply(message);
      console.log('✅ Sent text message to Discord');
      return { success: true, type: 'text' };
      
    } else if (message.error) {
      // エラーメッセージの場合
      await discordInput.reply(`⚠️ ${message.message || 'エラーが発生しました'}`);
      console.log('⚠️ Sent error message to Discord');
      return { success: true, type: 'error' };
      
    } else if (message.imageUrl) {
      // 画像URLがある場合
      const responseText = message.prompt 
        ? `🖼️ 「${message.prompt}」の画像を生成しました (残り今日${message.remainingCount}枚):`
        : '🖼️ 画像を生成しました:';
        
      await discordInput.reply(`${responseText}\n${message.imageUrl}`);
      console.log('✅ Sent image URL to Discord');
      return { success: true, type: 'image' };
      
    } else if (message.response) {
      // AIレスポンスの場合
      await discordInput.reply(message.response);
      console.log('✅ Sent AI response to Discord');
      return { success: true, type: 'ai_response' };
      
    } else {
      // その他の場合（一般的なオブジェクト）
      await discordInput.reply(`🤖 ${JSON.stringify(message)}`);
      console.log('✅ Sent object data to Discord');
      return { success: true, type: 'object' };
    }
    
  } catch (error) {
    console.error('❌ Discord output error:', error);
    return { 
      success: false,
      error: error.message
    };
  }
};