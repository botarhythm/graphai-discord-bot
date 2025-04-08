/**
 * コンテンツタイプ検出エージェント
 * メッセージの内容タイプを分析して処理フローを決定します
 */

module.exports = async function contentTypeDetectorAgent(inputs, context) {
  const { content, attachments, hasAttachments } = inputs.message;
  
  // 解析結果の初期値
  const result = {
    type: 'text_only',     // デフォルトはテキストのみ
    hasImage: false,       // 画像があるか
    hasURL: false,         // URLが含まれるか
    hasCode: false,        // コードが含まれるか
    isQuestion: false,     // 質問形式か
    complexity: 'normal',  // 複雑さの評価（simple, normal, complex）
    sentiment: 'neutral',  // 感情分析（positive, neutral, negative）
  };
  
  // コンテンツがなければ早期リターン
  if (!content || typeof content !== 'string') {
    return result;
  }
  
  // 画像添付の検出
  if (hasAttachments) {
    const imageAttachments = attachments.filter(url => {
      const lowerUrl = url.toLowerCase();
      return lowerUrl.endsWith('.jpg') || 
             lowerUrl.endsWith('.jpeg') || 
             lowerUrl.endsWith('.png') || 
             lowerUrl.endsWith('.gif') || 
             lowerUrl.endsWith('.webp');
    });
    
    if (imageAttachments.length > 0) {
      result.hasImage = true;
      result.type = content.trim() ? 'text_with_image' : 'image_only';
      console.log('🖼️ Detected image in message');
    }
  }
  
  // URLの検出
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (urlRegex.test(content)) {
    result.hasURL = true;
    console.log('🔗 Detected URL in message');
  }
  
  // コードブロックの検出
  const codeBlockRegex = /```[\s\S]*?```/g;
  if (codeBlockRegex.test(content)) {
    result.hasCode = true;
    console.log('💻 Detected code block in message');
  }
  
  // 質問形式の検出
  const questionRegex = /[?？]$|\b(what|how|why|when|where|who|which|whose|whom|is|are|am|do|does|did|can|could|would|should|will|has|have|had)\b/i;
  if (questionRegex.test(content)) {
    result.isQuestion = true;
  }
  
  // 複雑さの評価（簡易版）
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 100 || content.length > 500) {
    result.complexity = 'complex';
  } else if (wordCount < 10 || content.length < 50) {
    result.complexity = 'simple';
  }
  
  // 感情分析（非常に簡易的な実装）
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'joy', 'love', 'like', 'thanks'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'sad', 'angry', 'hate', 'dislike', 'sorry', 'problem'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  const lowerContent = content.toLowerCase();
  
  positiveWords.forEach(word => {
    if (lowerContent.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerContent.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) {
    result.sentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    result.sentiment = 'negative';
  }
  
  console.log(`🔍 Content analysis result: ${JSON.stringify(result)}`);
  
  return result;
};