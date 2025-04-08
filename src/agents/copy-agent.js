/**
 * コピーエージェント
 * 複数の入力から有効な最初の値を選択して返します
 */

module.exports = async function copyAgent(inputs, context) {
  const { responses } = inputs;
  
  // 配列でない場合は単純に返す
  if (!Array.isArray(responses)) {
    return responses;
  }
  
  // 配列から最初の非空の値を選択
  for (const response of responses) {
    if (response !== undefined && response !== null) {
      return response;
    }
  }
  
  // 有効な値がない場合
  return {
    error: true,
    message: '有効なレスポンスがありません'
  };
};