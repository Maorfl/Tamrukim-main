import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface HistoryProps {
    historyRenderKey: boolean;
}

interface HistoryEntry {
    _id: string;
    caseNumber: string;
    licenseIds: string[];
    fileName: string;
    createdAt: string;
}

const History = ({ historyRenderKey }: HistoryProps) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    useEffect(() => {
        fetchHistory();
    }, [historyRenderKey]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('http://localhost:5000/api/history');
            if (response.data.success) {
                setHistory(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            setError('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteTargetId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;

        try {
            await axios.delete(`http://localhost:5000/api/history/${deleteTargetId}`);
            setHistory(history.filter(entry => entry._id !== deleteTargetId));
            setShowDeleteModal(false);
            setDeleteTargetId(null);
        } catch (err) {
            console.error('Error deleting history entry:', err);
            setError('Failed to delete entry');
            setShowDeleteModal(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('he-IL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <>
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slideIn">
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2 font-hebrew">
                                אישור מחיקה
                            </h3>
                            <p className="text-gray-600 font-hebrew">
                                האם אתה בטוח שברצונך למחוק רשומה זו?
                                <br />
                                פעולה זו אינה ניתנת לביטול.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteTargetId(null);
                                }}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-hebrew hover:bg-gray-200 transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold font-hebrew hover:bg-red-700 transition-colors"
                            >
                                מחק
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-8 border-b border-gray-100">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 font-hebrew">
                        היסטוריית מיזוגים
                    </h2>
                    <p className="text-gray-500 mt-1 font-hebrew">
                        רשימת כל המיזוגים שבוצעו
                    </p>
                </div>
                <button
                    onClick={fetchHistory}
                    className="mt-4 md:mt-0 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-hebrew"
                >
                    רענן
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-hebrew" dir="rtl">
                    {error}
                </div>
            )}

            {/* History List */}
            <div className="space-y-4">
                {history.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 font-hebrew">
                        אין היסטוריה להצגה
                    </div>
                ) : (
                    history.map((entry) => (
                        <div
                            key={entry._id}
                            className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow"
                            dir="rtl"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <h3 className="text-xl font-bold text-indigo-600 font-hebrew">
                                            תיק מספר: {entry.caseNumber}
                                        </h3>
                                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
                                            {entry.licenseIds.length} רישיונות
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 font-hebrew mb-2">
                                        {entry.fileName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatDate(entry.createdAt)}
                                    </p>
                                    
                                    {/* License IDs Preview */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {entry.licenseIds.slice(0, 10).map((id, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-white rounded text-xs font-mono text-gray-700 border border-gray-200"
                                            >
                                                {id}
                                            </span>
                                        ))}
                                        {entry.licenseIds.length > 10 && (
                                            <span className="px-2 py-1 text-xs text-gray-500">
                                                +{entry.licenseIds.length - 10} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(entry._id)}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-hebrew flex-shrink-0"
                                >
                                    מחק
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
        </>
    );
};

export default History;
