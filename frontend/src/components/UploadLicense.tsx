import React, { useState } from 'react';
import axios from 'axios';

const UploadLicense = () => {
    const [id, setId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const isValidId = /^[68]\d{7}$/.test(id);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage(null);
        }
    };

    const handleUpload = async () => {
        if (!isValidId || !file) return;

        setLoading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('licenseId', id);

        try {
            await axios.post('http://localhost:5000/api/licenses/upload-new-license', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setMessage({ type: 'success', text: `License ${id} uploaded and indexed successfully!` });
            setFile(null);
            setId("");
            // Reset file input
            const fileInput = document.getElementById('new-license-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (err: any) {
            console.error(err);
            setMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to upload license.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 font-hebrew mb-4 border-b pb-2">
                הוספת רישיון חדש למערכת
            </h3>

            <div className="space-y-4">
                {/* ID Input */}
                <div>
                    <input
                        type="text"
                        value={id}
                        onChange={(e) => setId(e.target.value.trim())}
                        placeholder={`מספר מק"ט (8 ספרות)`}
                        className={`w-full px-4 py-2 border rounded-xl font-mono text-lg outline-none transition-all
                            ${id && !isValidId
                                ? 'border-red-300 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-200'
                                : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                            }`}
                    />
                    {id && !isValidId && (
                        <p className="text-red-500 text-xs mt-1 font-hebrew">
                            חייב להיות 8 ספרות ומתחיל ב-6 או 8
                        </p>
                    )}
                </div>

                {/* File Input */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 font-hebrew">
                        קובץ רישיון (PDF)
                    </label>
                    <input
                        id="new-license-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-bold
                            file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100
                            cursor-pointer"
                    />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleUpload}
                    disabled={!isValidId || !file || loading}
                    className={`w-full py-3 rounded-xl font-bold font-hebrew transition-all
                        ${!isValidId || !file || loading
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                        }`}
                >
                    {loading ? 'מעלה ומפענח...' : 'שמור במערכת'}
                </button>

                {/* Feedback */}
                {message && (
                    <div className={`p-3 rounded-xl text-center text-sm font-hebrew
                        ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadLicense;
