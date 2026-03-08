import React from 'react';
import { Plus, Trash2, Check, Edit2, Loader2, Phone, Mail, User } from 'lucide-react';
import { api } from '../lib/api';

const ContactList = ({ contacts, onChange, customerId }) => {

    const handleAdd = () => {
        onChange([
            ...contacts,
            { name: '', phone: '', email: '', phone_verified_at: null, email_verified_at: null }
        ]);
    };

    const handleRemove = (index) => {
        const newContacts = [...contacts];
        newContacts.splice(index, 1);
        onChange(newContacts);
    };

    const handleChange = (index, field, value) => {
        const newContacts = [...contacts];
        newContacts[index] = { ...newContacts[index], [field]: value };
        onChange(newContacts);
    };

    const handleVerify = async (index, type) => {
        // type: 'phone' | 'email'
        const contact = contacts[index];
        const timestampField = `${type}_verified_at`;
        const action = 'confirm'; // We are confirming

        if (contact.id && customerId) {
            // Existing contact, call API
            try {
                // Update UI optimistically or show loading?
                // For now, optimistic update + API call
                const now = new Date().toISOString();
                const newContacts = [...contacts];
                newContacts[index] = { ...newContacts[index], [timestampField]: now };
                onChange(newContacts);

                await api.patch(`/customers/${customerId}/contacts/${contact.id}/verify`, {
                    field: type,
                    action: action
                });
            } catch (error) {
                console.error('Error verifying contact:', error);
                // Revert? For now, keep simple.
            }
        } else {
            // New contact, just local state
            const now = new Date().toISOString();
            const newContacts = [...contacts];
            newContacts[index] = { ...newContacts[index], [timestampField]: now };
            onChange(newContacts);
        }
    };

    const handleCorrect = (index, type) => {
        // Focus the input
        const inputId = `contact-${index}-${type}`;
        const el = document.getElementById(inputId);
        if (el) el.focus();
        // Optionally, we could clear the verification status to force re-verification?
        // User said: "Sempre que for confirmado ou corrigido, aparecer a data da última Atualização"
        // If "Corrigir" just focuses, the user edits. 
        // Logic: "Corrigir" -> User changes value -> "Confirmar" again?
        // Or does "Corrigir" implies I check it and it's wrong, so I fix it and it's now correct?
        // Let's assume "Corrigir" just enables editing focus. The user must click Confirm to stamp the date.
        // OR, "Corrigir" button itself updates the date if used to save a change?
        // Let's implement visual "Confirm" button updates the date. 
        // "Correct" button simply focuses the field for editing.
    };

    const formatDate = (isoString) => {
        if (!isoString) return null;
        return new Date(isoString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4">
            {contacts.map((contact, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative group shadow-sm">
                    <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover contato"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-8">
                        {/* Name */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                <User className="h-3 w-3" /> Nome
                            </label>
                            <input
                                type="text"
                                value={contact.name}
                                onChange={(e) => handleChange(index, 'name', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nome do contato"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Telefone
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        id={`contact-${index}-phone`}
                                        type="text"
                                        value={contact.phone}
                                        onChange={(e) => handleChange(index, 'phone', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleVerify(index, 'phone')}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200 bg-white dark:bg-gray-800 shadow-sm"
                                        title="Confirmar"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCorrect(index, 'phone')}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 bg-white dark:bg-gray-800 shadow-sm"
                                        title="Corrigir"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {contact.phone_verified_at && (
                                <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1 font-medium">
                                    <Check className="h-3 w-3" /> Atualizado em: {formatDate(contact.phone_verified_at)}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> Email
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        id={`contact-${index}-email`}
                                        type="email"
                                        value={contact.email}
                                        onChange={(e) => handleChange(index, 'email', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleVerify(index, 'email')}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200 bg-white dark:bg-gray-800 shadow-sm"
                                        title="Confirmar"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCorrect(index, 'email')}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 bg-white dark:bg-gray-800 shadow-sm"
                                        title="Corrigir"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {contact.email_verified_at && (
                                <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Atualizado em: {formatDate(contact.email_verified_at)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1"
            >
                <Plus className="h-4 w-4" />
                Adicionar Contato
            </button>
        </div>
    );
};

export default ContactList;
