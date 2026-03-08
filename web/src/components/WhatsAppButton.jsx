import React from 'react';
import Swal from 'sweetalert2';
import { Send } from 'lucide-react';
import { tickets } from '../lib/api';

export function WhatsAppButton({ ticket, onSent, className }) {
    const handleSend = async () => {
        const phone = ticket.customer?.phone || ticket.non_customer_phone;
        if (!phone) return Swal.fire('Erro', 'Telefone não disponível', 'error');

        const { value: message } = await Swal.fire({
            title: 'Enviar WhatsApp',
            input: 'textarea',
            inputLabel: 'Mensagem',
            inputValue: `Olá ${ticket.customer?.full_name || ticket.non_customer_name}, referente ao chamado #${ticket.ticket_number}...`,
            showCancelButton: true
        });

        if (message) {
            try {
                await tickets.sendWhatsApp(ticket.id, { phone, message });
                Swal.fire('Sucesso', 'Mensagem enviada!', 'success');
                if (onSent) onSent();
            } catch (error) {
                console.error(error);
                Swal.fire('Erro', 'Falha ao enviar mensagem.', 'error');
            }
        }
    };

    return (
        <button
            onClick={handleSend}
            className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 ${className || ''}`}
        >
            <Send className="h-4 w-4" />
            Enviar WhatsApp
        </button>
    );
}
