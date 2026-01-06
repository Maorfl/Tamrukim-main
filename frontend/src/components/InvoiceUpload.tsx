import React, { useState } from 'react';
import axios from 'axios';

const InvoiceUpload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [numbers, setNumbers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setNumbers([]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setLoading(true);
        setError(null);
        setNumbers([]);

        const formData = new FormData();
        formData.append('invoice', file);

        try {
            // Assuming backend is running on port 5000 based on standard setup
            const response = await axios.post('http://localhost:5000/api/process-invoice', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                setNumbers(response.data.numbers);
                if (response.data.numbers.length === 0) {
                    setError('No numbers found in the document.');
                }
            } else {
                setError('Failed to process invoice.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'An error occurred while uploading/processing.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Scan Invoice for Material Numbers</h2>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Scan (PDF)
                </label>
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100
          "
                />
            </div>

            <button
                onClick={handleUpload}
                disabled={loading || !file}
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors
          ${loading || !file
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
            >
                {loading ? 'Processing...' : 'Extract Numbers'}
            </button>

            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {error}
                </div>
            )}

            {numbers.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Extracted Numbers ({numbers.length})</h3>
                    <ul className="bg-gray-50 p-4 rounded-lg border border-gray-100 max-h-60 overflow-y-auto">
                        {numbers.map((num, idx) => (
                            <li key={idx} className="font-mono text-gray-700 py-1 border-b border-gray-200 last:border-0">
                                {num}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default InvoiceUpload;
