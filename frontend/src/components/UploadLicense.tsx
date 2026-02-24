import React, { useState } from 'react';
import axios from 'axios';
import { licenseAPI } from '../services/api';

interface ConfirmModalProps {
    isOpen: boolean;
    licenseId: string;
    productName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, licenseId, productName, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scaleIn" dir="rtl">
                {/* Warning Icon */}
                <div className="flex justify-center mb-4">
                    <div className="bg-amber-100 rounded-full p-4">
                        <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-4 font-hebrew">
                    רישיון קיים במערכת
                </h3>

                {/* Content */}
                <div className="space-y-3 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 font-hebrew mb-1">מספר רישיון:</p>
                        <p className="text-xl font-bold font-mono text-indigo-600">{licenseId}</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 font-hebrew mb-1">שם המוצר הנוכחי:</p>
                        <p className="text-lg font-semibold text-gray-900 font-hebrew">{productName}</p>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <p className="text-sm text-amber-800 font-hebrew flex items-start gap-2">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>העלאת הקובץ תחליף את הרישיון הקיים במערכת</span>
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold font-hebrew hover:bg-gray-200 transition-all"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold font-hebrew hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-orange-200 transition-all"
                    >
                        החלף רישיון
                    </button>
                </div>
            </div>
        </div>
    );
};

const UploadLicense = () => {
    const [id, setId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [existingLicenseData, setExistingLicenseData] = useState<{ id: string; productName: string } | null>(null);

    const isValidId = /^[68]\d{7}$/.test(id);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage(null);
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
                setMessage(null);
            } else {
                setMessage({ type: 'error', text: 'נא לבחור קובץ PDF בלבד' });
            }
        }
    };

    const handleUpload = async () => {
        if (!isValidId || !file) return;

        setLoading(true);
        setMessage(null);

        try {
            // Check if license already exists
            const checkResponse = await licenseAPI.checkExists(id);

            if (checkResponse.exists) {
                const productName = checkResponse.data?.productName || 'לא ידוע';
                setExistingLicenseData({ id, productName });
                setShowConfirmModal(true);
                setLoading(false);
                return;
            }

            // Proceed with upload (new license)
            await performUpload(false);

        } catch (err: any) {
            console.error(err);
            setMessage({
                type: 'error',
                text: err.response?.data?.error || 'שגיאה בהעלאת הרישיון.'
            });
            setLoading(false);
        }
    };

    const performUpload = async (isUpdate: boolean) => {
        try {
            const formData = new FormData();
            formData.append('pdf', file!);
            formData.append('licenseId', id);

            await axios.post('http://localhost:5000/api/licenses/upload-new-license', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setMessage({ 
                type: 'success', 
                text: isUpdate 
                    ? `רישיון ${id} עודכן בהצלחה!` 
                    : `רישיון ${id} נוסף בהצלחה!`
            });
            setFile(null);
            setId("");
            // Reset file input
            const fileInput = document.getElementById('new-license-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (err: any) {
            console.error(err);
            setMessage({
                type: 'error',
                text: err.response?.data?.error || 'שגיאה בהעלאת הרישיון.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReplace = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        await performUpload(true);
    };

    const handleCancelReplace = () => {
        setShowConfirmModal(false);
        setExistingLicenseData(null);
        setLoading(false);
    };

    return (
        <>
            <ConfirmModal
                isOpen={showConfirmModal}
                licenseId={existingLicenseData?.id || ''}
                productName={existingLicenseData?.productName || ''}
                onConfirm={handleConfirmReplace}
                onCancel={handleCancelReplace}
            />

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

                {/* File Input - Drag and Drop */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 font-hebrew">
                        קובץ רישיון (PDF)
                    </label>
                    <div
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('new-license-upload')?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
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
                            {file && (
                                <p className="text-xs text-indigo-600 font-bold">✓ קובץ נבחר</p>
                            )}
                        </div>
                    </div>
                    <input
                        id="new-license-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
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
        </>
    );
};

export default UploadLicense;
