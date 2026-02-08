import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import { License } from './types/License';
import { licenseAPI } from './services/api';
import InvoiceProcessor from './components/InvoiceProcessor';
import UploadLicense from './components/UploadLicense';
import History from './components/History';

type TabType = 'invoice' | 'license' | 'search' | 'history';

function App() {
    const [activeTab, setActiveTab] = useState<TabType>('invoice');
    const [licenses, setLicenses] = useState<License[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [historyRenderKey, setHistoryRenderKey] = useState<boolean>(false); // To force re-render History component

    const handleSearch = async (query: string) => {
        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const response = await licenseAPI.search(query);
            setLicenses(response.data);
        } catch (err: any) {
            console.error('Search error:', err);
            setError(err.response?.data?.error || 'שגיאה בחיפוש. אנא נסה שוב.');
            setLicenses([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleHistoryUpdate = () => {
        setHistoryRenderKey(!historyRenderKey); // Toggle to force re-render
    }

    const tabs = [
        { id: 'invoice' as TabType, label: 'הפקת רישיונות', icon: '📄' },
        { id: 'license' as TabType, label: 'העלאת רישיון חדש', icon: '📤' },
        { id: 'search' as TabType, label: 'חיפוש רישיון', icon: '🔍' },
        { id: 'history' as TabType, label: 'היסטוריה', icon: '📚' ,onclick:handleHistoryUpdate}
    ];

    return (
        <div className="min-h-screen py-2 px-4 flex flex-col">
            <div className="max-w-7xl mx-auto flex-1 flex flex-col w-full">
                {/* Header */}
                <header className="text-center mb-3 animate-fadeIn">
                    <div className="inline-block p-4 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-3 font-hebrew">
                            מערכת רישיונות קוסמטיקה
                        </h1>
                        <p className="text-gray-600 text-lg font-hebrew" dir="rtl">
                            חפש והורד רישיונות קוסמטיקה בקלות
                        </p>
                    </div>
                </header>

                {/* Tabs Navigation */}
                <div className="mb-3 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-2 inline-flex gap-2 mx-auto" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <div className="inline-flex gap-2 mx-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    if(tab.onclick) tab.onclick();}}
                                className={`px-6 py-1.5 rounded-xl text-center font-bold font-hebrew transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1">
                    <div className={activeTab === 'invoice' ? 'block animate-fadeIn' : 'hidden'}>
                        <InvoiceProcessor />
                    </div>

                    <div className={activeTab === 'license' ? 'flex justify-center animate-fadeIn' : 'hidden'}>
                        <UploadLicense />
                    </div>

                    <div className={activeTab === 'search' ? 'block animate-fadeIn' : 'hidden'}>
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-center text-gray-700 mb-8 font-hebrew">חיפוש במאגר הקיים</h2>
                            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="max-w-3xl mx-auto mb-6 animate-fadeIn">
                                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg shadow-md" dir="rtl">
                                    <div className="flex items-center gap-3">
                                        <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-red-700 font-medium font-hebrew">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search Results */}
                        <SearchResults
                            licenses={licenses}
                            isLoading={isLoading}
                            hasSearched={hasSearched}
                        />
                    </div>

                    <div className={activeTab === 'history' ? 'block animate-fadeIn' : 'hidden'}>
                        <History historyRenderKey={historyRenderKey} />
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-auto pt-4 text-center animate-fadeIn">
                    <div className="inline-block px-6 py-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
                        <p className="text-gray-600 font-hebrew" dir="rtl">
                            כספי סוכני מכס ושילוח בינלאומי © 2026
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;
