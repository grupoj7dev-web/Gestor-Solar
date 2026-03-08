import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { ParticleAnimation } from './ParticleAnimation';
import { api } from '../lib/api';
import { useNotification } from '../contexts/NotificationContext';

export function SuperJotaModal({ isOpen, onClose }) {
    const { error: notifyError } = useNotification();
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState([]);
    const [transcript, setTranscript] = useState('');
    const [lastNotificationCheck, setLastNotificationCheck] = useState(new Date().toISOString());

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioRef = useRef(new Audio());
    const notificationIntervalRef = useRef(null);

    // Initialize with welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcomeMessage = {
                role: 'assistant',
                content: 'Ol! Sou o Super Jota, seu assistente de voz. Como posso ajudar voc hoje?'
            };
            setMessages([welcomeMessage]);
            speakText(welcomeMessage.content);
        }
    }, [isOpen]);

    // Monitor for notifications
    useEffect(() => {
        if (!isOpen) return;

        const checkNotifications = async () => {
            try {
                const response = await api.get('/super-jota/notifications', {
                    params: { since: lastNotificationCheck }
                });

                const { notifications, timestamp } = response.data;

                if (notifications && notifications.length > 0) {
                    for (const notification of notifications) {
                        // Add notification as assistant message
                        const notificationMessage = {
                            role: 'assistant',
                            content: notification.message,
                            type: notification.type,
                            data: notification.data
                        };

                        setMessages(prev => [...prev, notificationMessage]);

                        // Speak the notification
                        await speakText(notification.message);
                    }
                }

                setLastNotificationCheck(timestamp);
            } catch (error) {
                console.error('Error checking notifications:', error);
            }
        };

        // Check every 10 seconds
        notificationIntervalRef.current = setInterval(checkNotifications, 10000);
        checkNotifications(); // Initial check

        return () => {
            if (notificationIntervalRef.current) {
                clearInterval(notificationIntervalRef.current);
            }
        };
    }, [isOpen, lastNotificationCheck]);

    // Start voice recording
    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processAudio(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsListening(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            notifyError('Erro ao acessar o microfone. Verifique as permissoes.');
        }
    };

    // Stop voice recording
    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    // Process recorded audio
    const processAudio = async (audioBlob) => {
        try {
            // Transcribe audio using Whisper
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const transcribeResponse = await api.post('/super-jota/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const userText = transcribeResponse.data.text;
            setTranscript(userText);

            // Add user message
            const userMessage = { role: 'user', content: userText };
            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);

            // Get AI response
            const chatResponse = await api.post('/super-jota/chat', {
                messages: updatedMessages
            });

            const assistantMessage = {
                role: 'assistant',
                content: chatResponse.data.message,
                functionCalled: chatResponse.data.functionCalled,
                functionResult: chatResponse.data.functionResult
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Speak the response
            await speakText(assistantMessage.content);

        } catch (error) {
            console.error('Error processing audio:', error);
            const errorMessage = {
                role: 'assistant',
                content: 'Desculpe, tive um problema ao processar sua mensagem. Pode repetir?'
            };
            setMessages(prev => [...prev, errorMessage]);
            await speakText(errorMessage.content);
        }
    };

    // Speak text using OpenAI TTS
    const speakText = async (text) => {
        try {
            setIsSpeaking(true);

            const response = await api.post('/super-jota/speak', { text }, {
                responseType: 'blob'
            });

            const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);

            audioRef.current.src = audioUrl;
            audioRef.current.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };

            await audioRef.current.play();
        } catch (error) {
            console.error('Error speaking text:', error);
            setIsSpeaking(false);
        }
    };

    // Stop speaking
    const stopSpeaking = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsSpeaking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Particle Background */}
                    <ParticleAnimation isListening={isListening} />

                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                    <span className="text-2xl"></span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Super Jota</h2>
                                    <p className="text-sm text-gray-300">Assistente de Voz Inteligente</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((message, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[70%] p-4 rounded-2xl ${message.role === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white/10 text-white backdrop-blur-sm'
                                            }`}
                                    >
                                        <p className="text-sm">{message.content}</p>
                                        {message.functionCalled && (
                                            <p className="text-xs mt-2 opacity-70">
                                                Ao executada: {message.functionCalled}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="p-6 border-t border-white/10">
                            <div className="flex items-center justify-center gap-4">
                                {/* Microphone Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={isListening ? stopListening : startListening}
                                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening
                                            ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse'
                                            : 'bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/50'
                                        }`}
                                >
                                    {isListening ? (
                                        <MicOff className="h-8 w-8 text-white" />
                                    ) : (
                                        <Mic className="h-8 w-8 text-white" />
                                    )}
                                </motion.button>

                                {/* Speaker Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={isSpeaking ? stopSpeaking : null}
                                    disabled={!isSpeaking}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isSpeaking
                                            ? 'bg-green-500 shadow-lg shadow-green-500/50'
                                            : 'bg-white/10'
                                        }`}
                                >
                                    {isSpeaking ? (
                                        <Volume2 className="h-6 w-6 text-white animate-pulse" />
                                    ) : (
                                        <VolumeX className="h-6 w-6 text-white/50" />
                                    )}
                                </motion.button>
                            </div>

                            {/* Status Text */}
                            <div className="mt-4 text-center">
                                <p className="text-sm text-white/70">
                                    {isListening
                                        ? 'Ouvindo...'
                                        : isSpeaking
                                            ? 'Falando...'
                                            : 'Clique no microfone para falar'}
                                </p>
                                {transcript && (
                                    <p className="text-xs text-white/50 mt-1">
                                        ltima transcrio: "{transcript}"
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}


