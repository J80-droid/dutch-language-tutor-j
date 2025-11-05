// FIX: Replaced placeholder content with a complete, functional App component.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveServerMessage } from '@google/genai';
import {
  CEFRLevel,
  ActivityMode,
  Transcript,
  SessionSummary,
  CEFR_LEVELS,
  SavedConversation,
  Theme,
} from './types';
import {
  connectToLiveSession,
  generateIntroduction,
  getSessionSummary,
  LiveSession,
} from './services/geminiService';
import { getHistory, saveConversation, deleteConversation, clearHistory } from './utils/historyUtils';
import { getProgress, updateProgress } from './utils/progressUtils';
import { applyTheme, getInitialTheme } from './utils/themeUtils';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import { exportVocabulary } from './utils/fileUtils';

// Components
import LevelSelector from './components/LevelSelector';
import ActivitySelector from './components/ActivitySelector';
import ConversationView from './components/ConversationView';
import ControlPanel from './components/ControlPanel';
import SummaryView from './components/SummaryView';
import HistoryListView from './components/HistoryListView';
import HistoryDetailView from './components/HistoryDetailView';
import DashboardView from './components/DashboardView';
import WordDefinitionModal from './components/WordDefinitionModal';
import ChatView from './components/ChatView';
import ThemeSelector from './components/ThemeSelector';
import PlaybackSpeedSelector from './components/PlaybackSpeedSelector';
import { HomeIcon, DashboardIcon, HistoryIcon, ChatIcon } from './components/Icons';

type AppView = 'setup' | 'session' | 'summary' | 'history' | 'dashboard' | 'chat';

const App: React.FC = () => {
    // App State
    const [view, setView] = useState<AppView>('setup');
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    
    // Setup State
    const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
    const [selectedMode, setSelectedMode] = useState<ActivityMode>('conversation');

    // Session State
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    
    // Word Definition Modal
    const [selectedWord, setSelectedWord] = useState<string | null>(null);

    // History & Progress
    const [history, setHistory] = useState<SavedConversation[]>([]);
    const [progress, setProgress] = useState(getProgress());
    const [selectedConversation, setSelectedConversation] = useState<SavedConversation | null>(null);

    // Refs for audio processing and live session
    const sessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);


    // Theme effect
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);
    
    // Load history on mount
    useEffect(() => {
        setHistory(getHistory());
    }, []);

    // Audio context management
    const initializeAudioContexts = () => {
        if (!inputAudioContextRef.current) {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        }
        if (!outputAudioContextRef.current) {
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            outputGainNodeRef.current = outputAudioContextRef.current.createGain();
            outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
        }
    };
    
    const cleanupAudio = useCallback(() => {
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);
    
    // --- Live Session Callbacks ---
    const nextStartTime = useRef(0);
    const sources = useRef(new Set<AudioBufferSourceNode>());

    const handleLiveMessage = useCallback(async (message: LiveServerMessage) => {
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current && outputGainNodeRef.current) {
            nextStartTime.current = Math.max(nextStartTime.current, outputAudioContextRef.current.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
            
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = playbackRate;
            source.connect(outputGainNodeRef.current);
            source.addEventListener('ended', () => sources.current.delete(source));
            
            source.start(nextStartTime.current);
            nextStartTime.current += audioBuffer.duration / playbackRate;
            sources.current.add(source);
        }

        if (message.serverContent?.outputTranscription?.text) {
             setTranscripts(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'model') {
                    // Update the last message instead of creating a new one for streaming text
                    const newText = message.serverContent?.outputTranscription.isFinal
                        ? message.serverContent.outputTranscription.text
                        : last.text + message.serverContent.outputTranscription.text;
                    const updatedLast = { ...last, text: newText };
                    return [...prev.slice(0, -1), updatedLast];
                }
                return [...prev, { speaker: 'model', text: message.serverContent.outputTranscription.text }];
             });
        }
        if (message.serverContent?.inputTranscription?.text) {
            setTranscripts(prev => {
                const last = prev[prev.length - 1];
                const inputText = message.serverContent.inputTranscription.text.trim();
                const isFinal = message.serverContent.inputTranscription.isFinal ?? false;
                
                if (last?.speaker === 'user') {
                    // Gemini Live sends the complete transcription text with each update
                    // Always update with the latest text when:
                    // 1. It's marked as final (definitive version)
                    // 2. It's longer than what we have (improved transcription)
                    // 3. It's different and same length or longer (corrected transcription)
                    const shouldUpdate = isFinal || 
                                        inputText.length > last.text.length ||
                                        (inputText !== last.text && inputText.length >= last.text.length);
                    const newText = shouldUpdate ? inputText : last.text;
                    const updatedLast = { ...last, text: newText };
                    return [...prev.slice(0, -1), updatedLast];
                }
                // Start a new user message
                return [...prev, { speaker: 'user', text: inputText }];
            });
        }
        
        if (message.serverContent?.interrupted) {
            for (const source of sources.current.values()) {
                source.stop();
            }
            sources.current.clear();
            nextStartTime.current = 0;
        }

    }, [playbackRate]);

    const handleLiveError = useCallback((error: ErrorEvent) => {
        console.error("Live session error:", error);
        setTranscripts(prev => [...prev, { speaker: 'system', text: 'Er is een verbindingsfout opgetreden.' }]);
        endSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLiveClose = useCallback(() => {
        console.log("Live session closed.");
        cleanupAudio();
    }, [cleanupAudio]);


    // --- Session Control ---
    const startSession = async () => {
        if (!process.env.API_KEY) {
            alert("API Key not configured. Please set the API_KEY environment variable.");
            return;
        }

        setView('session');
        setIsSessionActive(true);
        setTranscripts([{ speaker: 'system', text: 'Sessie starten, even geduld...' }]);
        
        initializeAudioContexts();

        try {
            const { text, audio } = await generateIntroduction(selectedLevel, selectedMode);
            setTranscripts([{ speaker: 'model', text }]);

            if (audio && outputAudioContextRef.current && outputGainNodeRef.current) {
                const audioBuffer = await decodeAudioData(decode(audio), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.playbackRate.value = playbackRate;
                source.connect(outputGainNodeRef.current);
                source.start();
                nextStartTime.current = outputAudioContextRef.current.currentTime + audioBuffer.duration / playbackRate;
            }

            const session = await connectToLiveSession(selectedLevel, selectedMode, handleLiveMessage, handleLiveError, handleLiveClose);
            sessionRef.current = session;

        } catch (error) {
            console.error("Failed to start session:", error);
            setTranscripts([{ speaker: 'system', text: 'Kon de sessie niet starten. Controleer de console voor meer informatie.' }]);
            setIsSessionActive(false);
        }
    };

    const endSession = useCallback(async () => {
        setIsRecording(false);
        setIsSessionActive(false);
        cleanupAudio();
        
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }

        const conversationTranscripts = transcripts.filter(t => t.speaker !== 'system' && t.text.trim() !== '');
        if (conversationTranscripts.length < 2) { 
            setView('setup');
            return;
        }

        setView('summary');
        setIsSummaryLoading(true);

        try {
            const summaryData = await getSessionSummary(conversationTranscripts, selectedLevel, selectedMode);
            setSummary(summaryData);

            const newConversation: SavedConversation = {
                id: new Date().toISOString(),
                date: new Date().toLocaleString(),
                level: selectedLevel,
                activity: selectedMode,
                transcripts: conversationTranscripts,
                summary: summaryData,
            };
            
            saveConversation(newConversation);
            setHistory(prev => [newConversation, ...prev]);
            const newProgress = updateProgress(selectedLevel, selectedMode);
            setProgress(newProgress);

        } catch (error) {
            console.error("Failed to get session summary:", error);
            setSummary(null);
        } finally {
            setIsSummaryLoading(false);
        }
    }, [transcripts, selectedLevel, selectedMode, cleanupAudio]);
    
    // --- Recording Control ---
    const toggleRecording = async () => {
        if (!isSessionActive) return;

        if (isRecording) {
            setIsRecording(false);
            cleanupAudio();
        } else {
            if (!inputAudioContextRef.current) {
                console.error("Input audio context not initialized.");
                return;
            }
            setIsRecording(true);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStreamRef.current = stream;
                mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
                
                scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                
                scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                    const session = sessionRef.current;
                    if (!session) return;
                    
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const l = inputData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) {
                        int16[i] = inputData[i] * 32768;
                    }
                    const pcmBlob = {
                        data: encode(new Uint8Array(int16.buffer)),
                        mimeType: 'audio/pcm;rate=16000',
                    };
                    session.sendRealtimeInput({ media: pcmBlob });
                };

                mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
            } catch (error) {
                console.error("Error getting user media:", error);
                setTranscripts(prev => [...prev, { speaker: 'system', text: 'Microfoon toegang geweigerd.' }]);
                setIsRecording(false);
            }
        }
    };
    
    // --- Navigation and UI Handlers ---
    const handleStartNewSession = () => {
        setTranscripts([]);
        setSummary(null);
        setView('setup');
    };

    const handleExport = () => {
        if (summary?.newVocabulary) {
            exportVocabulary(summary.newVocabulary);
        }
    };

    const handleWordSelect = (word: string) => {
        setSelectedWord(word);
    };

    const handleSelectHistoryItem = (conversation: SavedConversation) => {
        setSelectedConversation(conversation);
        setView('history');
    };

    const handleDeleteHistoryItem = (id: string) => {
        deleteConversation(id);
        setHistory(prev => prev.filter(c => c.id !== id));
        if (selectedConversation?.id === id) {
            setSelectedConversation(null);
        }
    };
    
    const handleClearHistory = () => {
        if (window.confirm("Weet je zeker dat je alle gesprekken wilt verwijderen?")) {
            clearHistory();
            setHistory([]);
            setSelectedConversation(null);
        }
    };
    
    const renderView = () => {
        switch (view) {
            case 'session':
                return (
                    <>
                        <ConversationView transcripts={transcripts} onWordSelect={handleWordSelect} />
                        <div style={styles.sessionControls}>
                            <PlaybackSpeedSelector playbackRate={playbackRate} onRateChange={setPlaybackRate} />
                        </div>
                    </>
                );
            case 'summary':
                return <SummaryView summary={summary} isLoading={isSummaryLoading} onStartNewSession={handleStartNewSession} onExport={handleExport} />;
            case 'history':
                return selectedConversation ? 
                    <HistoryDetailView conversation={selectedConversation} onWordSelect={handleWordSelect}/> : 
                    <HistoryListView history={history} onSelectConversation={handleSelectHistoryItem} onDeleteItem={handleDeleteHistoryItem} onClearAll={handleClearHistory} />;
            case 'dashboard':
                return <DashboardView progress={progress} />;
            case 'chat':
                return <ChatView />;
            case 'setup':
            default:
                return (
                    <div style={styles.setupContainer}>
                        <h1>Welkom bij de Nederlandse Taalcoach</h1>
                        <p>Kies je niveau en een activiteit om te beginnen.</p>
                        <LevelSelector levels={CEFR_LEVELS} selectedLevel={selectedLevel} onSelectLevel={setSelectedLevel} />
                        <ActivitySelector selectedMode={selectedMode} onSelectMode={setSelectedMode} />
                        <button onClick={startSession} style={styles.startButton}>
                            Start Sessie
                        </button>
                    </div>
                );
        }
    };

    const NavButton = ({ targetView, icon, label }: { targetView: AppView, icon: React.ReactNode, label: string }) => (
        <button 
            style={{...styles.navButton, ...(view === targetView && styles.activeNavButton)}} 
            onClick={() => {
                setSelectedConversation(null);
                setView(targetView);
            }}
            title={label}
        >
            {icon}
            <span className="navLabel" style={styles.navLabel}>{label}</span>
        </button>
    );

    return (
        <div style={styles.app}>
            <header style={styles.header}>
                <div style={styles.logo}>Taalcoach</div>
                <nav style={styles.nav}>
                    <NavButton targetView="setup" icon={<HomeIcon />} label="Home" />
                    <NavButton targetView="dashboard" icon={<DashboardIcon />} label="Voortgang" />
                    <NavButton targetView="history" icon={<HistoryIcon />} label="Geschiedenis" />
                    <NavButton targetView="chat" icon={<ChatIcon />} label="Chatbot" />
                </nav>
                <div style={styles.headerActions}>
                    <ThemeSelector theme={theme} setTheme={setTheme} />
                </div>
            </header>
            
            <main style={styles.main}>
                {renderView()}
            </main>
            
            {view === 'session' && (
                <footer style={styles.footer}>
                    <ControlPanel
                        isRecording={isRecording}
                        isSessionActive={isSessionActive}
                        onToggleRecording={toggleRecording}
                        onEndSession={endSession}
                    />
                </footer>
            )}

            {selectedWord && <WordDefinitionModal word={selectedWord} onClose={() => setSelectedWord(null)} />}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', transition: 'background-color 0.3s, color 0.3s' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-secondary-bg)', flexShrink: 0 },
  logo: { fontWeight: 'bold', fontSize: '1.5em' },
  nav: { display: 'flex', gap: '10px' },
  navButton: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', fontSize: '1em', opacity: 0.7 },
  activeNavButton: { backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-text)', opacity: 1 },
  navLabel: { display: 'none' },
  headerActions: { display: 'flex', alignItems: 'center' },
  main: { flex: 1, overflowY: 'auto', padding: '20px' },
  footer: { flexShrink: 0 },
  setupContainer: { maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '25px', textAlign: 'center' },
  startButton: { padding: '15px 30px', fontSize: '1.2em', cursor: 'pointer', border: 'none', borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-text)', fontWeight: 'bold', marginTop: '10px' },
  sessionControls: { display: 'flex', justifyContent: 'center', padding: '10px 0' }
};

const styleEl = document.createElement('style');
styleEl.innerHTML = `
    @media (min-width: 768px) {
        .navLabel {
            display: inline !important;
        }
    }
`;
document.head.appendChild(styleEl);


export default App;
