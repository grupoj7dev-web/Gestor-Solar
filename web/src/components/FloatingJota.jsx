import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Mic, MicOff, X, Zap, AlertTriangle, Users, Activity, TrendingUp } from 'lucide-react';

export function FloatingJota() {
    const { getToken } = useAuth();
    const { warning } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(true); // Always listening by default
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [ignoredSpeech, setIgnoredSpeech] = useState(''); // New: feedback for ignored speech
    const [conversationHistory, setConversationHistory] = useState([]);
    const [visualData, setVisualData] = useState(null);

    const recognitionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const isRecognitionActiveRef = useRef(false);
    const hasGreetedRef = useRef(false);
    const inConversationRef = useRef(false);
    const conversationTimeoutRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        console.log(' [JOTA DEBUG] Initializing Speech Recognition...');

        if (!('webkitSpeechRecognition' in window)) {
            console.error(' [JOTA DEBUG] Speech recognition NOT supported in this browser!');
            warning('Seu navegador nao suporta reconhecimento de voz. Use Google Chrome ou Microsoft Edge.');
            return;
        }

        console.log(' [JOTA DEBUG] Speech recognition is supported');

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
            console.log(' [JOTA DEBUG] Recognition STARTED');
            isRecognitionActiveRef.current = true;
        };

        recognition.onend = () => {
            console.log(' [JOTA DEBUG] Recognition ENDED');
            isRecognitionActiveRef.current = false;

            if (isListening && !isSpeaking) {
                console.log(' [JOTA DEBUG] Auto-restarting recognition...');
                setTimeout(() => {
                    try {
                        if (!isRecognitionActiveRef.current) {
                            recognition.start();
                        }
                    } catch (e) {
                        console.log(' [JOTA DEBUG] Auto-restart ignored:', e);
                    }
                }, 300);
            }
        };

        recognition.onresult = (event) => {
            console.log(' [JOTA DEBUG] Recognition result received');

            // Improvement 2: Allow interruptions - stop Jota if user speaks while he's talking
            if (isSpeaking) {
                console.log(' [JOTA DEBUG] Interrupting Jota...');
                setIgnoredSpeech('Interrompendo Jota...');
                setTimeout(() => setIgnoredSpeech(''), 2000);
                // Stop current audio playback
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
                setIsSpeaking(false);
            }

            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                console.log(' [JOTA DEBUG] Transcrio:', finalTranscript);
                setTranscript(finalTranscript);
                resetConversationTimeout();

                const lowerText = finalTranscript.toLowerCase();
                const exitPhrases = ['tchau', 'at logo', 'at mais', 'falou'];

                if (exitPhrases.some(phrase => lowerText.includes(phrase))) {
                    console.log(' [JOTA DEBUG] Exit phrase detected');
                    inConversationRef.current = false;
                    setIsOpen(false);
                    setVisualData(null);
                    setTranscript('');
                    return;
                }

                if (!inConversationRef.current) {
                    console.log(' [JOTA DEBUG] Checking for wake word...');
                    // Improvement 1: More flexible wake words
                    const wakeWords = ['jota', 'j ', ' j', 'joo', 'ei j', 'oi j', 'j,', 'j.', 'j!', 'j?'];
                    // Also check if text starts or ends with 'j'
                    const startsWithJ = lowerText.trim().startsWith('j ');
                    const endsWithJ = lowerText.trim().endsWith(' j');
                    const isJustJ = lowerText.trim() === 'j';
                    const hasWakeWord = wakeWords.some(word => lowerText.includes(word)) || startsWithJ || endsWithJ || isJustJ;

                    console.log(' [JOTA DEBUG] Wake word check:', { hasWakeWord, startsWithJ, endsWithJ, isJustJ });

                    if (hasWakeWord) {
                        console.log(' [JOTA DEBUG] Wake word detectada! Ativando Jota...');
                        inConversationRef.current = true;
                        setIsOpen(true);
                        // Clean all possible wake word variations
                        const cleanText = finalTranscript.replace(/jota|joo|ei j|oi j|\bj\b/gi, '').replace(/[,\.!?]/g, '').trim();
                        console.log(' [JOTA DEBUG] Cleaned text:', cleanText);
                        if (cleanText) {
                            sendMessage(cleanText);
                        } else {
                            greet();
                        }
                    } else {
                        console.log(' [JOTA DEBUG] Wake word NOT detected');
                        // Improvement 4: Visual feedback when wake word not detected
                        setIgnoredSpeech('Diga "J" para ativar');
                        setTimeout(() => setIgnoredSpeech(''), 2000);
                    }
                } else {
                    console.log(' [JOTA DEBUG] In conversation, sending message...');
                    sendMessage(finalTranscript);
                }

                setTimeout(() => setTranscript(''), 3000);
            }
        };

        recognition.onerror = (event) => {
            console.error(' [JOTA DEBUG] Recognition ERROR:', event.error);
            if (event.error === 'not-allowed') {
                console.error(' [JOTA DEBUG] Microphone permission DENIED!');
                warning('Permissao de microfone negada. Permita o acesso ao microfone nas configuracoes do navegador.');
                setIsListening(false);
            } else if (event.error === 'no-speech') {
                console.warn(' [JOTA DEBUG] No speech detected');
            } else if (event.error === 'network') {
                console.error(' [JOTA DEBUG] Network error - check internet connection');
            } else {
                console.error(' [JOTA DEBUG] Other error:', event.error);
            }
        };

        recognitionRef.current = recognition;

        // Start listening automatically
        console.log(' [JOTA DEBUG] Starting recognition...');
        try {
            recognition.start();
        } catch (e) {
            if (e.name !== 'InvalidStateError') {
                console.error(' [JOTA DEBUG] Initial start error:', e);
            }
        }

        return () => {
            console.log(' [JOTA DEBUG] Cleanup: stopping recognition');
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const safeStart = () => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        try {
            recognition.start();
        } catch (e) {
            if (e.name !== 'InvalidStateError') {
                console.log('Start error:', e);
            }
        }
    };

    useEffect(() => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        if (isListening && !isSpeaking && !isRecognitionActiveRef.current) {
            safeStart();
        } else if ((!isListening || isSpeaking) && isRecognitionActiveRef.current) {
            recognition.stop();
        }
    }, [isListening, isSpeaking]);

    const resetConversationTimeout = () => {
        if (conversationTimeoutRef.current) {
            clearTimeout(conversationTimeoutRef.current);
        }
        // Improvement 3: Increase timeout to 60 seconds
        conversationTimeoutRef.current = setTimeout(() => {
            inConversationRef.current = false;
            setIsOpen(false);
            setVisualData(null);
        }, 60000);
    };

    const greet = async () => {
        if (hasGreetedRef.current) {
            console.log(' [JOTA DEBUG] Already greeted, skipping');
            return;
        }
        hasGreetedRef.current = true;

        try {
            console.log(' [JOTA DEBUG] Sending greeting request to API...');
            const greetingText = "Fala chefe, o que voc precisa?";
            const response = await api.post('/jota/chat', {
                message: `Diga exatamente: "${greetingText}"`,
                conversationHistory: []
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            console.log(' [JOTA DEBUG] Greeting response received:', response.data);
            const { audio, conversationHistory: newHistory } = response.data;
            setConversationHistory(newHistory);

            if (audio) {
                console.log(' [JOTA DEBUG] Playing greeting audio...');
                playAudio(audio);
            } else {
                console.warn(' [JOTA DEBUG] No audio in greeting response');
            }
        } catch (error) {
            console.error(' [JOTA DEBUG] Error greeting:', error);
            console.error(' [JOTA DEBUG] Error details:', error.response?.data || error.message);
        }
    };

    const sendMessage = async (text) => {
        if (!text.trim()) {
            console.log(' [JOTA DEBUG] Empty message, skipping');
            return;
        }

        try {
            console.log(' [JOTA DEBUG] Sending message to API:', text);
            const response = await api.post('/jota/chat', {
                message: text,
                conversationHistory
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            console.log(' [JOTA DEBUG] Message response received:', response.data);
            const { audio, conversationHistory: newHistory, toolCallsData } = response.data;

            setConversationHistory(newHistory);

            if (toolCallsData && toolCallsData.length > 0) {
                console.log(' [JOTA DEBUG] Tool calls data received:', toolCallsData);
                setVisualData([toolCallsData[toolCallsData.length - 1]]);
            }

            if (audio) {
                console.log(' [JOTA DEBUG] Playing response audio...');
                playAudio(audio);
            } else {
                console.warn(' [JOTA DEBUG] No audio in response');
            }

        } catch (error) {
            console.error(' [JOTA DEBUG] Error sending message:', error);
            console.error(' [JOTA DEBUG] Error details:', error.response?.data || error.message);
        }
    };

    const initAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
        }
    };

    const playAudio = async (base64Audio) => {
        try {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                isRecognitionActiveRef.current = false;
            }

            setIsSpeaking(true);
            initAudioContext();

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const audioData = atob(base64Audio);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i);
            }

            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);

            source.onended = () => {
                setIsSpeaking(false);

                if (isListening) {
                    setTimeout(() => {
                        try {
                            recognitionRef.current.start();
                            isRecognitionActiveRef.current = true;
                        } catch (e) {
                            console.log('Recognition restart error:', e);
                        }
                    }, 500);
                }
            };

            source.start(0);
        } catch (error) {
            console.error('Error playing audio:', error);
            setIsSpeaking(false);
        }
    };

    const toggleListening = () => {
        setIsListening(prev => !prev);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={toggleListening}
                className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl ${isListening
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-300 animate-pulse'
                    : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-300'
                    } hover:scale-110 active:scale-95`}
                title={isListening ? 'Jota est ouvindo (clique para mutar)' : 'Jota est mutado (clique para ativar)'}
            >
                {isListening ? (
                    <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
                ) : (
                    <MicOff className="w-8 h-8 text-white" strokeWidth={2.5} />
                )}
            </button>

            {/* Transcript Toast */}
            {transcript && (
                <div className="fixed bottom-24 right-6 z-50 bg-blue-500 text-white px-4 py-3 rounded-xl shadow-2xl max-w-sm animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-sm font-medium">{transcript}</p>
                </div>
            )}

            {/* Improvement 4: Ignored Speech Feedback */}
            {ignoredSpeech && (
                <div className="fixed bottom-24 right-6 z-50 bg-yellow-500 text-white px-4 py-3 rounded-xl shadow-2xl max-w-sm animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-sm font-medium"> {ignoredSpeech}</p>
                </div>
            )}

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
                    {/* Backdrop with blur */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => {
                            setIsOpen(false);
                            inConversationRef.current = false;
                            setVisualData(null);
                        }}
                    />

                    {/* Content */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                    <Activity className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">JOTA</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Assistente Inteligente</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    inConversationRef.current = false;
                                    setVisualData(null);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Visual Data */}
                        <div className="p-6">
                            {visualData && visualData.length > 0 && visualData.map((item, idx) => (
                                <div key={idx}>
                                    {/* System Status */}
                                    {item.type === 'getSystemStatus' && (
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                                <TrendingUp className="h-6 w-6 text-blue-600" />
                                                Status do Sistema
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                                                    <p className="text-sm font-semibold text-blue-700 mb-1">Usinas Total</p>
                                                    <p className="text-3xl font-bold text-blue-900">{item.data.stations.total}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
                                                    <p className="text-sm font-semibold text-green-700 mb-1">Online</p>
                                                    <p className="text-3xl font-bold text-green-900">{item.data.stations.online}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-200">
                                                    <p className="text-sm font-semibold text-red-700 mb-1">Offline</p>
                                                    <p className="text-3xl font-bold text-red-900">{item.data.stations.offline}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border-2 border-yellow-200">
                                                    <p className="text-sm font-semibold text-yellow-700 mb-1">Tickets</p>
                                                    <p className="text-3xl font-bold text-yellow-900">{item.data.tickets.open}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Operational Panel */}
                                    {item.type === 'getOperationalPanel' && (
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                                <Activity className="h-6 w-6 text-purple-600" />
                                                Painel de Operao
                                            </h3>
                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
                                                    <p className="text-sm font-semibold text-green-700 mb-1">Gerando</p>
                                                    <p className="text-2xl font-bold text-green-900">{item.data.summary.generating}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                                                    <p className="text-sm font-semibold text-blue-700 mb-1">Conectadas</p>
                                                    <p className="text-2xl font-bold text-blue-900">{item.data.summary.connected}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-200">
                                                    <p className="text-sm font-semibold text-red-700 mb-1">Offline</p>
                                                    <p className="text-2xl font-bold text-red-900">{item.data.summary.offline}</p>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200">
                                                <p className="text-sm font-semibold text-purple-700 mb-1">Produo Total</p>
                                                <p className="text-3xl font-bold text-purple-900">{item.data.summary.totalProduction} kW</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Alerts */}
                                    {item.type === 'getAlerts' && (
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                                <AlertTriangle className="h-6 w-6 text-red-600" />
                                                Alertas Ativos
                                            </h3>
                                            {Array.isArray(item.data) && item.data.length > 0 ? (
                                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                                    {item.data.map((alert, i) => (
                                                        <div key={i} className="bg-red-50 border-2 border-red-200 p-4 rounded-xl">
                                                            <p className="font-bold text-red-900">{alert.alarmName || 'Alerta'}</p>
                                                            <p className="text-sm text-red-700 mt-1">{alert.stationName || ''}</p>
                                                            {alert.alarmTime && (
                                                                <p className="text-xs text-red-600 mt-2">{new Date(alert.alarmTime).toLocaleString('pt-BR')}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500">Nenhum alerta ativo</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Offline Stations */}
                                    {item.type === 'getOfflineStations' && (
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                <AlertTriangle className="h-6 w-6 text-red-600" />
                                                Usinas Offline
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-6">Total: <span className="font-bold">{item.data.count}</span> usinas</p>
                                            {Array.isArray(item.data.stations) && item.data.stations.length > 0 ? (
                                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                                    {item.data.stations.map((station, i) => (
                                                        <div key={i} className="bg-red-50 border-2 border-red-200 p-4 rounded-xl">
                                                            <p className="font-bold text-red-900">{station.name}</p>
                                                            <p className="text-sm text-red-700 mt-2">Status: {station.status}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500">Nenhuma usina offline</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Station Details */}
                                    {item.type === 'getStationDetails' && (
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                                <Zap className="h-6 w-6 text-yellow-600" />
                                                Detalhes da Usina
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
                                                    <p className="text-sm font-semibold text-green-700 mb-1">Produo</p>
                                                    <p className="text-2xl font-bold text-green-900">{item.data.realtime?.generationPower || 0} kW</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                                                    <p className="text-sm font-semibold text-blue-700 mb-1">Inversores</p>
                                                    <p className="text-2xl font-bold text-blue-900">{item.data.devices?.length || 0}</p>
                                                </div>
                                            </div>

                                            {item.data.devices && item.data.devices.length > 0 && (
                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <Zap className="h-5 w-5 text-blue-600" />
                                                        Inversores
                                                    </h4>
                                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                                        {item.data.devices.map((device, i) => (
                                                            <div key={i} className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl flex justify-between">
                                                                <div>
                                                                    <p className="font-bold text-blue-900">{device.deviceName || `Inversor ${i + 1}`}</p>
                                                                    <p className="text-sm text-blue-700 mt-1">SN: {device.deviceSn || 'N/A'}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xl font-bold text-green-600">{device.generationPower || 0} kW</p>
                                                                    <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold mt-1 ${device.deviceState === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {device.deviceState === 1 ? 'Online' : 'Offline'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {!visualData && (
                                <div className="text-center py-12">
                                    <Activity className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
                                    <p className="text-gray-600 dark:text-gray-400">Diga "J" seguido do que voc precisa...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


