/**
 * Discord入力処理エージェント
 * Discordからのメッセージ入力を処理します
 */

module.exports = async function discordInputAgent(inputs, context) {
  const { content, attachments = [], channelId, messageId, authorId, username } = inputs.discordInput;
  
  // メッセージ内容のログ記録
  console.log(`📥 Processing input from ${username || authorId}: ${content}`);
  
  // 添付ファイルの解析
  const hasAttachments = attachments.length > 0;
  if (hasAttachments) {
    console.log(`🖼️ Message has ${attachments.length} attachment(s)`);
  }
  
  // 返却するメッセージ情報
  return {
    content,
    attachments,
    hasAttachments,
    messageId,
    channelId,
    authorId,
    username,
    timestamp: new Date().toISOString(),
  };
};