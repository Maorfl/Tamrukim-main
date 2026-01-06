import React, { useState } from 'react';
import axios from 'axios';

interface ScanResultRow {
    id: string; // 8 digit ID
    productName: string;
    cleanLicense: string;
    shortNotification: string;
    status: 'Available' | 'Missing';
}

const InvoiceProcessor = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // Basket State
    const [totalCollected, setTotalCollected] = useState(0);
    const [scanResults, setScanResults] = useState<ScanResultRow[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setStatusMessage("");
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setLoading(true);
        setError(null);
        setStatusMessage("Uploading and scanning...");

        const formData = new FormData();
        formData.append('invoice', file);

        try {
            const response = await axios.post('http://localhost:5000/api/process-invoice', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const data = response.data;
            if (data.success) {
                setTotalCollected(data.totalCollected);

                // Backend now returns the FULL accumulated list in 'scanResults'
                // So we replace the state entirely.
                setScanResults(data.scanResults);

                setStatusMessage(`Scan complete! Added ${data.newCount} items.`);
                setFile(null);

                // Reset input
                const fileInput = document.getElementById('invoice-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';

            } else {
                setError('Failed to process invoice.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAll = async () => {
        if (totalCollected === 0) return;

        try {
            setStatusMessage("Processing PDF merge...");
            const response = await axios.get('http://localhost:5000/api/download-all-collected', {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `merged_licenses_${Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            setStatusMessage("Download started!");
        } catch (err) {
            console.error(err);
            setError("Failed to download merged PDF.");
        }
    };

    const handleClearBasket = async () => {
        try {
            await axios.post('http://localhost:5000/api/clear-basket');
            setTotalCollected(0);
            setScanResults([]);
            setStatusMessage("Basket cleared.");
        } catch (err) {
            console.error(err);
            setError("Failed to clear basket.");
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 animate-fadeIn">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-8 border-b border-gray-100">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 font-hebrew">
                        מערכת הפקת רישיונות
                    </h2>
                    <p className="text-gray-500 mt-1 font-hebrew">
                        סריקת חשבוניות ופענוח נתונים (RTL Report)
                    </p>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="text-right">
                        <span className="block text-sm text-gray-500 font-hebrew">פריטים בסל</span>
                        <span className="block text-2xl font-bold text-indigo-600">{totalCollected}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Left Panel: Upload & Actions */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-3 font-hebrew">
                            העלאת חשבונית
                        </label>
                        <input
                            id="invoice-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-500
                            file:mr-2 file:py-2 file:px-6
                            file:rounded-full file:border-0
                            file:text-sm file:font-bold
                            file:bg-indigo-600 file:text-white
                            hover:file:bg-indigo-700
                            cursor-pointer
                            "
                        />

                        <button
                            onClick={handleUpload}
                            disabled={loading || !file}
                            className={`mt-4 w-full py-3 rounded-xl font-bold font-hebrew transition-all
                                ${loading || !file
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                        >
                            {loading ? 'מפענח...' : 'סרוק קובץ'}
                        </button>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleDownloadAll}
                            disabled={totalCollected === 0}
                            className="w-full py-3 rounded-xl font-bold font-hebrew bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                        >
                            הורד הכל (PDF)
                        </button>

                        <button
                            onClick={handleClearBasket}
                            disabled={totalCollected === 0}
                            className="w-full py-3 rounded-xl font-bold font-hebrew text-red-600 bg-red-50 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-300 transition-colors"
                        >
                            נקה הכל
                        </button>
                    </div>

                    {statusMessage && (
                        <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-sm text-center font-hebrew">
                            {statusMessage}
                        </div>
                    )}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-800 rounded-xl text-sm text-center font-hebrew border border-red-200">
                            {error}
                        </div>
                    )}
                </div>

                {/* Right Panel: Data Table */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 font-hebrew">
                            דוח סריקה (Live Results)
                        </h3>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-right" dir="rtl">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-sm font-bold text-gray-600 font-hebrew">מק"ט (ID)</th>
                                    <th className="px-4 py-3 text-sm font-bold text-gray-600 font-hebrew">שם תמרוק</th>
                                    <th className="px-4 py-3 text-sm font-bold text-gray-600 font-hebrew">מספר רישיון נקי</th>
                                    <th className="px-4 py-3 text-sm font-bold text-gray-600 font-hebrew">נוטיפיקציה</th>
                                    <th className="px-4 py-3 text-sm font-bold text-gray-600 font-hebrew">סטטוס</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {scanResults.length > 0 ? (
                                    scanResults.map((row, idx) => (
                                        <tr key={`${row.id}-${idx}`} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-indigo-600">{row.id}</td>
                                            <td className="px-4 py-3 text-sm text-gray-800 font-hebrew">{row.productName}</td>
                                            {/* Clean License: No Slashes */}
                                            <td className="px-4 py-3 text-sm font-mono text-gray-600">{!/^[68]\d{7}$/.test(row.cleanLicense) ? row.cleanLicense : ""}</td>
                                            {/* Short Notification: Last 4 */}
                                            <td className="px-4 py-3 text-sm font-mono text-gray-500 bg-gray-50/50">{/^[68]\d{7}$/.test(row.cleanLicense) ? row.shortNotification : ""}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {row.status === 'Available' ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
                                                        זמין
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">
                                                        חסר
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-gray-400 font-hebrew">
                                            אין נתונים להצגה. אנא סרוק חשבונית.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceProcessor;
