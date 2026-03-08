import React, { useState, useEffect } from 'react';
import { tickets } from '../lib/api';
import { X, Plus, Trash2, GripVertical, Save, Edit2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { motion, Reorder } from 'framer-motion';

export function ColumnManager({ onClose, onUpdate }) {
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [newColumn, setNewColumn] = useState({ title: '', color: 'bg-gray-50 border-gray-200' });

    const COLORS = [
        { label: 'Cinza', value: 'bg-gray-50 border-gray-200' },
        { label: 'Azul', value: 'bg-blue-50 border-blue-200' },
        { label: 'Verde', value: 'bg-green-50 border-green-200' },
        { label: 'Amarelo', value: 'bg-yellow-50 border-yellow-200' },
        { label: 'Vermelho', value: 'bg-red-50 border-red-200' },
        { label: 'Roxo', value: 'bg-purple-50 border-purple-200' },
        { label: 'Laranja', value: 'bg-orange-50 border-orange-200' },
        { label: 'Indigo', value: 'bg-indigo-50 border-indigo-200' },
        { label: 'Rosa', value: 'bg-pink-50 border-pink-200' },
    ];

    useEffect(() => {
        loadColumns();
    }, []);

    const loadColumns = async () => {
        try {
            const data = await tickets.getColumns();
            setColumns(data);
        } catch (error) {
            console.error('Error loading columns:', error);
            Swal.fire('Erro', 'Falha ao carregar colunas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newColumn.title) return;

        try {
            // Generate a status key from title
            const statusKey = newColumn.title
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                .replace(/[^a-z0-9]/g, '_'); // Replace non-alphanumeric with underscore

            await tickets.createColumn({
                ...newColumn,
                status_key: statusKey,
                order_index: columns.length
            });

            setNewColumn({ title: '', color: 'bg-gray-50 border-gray-200' });
            loadColumns();
            onUpdate();
        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Falha ao criar coluna', 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            const result = await Swal.fire({
                title: 'Tem certeza?',
                text: "Você não poderá reverter isso! Certifique-se de que não há chamados nesta coluna.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, deletar!'
            });

            if (result.isConfirmed) {
                await tickets.deleteColumn(id);
                loadColumns();
                onUpdate();
                Swal.fire('Deletado!', 'A coluna foi removida.', 'success');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Erro', error.response?.data?.error || 'Falha ao deletar coluna', 'error');
        }
    };

    const handleReorder = async (newOrder) => {
        setColumns(newOrder);
        // In a real app, you'd debounce this API call
        // For now, we'll just update locally and maybe save on close or separate button
        // But to keep it simple, let's update each one (inefficient but works for few items)
        try {
            for (let i = 0; i < newOrder.length; i++) {
                if (newOrder[i].order_index !== i) {
                    await tickets.updateColumn(newOrder[i].id, { ...newOrder[i], order_index: i });
                }
            }
            onUpdate();
        } catch (error) {
            console.error('Error reordering:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="w-96 bg-white h-full shadow-xl p-6 flex flex-col"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Gerenciar Colunas</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Create New */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Nova Coluna</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Título da coluna"
                            value={newColumn.title}
                            onChange={(e) => setNewColumn({ ...newColumn, title: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded text-sm text-gray-900 bg-white placeholder-gray-500"
                        />
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => setNewColumn({ ...newColumn, color: c.value })}
                                    className={`w-6 h-6 rounded-full border ${c.value.split(' ')[0]} ${newColumn.color === c.value ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                                    title={c.label}
                                />
                            ))}
                        </div>
                        <button
                            onClick={handleCreate}
                            disabled={!newColumn.title}
                            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            Adicionar Coluna
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    <Reorder.Group axis="y" values={columns} onReorder={handleReorder} className="space-y-2">
                        {columns.map((col) => (
                            <Reorder.Item key={col.id} value={col}>
                                <div className={`p-3 rounded-lg border flex items-center gap-3 bg-white ${col.color}`}>
                                    <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{col.title}</p>
                                        <p className="text-xs text-gray-500 font-mono">{col.status_key}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(col.id)}
                                        className="p-1.5 hover:bg-red-100 rounded text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                </div>
            </motion.div>
        </div>
    );
}
