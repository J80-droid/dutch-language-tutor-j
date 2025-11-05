import { SavedConversation } from '../types';

const HISTORY_KEY = 'conversationHistory';

export const getHistory = (): SavedConversation[] => {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Failed to parse conversation history:', error);
    return [];
  }
};

export const saveConversation = (conversation: SavedConversation) => {
  try {
    const history = getHistory();
    // Add to the beginning of the array
    const updatedHistory = [conversation, ...history];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
};

export const deleteConversation = (id: string) => {
  try {
    const history = getHistory();
    const updatedHistory = history.filter(conv => conv.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  }
};

export const clearHistory = () => {
    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error('Failed to clear history:', error);
    }
};
