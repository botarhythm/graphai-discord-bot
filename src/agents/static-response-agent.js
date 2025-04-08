/**
 * 静的レスポンスエージェント
 * 事前定義されたテキストをそのまま返します
 */

module.exports = async function staticResponseAgent(inputs, context) {
  const { text } = inputs;
  
  if (!text) {
    return {
      error: true,
      message: '静的テキストが指定されていません'
    };
  }
  
  return text;
};