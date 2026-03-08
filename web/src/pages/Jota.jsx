import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Mic, MicOff, Zap, AlertTriangle, Users, Activity, TrendingUp } from 'lucide-react';

export function Jota() {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { warning } = useNotification();
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [messages, setMessages] = useState([]);
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
        if (!('webkitSpeechRecognition' in window)) {
            warning('Seu navegador nao suporta reconhecimento de voz. Use o Chrome.');
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
            console.log(' Microfone ABERTO');
            isRecognitionActiveRef.current = true;
        };

        recognition.onend = () => {
            console.log(' Microfone FECHADO');
            isRecognitionActiveRef.current = false;

            if (isListening && !isSpeaking) {
                setTimeout(() => {
                    try {
                        if (!isRecognitionActiveRef.current) {
                            recognition.start();
                        }
                    } catch (e) {
                        console.log('Auto-restart ignored:', e);
                    }
                }, 300);
            }
        };

        recognition.onresult = (event) => {
            if (isSpeaking) {
                console.log(' Ignorando udio pois Jota est falando...');
                return;
            }

            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            setTranscript(finalTranscript || interimTranscript);

            if (finalTranscript) {
                console.log(' Transcrio final:', finalTranscript);
                resetConversationTimeout();

                const lowerText = finalTranscript.toLowerCase();
                const exitPhrases = ['tchau', 'at logo', 'at mais', 'falou', 'obrigado tchau', 'valeu tchau'];

                if (exitPhrases.some(phrase => lowerText.includes(phrase))) {
                    console.log(' Saindo da conversa');
                    inConversationRef.current = false;
                    setMessages(prev => [...prev, { role: 'assistant', content: 'At mais! Se precisar,  s chamar.' }]);
                    setTranscript('');
                    return;
                }

                if (!inConversationRef.current) {
                    const wakeWords = ['jota', 'j ', ' j', 'joo', 'ajuda'];
                    const hasWakeWord = wakeWords.some(word => lowerText.includes(word));

                    if (hasWakeWord) {
                        console.log(' Wake word detectada - iniciando conversa');
                        inConversationRef.current = true;
                        const cleanText = finalTranscript.replace(/jota|j |joo/gi, '').trim();
                        if (cleanText) {
                            sendMessage(cleanText);
                        }
                    } else {
                        console.log(' Aguardando wake word (no em conversa)');
                    }
                } else {
                    console.log(' Em conversa ativa - processando:', finalTranscript);
                    sendMessage(finalTranscript);
                }

                setTranscript('');
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    useEffect(() => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        if (isListening && !isSpeaking && !isRecognitionActiveRef.current) {
            try {
                recognition.start();
            } catch (e) {
                console.log('Start ignored:', e);
            }
        } else if ((!isListening || isSpeaking) && isRecognitionActiveRef.current) {
            recognition.stop();
        }
    }, [isListening, isSpeaking]);

    const resetConversationTimeout = () => {
        if (conversationTimeoutRef.current) {
            clearTimeout(conversationTimeoutRef.current);
        }
        conversationTimeoutRef.current = setTimeout(() => {
            console.log(' Timeout - saindo da conversa');
            inConversationRef.current = false;
        }, 30000);
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        try {
            const response = await api.post('/jota/chat', {
                message: text,
                conversationHistory
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            const { text: aiResponse, audio, conversationHistory: newHistory, toolCallsData } = response.data;

            setConversationHistory(newHistory);

            if (toolCallsData && toolCallsData.length > 0) {
                setVisualData([toolCallsData[toolCallsData.length - 1]]);
            } else {
                setVisualData(null);
            }

            if (audio) {
                playAudio(audio);
            }

        } catch (error) {
            console.error('Error sending message:', error);
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
            if (isListening && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) { }
            }
        }
    };

    const toggleListening = () => {
        initAudioContext();

        if (!isListening && !hasGreetedRef.current) {
            hasGreetedRef.current = true;
            const greet = async () => {
                try {
                    const greetingText = "Fala chefe, j sei tudo sobre suas usinas, o que voc precisa?";

                    setMessages([{ role: 'assistant', content: greetingText }]);

                    const response = await api.post('/jota/chat', {
                        message: `Diga exatamente: "${greetingText}"`,
                        conversationHistory: []
                    }, {
                        headers: { Authorization: `Bearer ${getToken()}` }
                    });

                    const { audio, conversationHistory: newHistory } = response.data;
                    setConversationHistory(newHistory);

                    if (audio && audioContextRef.current) {
                        await audioContextRef.current.resume();
                        playAudio(audio);
                    }
                } catch (error) {
                    console.error('Error greeting:', error);
                }
            };

            greet();
        }

        setIsListening(prev => !prev);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-12">
            <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">JOTA</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Assistente Inteligente de Energia Solar</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isListening ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50 border-2 border-gray-200'}`}>
                                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                <span className={`text-sm font-semibold ${isListening ? 'text-green-700' : 'text-gray-600'}`}>
                                    {isListening ? 'Ouvindo' : 'Pausado'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transcript Display */}
                {transcript && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-xl">
                        <p className="text-blue-900 dark:text-blue-100 font-medium">{transcript}</p>
                    </div>
                )}

                {/* Visual Data Cards */}
                <div className="grid gap-6">
                    {visualData && visualData.length > 0 && visualData.map((item, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* System Status */}
                            {item.type === 'getSystemStatus' && (
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <TrendingUp className="h-6 w-6 text-blue-600" />
                                        Status do Sistema
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border-2 border-blue-200">
                                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Usinas Total</p>
                                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{item.data.stations.total}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border-2 border-green-200">
                                            <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">Online</p>
                                            <p className="text-3xl font-bold text-green-900 dark:text-green-100">{item.data.stations.online}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border-2 border-red-200">
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Offline</p>
                                            <p className="text-3xl font-bold text-red-900 dark:text-red-100">{item.data.stations.offline}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-xl border-2 border-yellow-200">
                                            <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-1">Tickets Abertos</p>
                                            <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{item.data.tickets.open}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Operational Panel */}
                            {item.type === 'getOperationalPanel' && (
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Activity className="h-6 w-6 text-purple-600" />
                                        Painel de Operao
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border-2 border-green-200">
                                            <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">Gerando</p>
                                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{item.data.summary.generating}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border-2 border-blue-200">
                                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Conectadas</p>
                                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{item.data.summary.connected}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border-2 border-red-200">
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Offline</p>
                                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{item.data.summary.offline}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl border-2 border-purple-200">
                                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Produo Total Atual</p>
                                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{item.data.summary.totalProduction} kW</p>
                                    </div>
                                </div>
                            )}

                            {/* Alerts */}
                            {item.type === 'getAlerts' && (
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                        Alertas Ativos
                                    </h3>
                                    {Array.isArray(item.data) && item.data.length > 0 ? (
                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {item.data.map((alert, i) => (
                                                <div key={i} className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4 rounded-xl hover:shadow-lg transition-shadow">
                                                    <p className="font-bold text-red-900 dark:text-red-100">{alert.alarmName || alert.title || 'Alerta'}</p>
                                                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{alert.stationName || alert.description || ''}</p>
                                                    {alert.alarmTime && (
                                                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{new Date(alert.alarmTime).toLocaleString('pt-BR')}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">Nenhum alerta ativo</p>
                                    )}
                                </div>
                            )}

                            {/* Offline Stations */}
                            {item.type === 'getOfflineStations' && (
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                        Usinas Offline
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Total: <span className="font-bold text-gray-900 dark:text-white">{item.data.count}</span> usinas</p>
                                    {Array.isArray(item.data.stations) && item.data.stations.length > 0 ? (
                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {item.data.stations.map((station, i) => (
                                                <div key={i} className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4 rounded-xl hover:shadow-lg transition-all hover:border-red-400">
                                                    <p className="font-bold text-red-900 dark:text-red-100">{station.name}</p>
                                                    <div className="flex gap-4 mt-2">
                                                        <p className="text-sm text-red-700 dark:text-red-300">Status: <span className="font-semibold">{station.status}</span></p>
                                                        {station.lastUpdate && (
                                                            <p className="text-sm text-red-600 dark:text-red-400">ltima atualizao: {station.lastUpdate}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">Nenhuma usina offline</p>
                                    )}
                                </div>
                            )}

                            {/* Customers */}
                            {item.type === 'getCustomers' && (
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Users className="h-6 w-6 text-blue-600" />
                                        Clientes
                                    </h3>
                                    {Array.isArray(item.data) && item.data.length > 0 ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {item.data.map((customer, i) => (
                                                <div key={i} className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                                    <p className="font-bold text-blue-900 dark:text-blue-100">{customer.name}</p>
                                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{customer.email}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">Nenhum cliente encontrado</p>
                                    )}
                                </div>
                            )}

                            {/* Station Details */}
                            {item.type === 'getStationDetails' && (
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Zap className="h-6 w-6 text-yellow-600" />
                                        Detalhes da Usina
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border-2 border-green-200">
                                            <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">Produo Atual</p>
                                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{item.data.realtime?.generationPower || 0} kW</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border-2 border-blue-200">
                                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Inversores</p>
                                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{item.data.devices?.length || 0}</p>
                                        </div>
                                    </div>

                                    {/* Inverter List */}
                                    {item.data.devices && item.data.devices.length > 0 && (
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <Zap className="h-5 w-5 text-blue-600" />
                                                Lista de Inversores
                                            </h4>
                                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                                {item.data.devices.map((device, i) => (
                                                    <div key={i} className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-blue-900 dark:text-blue-100">{device.deviceName || `Inversor ${i + 1}`}</p>
                                                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">SN: {device.deviceSn || 'N/A'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xl font-bold text-green-600 dark:text-green-400">{device.generationPower || 0} kW</p>
                                                                <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold mt-1 ${device.deviceState === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {device.deviceState === 1 ? 'Online' : 'Offline'}
                                                                </span>
                                                            </div>
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
                </div>

                {/* Microphone Button */}
                <div className="flex justify-center pt-6">
                    <button
                        onClick={toggleListening}
                        className={`group relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${isListening
                            ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-300'
                            : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-300'
                            } hover:scale-110 active:scale-95`}
                    >
                        {isListening ? (
                            <MicOff className="w-10 h-10 text-white" strokeWidth={2.5} />
                        ) : (
                            <Mic className="w-10 h-10 text-white" strokeWidth={2.5} />
                        )}
                        <div className={`absolute -bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${isListening ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                            {isListening ? 'Parar de ouvir' : 'Comear a ouvir'}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}


