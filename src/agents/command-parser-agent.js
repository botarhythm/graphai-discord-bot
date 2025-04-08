class CommandParserAgent {
  static async run({ message }, context) {
    const searchTriggers = [
      '検索して', 
      '調べて', 
      'について教えて', 
      'について知りたい', 
      'web search', 
      'what is', 
      'who is'
    ];

    const lowercaseMessage = message.toLowerCase();
    const isWebSearch = searchTriggers.some(trigger => 
      lowercaseMessage.includes(trigger.toLowerCase())
    );

    let query = message;
    searchTriggers.forEach(trigger => {
      query = query.replace(new RegExp(trigger, 'gi'), '').trim();
    });

    return {
      isWebSearch: isWebSearch,
      query: query,
      originalMessage: message
    };
  }
}

export default CommandParserAgent;