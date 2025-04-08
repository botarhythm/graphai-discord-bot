/**
 * コマンド解析エージェント
 * メッセージからコマンド形式を検出し処理します
 */

module.exports = async function commandParserAgent(inputs, context) {
  const { content } = inputs.message;
  
  // コマンドプレフィックスを定義
  const COMMAND_PREFIX = '!';
  
  // Botオペレーションのプレフィックス
  const SYSTEM_PREFIX = '/';
  
  // 基本レスポンス（コマンドがない場合はそのまま会話を継続）
  const response = {
    continue: true,
    command: null,
    args: [],
    isSystem: false
  };
  
  // コンテンツがなければ早期リターン
  if (!content || typeof content !== 'string') {
    return response;
  }
  
  // システムコマンドチェック
  if (content.startsWith(SYSTEM_PREFIX)) {
    const parts = content.slice(SYSTEM_PREFIX.length).trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    response.command = command;
    response.args = args;
    response.isSystem = true;
    
    // 特定のシステムコマンドの処理
    switch (command) {
      case 'help':
        response.helpRequested = true;
        break;
      
      case 'clear':
        response.clearRequested = true;
        break;
        
      case 'reset':
        response.resetRequested = true;
        break;
        
      default:
        // 未知のシステムコマンド
        response.unknownCommand = true;
    }
    
    return response;
  }
  
  // 一般コマンドチェック
  if (content.startsWith(COMMAND_PREFIX)) {
    const parts = content.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    response.command = command;
    response.args = args;
    
    // 特定のコマンドの処理
    switch (command) {
      case 'image':
        console.log('🖼️ Image generation command detected');
        break;
        
      case 'search':
        console.log('🔍 Search command detected');
        break;
      
      default:
        // 未知のコマンド
        response.unknownCommand = true;
    }
  }
  
  return response;
};