import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function SuperJota() {
    const navigate = useNavigate();
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastMessage, setLastMessage] = useState('');
    const [lastNotificationCheck, setLastNotificationCheck] = useState(new Date().toISOString());

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioRef = useRef(new Audio());
    const canvasRef = useRef(null);

    // Matrix rain effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        const matrix = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#0F0';
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = matrix[Math.floor(Math.random() * matrix.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        const interval = setInterval(draw, 33);

        return () => clearInterval(interval);
    }, []);

    // Welcome message
    useEffect(() => {
        const welcomeMsg = 'Olá, sou o Super Jota. Estou monitorando o sistema.';
        setLastMessage(welcomeMsg);
        speakText(welcomeMsg);
    }, []);

    // Monitor for new tickets
    useEffect(() => {
        const checkNotifications = async () => {
            try {
                const response = await api.get('/super-jota/notifications', {
                    params: { since: lastNotificationCheck }
                });

                const { notifications, timestamp } = response.data;

                if (notifications && notifications.length > 0) {
                    for (const notification of notifications) {
                        if (notification.type === 'new_ticket') {
                            setLastMessage(notification.message);
                            await speakText(notification.message);
                        }
                    }
                }

                setLastNotificationCheck(timestamp);
            } catch (error) {
                console.error('Error checking notifications:', error);
            }
        };

        const interval = setInterval(checkNotifications, 10000);
        checkNotifications();

        return () => clearInterval(interval);
    }, [lastNotificationCheck]);

    // Start voice recording
    const startListening = async () => {
        try {
            console.log('🎤 Starting voice recording...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ Microphone access granted');

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                console.log('📦 Audio chunk received:', event.data.size, 'bytes');
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                console.log('⏹️ Recording stopped. Total chunks:', audioChunksRef.current.length);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log('🎵 Audio blob created:', audioBlob.size, 'bytes');
                await processAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsListening(true);
            console.log('🔴 Recording started');
        } catch (error) {
            console.error('❌ Error starting recording:', error);
            setLastMessage('Erro ao acessar o microfone');
        }
    };

    // Stop voice recording
    const stopListening = () => {
        console.log('🛑 Stopping recording...');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    // Process recorded audio
    const processAudio = async (audioBlob) => {
        try {
            console.log('🔄 Processing audio blob...');
            setLastMessage('Processando áudio...');

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            console.log('📤 Sending audio to transcription API...');

            const transcribeResponse = await api.post('/super-jota/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log('✅ Transcription received:', transcribeResponse.data);
            const userText = transcribeResponse.data.text;
            setTranscript(userText);
            setLastMessage(`Você disse: "${userText}"`);
            console.log('💬 User said:', userText);

            console.log('🤖 Sending to chat API...');
            const chatResponse = await api.post('/super-jota/chat', {
                messages: [{ role: 'user', content: userText }]
            });

            console.log('✅ Chat response received:', chatResponse.data);
            const responseText = chatResponse.data.message;
            setLastMessage(responseText);
            console.log('💬 Assistant response:', responseText);

            await speakText(responseText);

        } catch (error) {
            console.error('❌ Error processing audio:', error);
            console.error('Error details:', error.response?.data);

            let errorMsg = 'Desculpe, tive um problema ao processar sua mensagem.';

            if (error.response?.status === 401) {
                errorMsg = 'API key da OpenAI não configurada. Verifique o arquivo .env';
            } else if (error.response?.data?.error) {
                errorMsg = `Erro: ${error.response.data.error}`;
            }

            setLastMessage(errorMsg);
            await speakText(errorMsg);
        }
    };

    // Speak text using OpenAI TTS
    const speakText = async (text) => {
        try {
            console.log('🔊 Speaking text:', text);
            setIsSpeaking(true);

            const response = await api.post('/super-jota/speak', { text }, {
                responseType: 'blob'
            });

            console.log('✅ Audio received from TTS');
            const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Stop any currently playing audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            audioRef.current.src = audioUrl;
            audioRef.current.onended = () => {
                console.log('✅ Finished speaking');
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };

            await audioRef.current.play();
            console.log('▶️ Playing audio');
        } catch (error) {
            console.error('❌ Error speaking text:', error);
            setIsSpeaking(false);
        }
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Matrix Rain Background */}
            <canvas ref={canvasRef} className="absolute inset-0" />

            {/* Back Button */}
            <button
                onClick={() => navigate('/ai-vision')}
                className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors backdrop-blur-sm"
            >
                <ArrowLeft className="h-5 w-5" />
                Voltar
            </button>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
                {/* Speaking Orb */}
                <div className="relative">
                    <motion.div
                        animate={{
                            scale: isSpeaking ? [1, 1.2, 1] : isListening ? [1, 1.1, 1] : 1,
                            opacity: isSpeaking || isListening ? [0.8, 1, 0.8] : 1
                        }}
                        transition={{
                            duration: isSpeaking ? 0.5 : isListening ? 1 : 0,
                            repeat: (isSpeaking || isListening) ? Infinity : 0,
                            ease: "easeInOut"
                        }}
                        className="relative"
                    >
                        {/* Outer glow */}
                        <div className="absolute inset-0 rounded-full bg-green-500 blur-3xl opacity-50" style={{ width: '300px', height: '300px', margin: '-50px' }} />

                        {/* Main orb */}
                        <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl shadow-green-500/50 flex items-center justify-center">
                            {/* Inner pulse */}
                            <motion.div
                                animate={{
                                    scale: isSpeaking ? [1, 1.5, 1] : [1, 1.2, 1],
                                    opacity: [0.5, 0.8, 0.5]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="absolute inset-0 rounded-full bg-green-300 opacity-30"
                            />

                            {/* Center dot */}
                            <div className="relative z-10 w-16 h-16 rounded-full bg-white shadow-lg" />
                        </div>
                    </motion.div>
                </div>

                {/* Message Display */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 max-w-2xl text-center px-6"
                >
                    <p className="text-2xl font-mono text-green-400 mb-4">
                        {lastMessage}
                    </p>
                    {transcript && (
                        <p className="text-sm font-mono text-green-600">
                            Você disse: "{transcript}"
                        </p>
                    )}
                </motion.div>

                {/* Microphone Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isListening ? stopListening : startListening}
                    className={`mt-12 w-20 h-20 rounded-full flex items-center justify-center transition-all border-2 ${isListening
                        ? 'bg-red-500/20 border-red-500 shadow-lg shadow-red-500/50'
                        : 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/50'
                        }`}
                >
                    {isListening ? (
                        <MicOff className="h-8 w-8 text-red-400" />
                    ) : (
                        <Mic className="h-8 w-8 text-green-400" />
                    )}
                </motion.button>

                {/* Status Text */}
                <p className="mt-6 text-sm font-mono text-green-600">
                    {isListening ? 'OUVINDO...' : isSpeaking ? 'FALANDO...' : 'CLIQUE NO MICROFONE PARA FALAR'}
                </p>
            </div>
        </div>
    );
}
