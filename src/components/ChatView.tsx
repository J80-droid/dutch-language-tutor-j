import React, { useState, useRef, useEffect } from 'react';
import { getChatbotResponse } from '../services/geminiService';

interface ChatMessage {
    sender: 'user' | 'model';
    text: string;
}

const ChatView: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { sender: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const responseText = await getChatbotResponse(input.trim());
        const modelMessage: ChatMessage = { sender: 'model', text: responseText };
        
        setMessages(prev => [...prev, modelMessage]);
        setIsLoading(false);
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Chatbot</h2>
            <div style={styles.messageContainer}>
                {messages.map((msg, index) => (
                    <div key={index} style={{...styles.bubble, ...(msg.sender === 'user' ? styles.userBubble : styles.modelBubble)}}>
                         <p style={styles.text}>{msg.text}</p>
                    </div>
                ))}
                {isLoading && (
                    <div style={{...styles.bubble, ...styles.modelBubble}}>
                        <div style={styles.loader}></div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Stel een vraag..."
                    style={styles.input}
                    disabled={isLoading}
                />
                <button type="submit" style={styles.sendButton} disabled={isLoading}>
                    Stuur
                </button>
            </form>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
    },
    title: {
        textAlign: 'center',
        margin: '0 0 20px 0'
    },
    messageContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    bubble: { 
        padding: '10px 15px', 
        borderRadius: '15px', 
        maxWidth: '80%',
        lineHeight: 1.4
    },
    userBubble: { 
        backgroundColor: 'var(--color-user-bg)', 
        alignSelf: 'flex-end', 
        borderBottomRightRadius: '2px',
        color: 'var(--color-primary-text)'
    },
    modelBubble: { 
        backgroundColor: 'var(--color-model-bg)', 
        alignSelf: 'flex-start', 
        borderBottomLeftRadius: '2px' 
    },
    text: { 
        margin: 0
    },
    form: {
        display: 'flex',
        gap: '10px',
        padding: '10px',
        borderTop: '1px solid var(--color-border)',
        marginTop: '10px'
    },
    input: {
        flex: 1,
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-text)',
        fontSize: '1em'
    },
    sendButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        cursor: 'pointer',
        fontSize: '1em'
    },
    loader: {
        display: 'flex',
        gap: '5px'
    },
};

export default ChatView;