import React from 'react';

interface MessageProps {
  type: 'paramedic' | 'ai' | 'system';
  content: string;
  sender?: string;
  timestamp: string;
}

const Message: React.FC<MessageProps> = ({ type, content, sender, timestamp }) => {
  const senderText = sender || (type === 'paramedic' ? '👨‍⚕️ 응급구조사' :
                                type === 'ai' ? '🤖 AI Agent' : '🔧 시스템');

  return (
    <div className={`message ${type}`}>
      <div className="message-header">{senderText} ({timestamp})</div>
      <div className="message-content" dangerouslySetInnerHTML={{ __html: content }}></div>
    </div>
  );
};

export default Message; 