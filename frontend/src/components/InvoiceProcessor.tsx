import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface ScanResultRow {
    id: string; // 8 digit ID
    productName: string;
    cleanLicense: string;
    shortNotification: string;
    status: 'Available' | 'Missing';
}

interface FileBatch {
    fileName: string;
    timestamp: Date;
    results: ScanResultRow[];
}

interface InvoiceProcessorProps {
    licenseIdsToLoad?: string[];
    onLoadComplete?: () => void;
    caseNumberToLoad?: string;
}

const InvoiceProcessor = ({ licenseIdsToLoad = [], onLoadComplete, caseNumberToLoad }: InvoiceProcessorProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Basket State - Initialize from sessionStorage
    const [totalCollected, setTotalCollected] = useState(() => {
        const saved = sessionStorage.getItem('totalCollected');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [scanResults, setScanResults] = useState<ScanResultRow[]>(() => {
        const saved = sessionStorage.getItem('scanResults');
        return saved ? JSON.parse(saved) : [];
    });
    const [fileBatches, setFileBatches] = useState<FileBatch[]>(() => {
        const saved = sessionStorage.getItem('fileBatches');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Convert timestamp strings back to Date objects
            return parsed.map((batch: any) => ({
                ...batch,
                timestamp: new Date(batch.timestamp)
            }));
        }
        return [];
    });

    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>("");
    
    // Modal states
    const [showCaseModal, setShowCaseModal] = useState(false);
    const [caseNumber, setCaseNumber] = useState('');

    // Save to sessionStorage whenever data changes
    useEffect(() => {
        sessionStorage.setItem('totalCollected', totalCollected.toString());
    }, [totalCollected]);

    useEffect(() => {
        sessionStorage.setItem('scanResults', JSON.stringify(scanResults));
    }, [scanResults]);

    useEffect(() => {
        sessionStorage.setItem('fileBatches', JSON.stringify(fileBatches));
    }, [fileBatches]);

    const loadLicensesToBasket = useCallback(async (licenseIds: string[]) => {
        try {
            setLoading(true);
            setStatusMessage("Loading licenses from history...");

            const response = await axios.post('http://localhost:5000/api/load-licenses', {
                licenseIds
            });

            if (response.data.success) {
                setTotalCollected(response.data.totalCollected);
                setScanResults(response.data.scanResults);

                // Create a single batch for the loaded history
                const newBatch: FileBatch = {
                    fileName: `Loaded from History (${caseNumberToLoad})`,
                    timestamp: new Date(),
                    results: response.data.scanResults
                };

                setFileBatches([newBatch]);
                setStatusMessage(`Loaded ${licenseIds.length} licenses from history!`);
            }

            if (onLoadComplete) {
                onLoadComplete();
            }
        } catch (err) {
            console.error('Error loading licenses:', err);
            setError('Failed to load licenses from history');
        } finally {
            setLoading(false);
        }
    }, [onLoadComplete, caseNumberToLoad]);

    // Load licenses when licenseIdsToLoad changes
    useEffect(() => {
        if (licenseIdsToLoad && licenseIdsToLoad.length > 0) {
            loadLicensesToBasket(licenseIdsToLoad);
        }
    }, [licenseIdsToLoad, loadLicensesToBasket]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setStatusMessage("");
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            if (files[0].type === 'application/pdf') {
                setFile(files[0]);
                setError(null);
                setStatusMessage("");
            } else {
                setError('Please drop a PDF file only.');
            }
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

        const currentFileName = file.name;
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

                // Create a new batch for this file with only the new results
                const newResults = data.scanResults.slice(-data.newCount);
                const newBatch: FileBatch = {
                    fileName: currentFileName,
                    timestamp: new Date(),
                    results: newResults
                };

                setFileBatches(prev => [...prev, newBatch]);

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

        // Show modal instead of window.prompt
        setShowCaseModal(true);
    };

    const handleCaseModalSubmit = async () => {
        if (!caseNumber || caseNumber.trim() === '') {
            setError('Case number is required to download.');
            return;
        }

        setShowCaseModal(false);

        try {
            setStatusMessage("Processing PDF merge...");
            const response = await axios.get('http://localhost:5000/api/download-all-collected', {
                params: { caseNumber: caseNumber.trim() },
                responseType: 'blob'
            });

            const fileName = `merged_licenses_${caseNumber}_${Date.now()}.pdf`;
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            // Get file path from response headers
            const filePath = response.headers['x-file-path'] || '';

            // Save to history
            const licenseIds = Array.from(scanResults.map(r => r.id));
            await axios.post('http://localhost:5000/api/history', {
                caseNumber: caseNumber.trim(),
                licenseIds,
                fileName,
                filePath
            });

            setStatusMessage("Download started and saved to history!");
            setCaseNumber(''); // Clear case number after successful download
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
            setFileBatches([]);
            setStatusMessage("Basket cleared.");
        } catch (err) {
            console.error(err);
            setError("Failed to clear basket.");
        }
    };

    return (
        <>
            {/* Case Number Modal */}
            {showCaseModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slideIn">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4 font-hebrew text-center">
                            הזן מספר תיק
                        </h3>
                        <p className="text-gray-600 mb-6 font-hebrew text-center">
                            נדרש מספר תיק לשמירת המיזוג בהיסטוריה
                        </p>
                        <input
                            type="text"
                            value={caseNumber}
                            onChange={(e) => setCaseNumber(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCaseModalSubmit()}
                            placeholder="מספר תיק..."
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none text-center text-lg font-semibold"
                            autoFocus
                            dir="rtl"
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCaseModal(false);
                                    setCaseNumber('');
                                }}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-hebrew hover:bg-gray-200 transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleCaseModalSubmit}
                                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold font-hebrew hover:bg-indigo-700 transition-colors"
                            >
                                אישור
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto p-6 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 animate-fadeIn">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 pb-2 border-b border-gray-100">
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
                        
                        {/* Drag and Drop Zone */}
                        <div
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('invoice-upload')?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                                isDragging 
                                    ? 'border-indigo-500 bg-indigo-50' 
                                    : 'border-gray-300 bg-white hover:border-indigo-400'
                            }`}
                        >
                            <div className="space-y-2">
                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <p className="text-sm text-gray-600 font-hebrew">
                                    {file ? file.name : 'גרור קובץ PDF או לחץ לבחירה'}
                                </p>
                            </div>
                        </div>

                        <input
                            id="invoice-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
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
                <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
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
                                    <th className="px-4 py-3 text-sm font-bold text-gray-600 font-hebrew">מספר רישיון</th>
                                    <th className="px-4 py-3 text-sm font-bold text-gray-600 font-hebrew">נוטיפיקציה</th>
                                    <th className="px-4 py-3 text-sm font-bold text-gray-600 font-hebrew">סטטוס</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fileBatches.length > 0 ? (
                                    fileBatches.map((batch, batchIdx) => (
                                        <React.Fragment key={batchIdx}>
                                            {/* File Separator Header */}
                                            <tr className="bg-indigo-50 border-t-2 border-b-2 border-indigo-200">
                                                <td colSpan={5} className="px-4">
                                                    <div className="flex items-center gap-3">
                                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="font-bold text-indigo-800 text-sm font-hebrew">
                                                            {batch.fileName}
                                                        </span>
                                                        <span className="text-xs text-indigo-600">
                                                            ({batch.results.length} פריטים)
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {batch.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Results for this file */}
                                            {batch.results.map((row, idx) => (
                                                <tr key={`${batchIdx}-${row.id}-${idx}`} className="hover:bg-indigo-50/30 transition-colors border-b border-gray-100">
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
                                            ))}
                                        </React.Fragment>
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
        </>
    );
};

export default InvoiceProcessor;
