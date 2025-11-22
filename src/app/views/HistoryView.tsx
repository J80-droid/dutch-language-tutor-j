import React from 'react';
import HistoryListView from '@/components/HistoryListView';
import HistoryDetailView from '@/components/HistoryDetailView';
import { useSessionState } from '../providers/SessionProvider';

export const HistoryView: React.FC = () => {
    const {
        history,
        selectedConversation,
        openConversation,
        deleteConversationById,
        clearHistory,
        handleWordSelect,
    } = useSessionState();

    if (selectedConversation) {
        return <HistoryDetailView conversation={selectedConversation} onWordSelect={handleWordSelect} />;
    }

    return (
        <HistoryListView
            history={history}
            onSelectConversation={openConversation}
            onDeleteItem={deleteConversationById}
            onClearAll={clearHistory}
        />
    );
};


