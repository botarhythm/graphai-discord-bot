/**
 * デバッグヘルパー関数
 */

// DMメッセージ関連のデバッグ関数
export function debugDM(message) {
  try {
    const channelType = message.channel.type;
    const isDM = channelType === 'DM';
    const author = message.author?.tag || 'Unknown';
    const messageId = message.id;
    const content = message.content?.substring(0, 100) || 'No content';
    const timestamp = new Date().toISOString();

    console.log(`
=== DEBUG DM MESSAGE ===
Timestamp: ${timestamp}
Message ID: ${messageId}
Author: ${author}
Channel Type: ${channelType}
Is DM: ${isDM}
Content: ${content}${content.length > 100 ? '...' : ''}
=====================
`);

    // チャンネルの詳細
    console.log('Channel details:', JSON.stringify({
      type: message.channel.type,
      id: message.channel.id,
      dmChannel: message.channel.type === 'DM',
      recipient: message.channel.recipient?.tag || 'N/A'
    }, null, 2));

    // インテントの確認
    if (message.client && message.client.options) {
      console.log('Client intents:', JSON.stringify(message.client.options.intents, null, 2));
    }

    return true;
  } catch (error) {
    console.error('Error in debugDM:', error);
    return false;
  }
}

// 一般的なデバッグログ関数
export function log(context, data) {
  const timestamp = new Date().toISOString();
  console.log(`
=== DEBUG LOG: ${context} ===
Timestamp: ${timestamp}
Data: ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}
=====================
`);
}

// エラーログ関数
export function logError(context, error) {
  const timestamp = new Date().toISOString();
  console.error(`
===== ERROR LOG =====
Timestamp: ${timestamp}
Context: ${context}
Error: ${error instanceof Error ? error.message : String(error)}
Error Stack: ${error instanceof Error ? error.stack : 'N/A'}
=====================
`);
}

export default {
  debugDM,
  log,
  logError
};