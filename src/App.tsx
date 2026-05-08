import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

// --- CONFIG ---
const apiKey = "AIzaSyBoy-rUB5NxYiSdVuTMDcXPaG4oIcSRdUg";

// --- DATA & CONSTANTS ---
const INITIAL_DATA = {
    block: "神奈川南ブロック",
    reporter: "",
    storeReports: [] as any[],
    textAreaVision: "",
    textAreaSummary: "",
    textManagerCondition: "",
    summaryAm: "",
    textOtherTopics: "",
    hrEvents: [] as any[],
    interviewEvents: [] as any[]
};

const createWeeklyReport = (label: string = "第1週") => ({
    id: crypto.randomUUID(),
    weekLabel: label,
    kptKeep: "",
    kptProblemIdeal: "",
    kptProblemGap: "",
    kptTryWhoWhen: "自分とチーム / 来週の月曜日から",
    kptTryWhat: "",
    kptTryWhy: ""
});

const createStoreReport = (storeName: string) => ({
    id: storeName,
    storeName,
    weeklyReports: [createWeeklyReport("第1週")],
    summaryKeep: "",
    summaryProblem: "",
    summaryTry: "",
    textPromo: "",
    textFacility: "",
    summaryPromoFacility: "",
    textSalesPrevious: "",
    textSalesCurrent: "",
    textSalesBudget: "",
    summarySales: "",
    textStaffStore: "",
    summaryStaffStore: ""
});

const STORE_MASTER: Record<string, string[]> = {
    "神奈川南ブロック": [
        "京急横浜駅北口店", "イトーヨーカドー横浜別所店", "アピタ金沢文庫店", 
        "オーケーみなとみらい店", "ヨークフーズ上大岡店", "ウィング久里浜店", 
        "コースカベイサイドストアーズ店", "横浜市役所店", "サミット横浜岡野店",
        "ビーンズ保土ヶ谷店"
    ],
    "神奈川北ブロック": [
        "川崎アゼリア店", "武蔵小杉店", "溝の口店", "新百合ヶ丘店"
    ],
    "東京多摩ブロック": [
        "町田店", "八王子店", "立川店", "吉祥寺店"
    ]
};

const REPORTERS = [
    "越井直人", "松阪健吾", "仲原裕樹"
];

const OTHER_TOPICS_EXAMPLES = [
    "例：来期の出店候補地（〇〇駅前）の競合調査結果と勝算について",
    "例：エリア内店舗間の技術交流会（カット講習）の実施報告と効果測定",
    "例：〇〇店近隣の競合店撤退に伴う、新規客獲得施策の進捗",
    "例：若手スタッフの定着率向上に向けた、エリア独自のメンター制度運用状況"
];

const INTERVIEW_TYPES = [
    "評価面談", "個人キャリアプランについて", "店舗環境での改善について", 
    "接客態度スキルについて", "仕事のモチベーションとやりがいについて", 
    "業務進捗や目標設定や達成度", "技術力と研修の必要性について", 
    "ワークバランスとストレス管理について", "チーム内コミュニケーションと協力について", "その他"
];

// --- SERVICES ---
const summarizeText = async (label: string, content: string) => {
    if (!content.trim()) return "";
    
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const key = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '') || apiKey;
    if (!key) {
        alert("APIキーが設定されていません。\nコード内の `const apiKey = \"\";` にキーを入力してください。");
        return "エラー: API Key未設定";
    }

    const ai = new GoogleGenAI({ apiKey: key });

    const prompt = `
        You are an assistant for a store Area Manager. 
        Summarize the following text for a "${label}" section in a business report.
        
        Guidelines:
        - Output Language: Japanese
        - Keep it concise, professional, and easy to read.
        - Use "です/ます" (polite) style.
        - Fix any typos or grammatical errors.
        - Do not lose key facts or numbers.
        - If the input is just keywords, expand them into natural sentences.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt + "\n\nInput Text:\n" + content
        });
        
        return response.text;
    } catch (error: any) {
        console.error("Gemini Summary Error:", error);
        return "エラー: 生成に失敗しました (" + error.message + ")";
    }
};

const generateSalesSummary = (previous: string, current: string, budget: string) => {
    const p = parseFloat(previous);
    const c = parseFloat(current);
    const b = parseFloat(budget);

    const calcRatio = (val: number, base: number) => {
        if (!base || base === 0) return "-";
        return ((val / base) * 100).toFixed(1);
    };

    const prevRatio = !isNaN(p) && !isNaN(c) ? calcRatio(c, p) : "-";
    const budgetRatio = !isNaN(b) && !isNaN(c) ? calcRatio(c, b) : "-";
    
    const pStr = previous.trim() || "-";
    const cStr = current.trim() || "-";
    const bStr = budget.trim() || "-";

    return `▼前期実績: ${pStr}名 (前期比: ${prevRatio}%) / ▼今期実績: ${cStr}名 (予算比: ${budgetRatio}%) / ▼予算: ${bStr}名`;
};

// --- COMPONENTS ---

const PreviewModal = ({ isOpen, onClose, data }: any) => {
    if (!isOpen) return null;

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                alert("レポート要約をコピーしました");
            }).catch(() => {
                alert("コピーに失敗しました。手動でコピーしてください。");
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert("レポート要約をコピーしました");
            } catch (err) {
                alert("コピーに失敗しました");
            }
            document.body.removeChild(textarea);
        }
    };

    const generateSummaryReport = () => {
        const dateStr = new Date().toLocaleDateString('ja-JP');
        let report = `【ブロック近況報告 (要約)】\n`;
        report += `作成日: ${dateStr}\n`;
        report += `ブロック: ${data.block}\n`;
        report += `報告者: ${data.reporter}\n\n`;

        report += `==========================================\n`;
        report += ` 【重点項目の取組 / 店舗状況】\n`;
        report += `==========================================\n\n`;

        if (data.storeReports.length === 0) {
            report += `（店舗報告なし）\n\n`;
        } else {
            data.storeReports.forEach((store: any) => {
                report += `■ 店舗名: ${store.storeName}\n`;
                report += `------------------------------------------\n`;
                report += `[Keep (続けること)]\n${store.summaryKeep || "（要約未作成）"}\n\n`;
                report += `[Problem (問題)]\n${store.summaryProblem || "（要約未作成）"}\n\n`;
                report += `[Try (来月の実験)]\n${store.summaryTry || "（要約未作成）"}\n\n`;
                report += `[販促・設備]\n${store.summaryPromoFacility || "（要約未作成）"}\n\n`;
                
                const salesSummary = generateSalesSummary(
                    store.textSalesPrevious || "0", 
                    store.textSalesCurrent || "0", 
                    store.textSalesBudget || "0"
                );
                report += `[売上実績]\n${salesSummary}\n\n`;
                report += `[スタッフの様子]\n${store.summaryStaffStore || "（要約未作成）"}\n`;
                report += `------------------------------------------\n\n`;
            });
        }

        report += `==========================================\n`;
        report += ` 【入社・退職・休職情報】\n`;
        report += `==========================================\n`;
        if (data.hrEvents.length === 0) {
            report += `（特になし）\n\n`;
        } else {
            data.hrEvents.forEach((e: any) => {
                const typeLabel = e.type === 'hire' ? '入社' : e.type === 'retire' ? '退職' : '休職';
                report += `・${e.date} / ${e.store} / ${e.name} (${typeLabel})\n`;
                report += `  詳細: ${e.details}\n\n`;
            });
        }

        report += `==========================================\n`;
        report += ` 【スタッフ面談】\n`;
        report += `==========================================\n`;
        if (data.interviewEvents.length === 0) {
            report += `（特になし）\n\n`;
        } else {
            data.interviewEvents.forEach((e: any) => {
                report += `■ ${e.date} / ${e.store} / ${e.name}\n`;
                report += `   種類: ${e.interviewType || "未設定"} (重要度: ${e.importance || "中"}) / ステータス: ${e.status}\n`;
                report += `  [要約]\n  ${e.summary || "（要約未作成）"}\n\n`;
            });
        }

        report += `==========================================\n`;
        report += ` 【AM総括・その他】\n`;
        report += `==========================================\n`;
        report += `[AM総括]\n${data.summaryAm || "（要約未作成）"}\n\n`;
        report += `[その他トピックス]\n${data.textOtherTopics}\n`;

        return report;
    };

    const summaryReport = generateSummaryReport();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
            <div 
                className="dq-window w-full max-w-4xl max-h-[90vh] flex flex-col pt-0 px-0 animate-[slideUp_0.3s_ease-out]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white flex justify-between items-center mb-2">
                    <h3 className="text-lg text-white flex items-center">
                        <i className="fa-solid fa-file-lines mr-2"></i>レポートプレビュー (要約のみ)
                    </h3>
                    <button onClick={onClose} className="text-white hover:text-[#ffdf00] w-8 h-8 flex items-center justify-center transition">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    <textarea 
                        className="dq-input w-full h-full min-h-[50vh] leading-relaxed resize-none" 
                        readOnly 
                        value={summaryReport}
                    />
                </div>
                <div className="p-4 border-t border-white flex justify-end mt-2">
                    <button 
                        onClick={() => copyToClipboard(summaryReport)}
                        className="dq-window py-2 px-6 hover:text-[#ffdf00] hover:border-[#ffdf00] transition flex items-center justify-center"
                    >
                        <i className="fa-regular fa-copy mr-2"></i>全文コピー
                    </button>
                </div>
            </div>
        </div>
    );
};

const InputGroup = ({ title, icon, color, children, summaryValue, onSummarize, loadingId, currentLoadingId }: any) => {
    const isLoading = loadingId && currentLoadingId === loadingId;
    return (
        <section className={`dq-window mb-4 transition`}>
            <div className="flex justify-between items-start mb-3">
                <div className={`text-base flex items-center text-white`}>
                    <i className={`fa-solid ${icon} w-8 text-center mr-1`}></i>{title}
                </div>
            </div>
            <div className="space-y-3 mb-3">{children}</div>
            {onSummarize && (
                <div className="mt-4 border border-white p-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-white uppercase tracking-wider">AI Summary</span>
                        <button 
                            onClick={onSummarize} 
                            disabled={isLoading}
                            className="text-xs border border-white text-white px-4 py-1.5 hover:bg-white hover:text-black transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isLoading ? <i className="fa-solid fa-spinner fa-spin mr-1"></i> : <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>}
                            {isLoading ? "よみこみ中..." : "AIにきく"}
                        </button>
                    </div>
                    <textarea 
                        value={summaryValue || ""}
                        readOnly
                        className="dq-input w-full text-sm resize-none h-20"
                        placeholder="ここにAIのへんじがでます..."
                    />
                </div>
            )}
        </section>
    );
};

export default function App() {
    const [isLoadingApp, setIsLoadingApp] = useState(true);
    const [formData, setFormData] = useState(INITIAL_DATA);
    const [activeTab, setActiveTab] = useState('store');
    const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [loadingSection, setLoadingSection] = useState<string | null>(null);
    const [isAddingStore, setIsAddingStore] = useState(false);
    const [otherTopicsPlaceholder, setOtherTopicsPlaceholder] = useState("");
    const [newStoreInput, setNewStoreInput] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoadingApp(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);
    
    const aiStatus = 'ready'; // Since we bundle SDK directly, it's always ready.

    useEffect(() => {
        const saved = localStorage.getItem('qb_report_v4_draft');
        if (saved) {
            try { 
                const data = JSON.parse(saved);
                if (data.storeReports) {
                    data.storeReports = data.storeReports.map((s: any) => {
                        if (!s.weeklyReports) {
                            s.weeklyReports = [{
                                id: crypto.randomUUID(),
                                weekLabel: "第1週",
                                kptKeep: s.kptKeep || "",
                                kptProblemIdeal: s.kptProblemIdeal || "",
                                kptProblemGap: s.kptProblemGap || "",
                                kptTryWhoWhen: s.kptTryWhoWhen || "自分とチーム / 来週の月曜日から",
                                kptTryWhat: s.kptTryWhat || "",
                                kptTryWhy: s.kptTryWhy || ""
                            }];
                        }
                        return s;
                    });
                }
                setFormData(data); 
            } catch (e) { console.error(e); }
        }
        setOtherTopicsPlaceholder(OTHER_TOPICS_EXAMPLES[Math.floor(Math.random() * OTHER_TOPICS_EXAMPLES.length)]);
    }, []);

    useEffect(() => {
        if (activeTab === 'store' && !activeStoreId && formData.storeReports.length > 0) {
            setActiveStoreId(formData.storeReports[0].id);
        }
    }, [formData.storeReports, activeTab, activeStoreId]);

    const addWeeklyReport = (storeId: string) => {
        setFormData(prev => ({
            ...prev,
            storeReports: prev.storeReports.map((s: any) => 
                s.id === storeId ? 
                { ...s, weeklyReports: [...(s.weeklyReports || []), createWeeklyReport(`第${(s.weeklyReports?.length || 0) + 1}週`)] } 
                : s
            )
        }));
    };

    const updateWeeklyReport = (storeId: string, weekId: string, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            storeReports: prev.storeReports.map((s: any) => 
                s.id === storeId ? 
                { ...s, weeklyReports: s.weeklyReports.map((w: any) => w.id === weekId ? { ...w, [field]: value } : w) } 
                : s
            )
        }));
    };

    const removeWeeklyReport = (storeId: string, weekId: string) => {
        if (!window.confirm("この週の報告を削除しますか？")) return;
        setFormData(prev => ({
            ...prev,
            storeReports: prev.storeReports.map((s: any) => 
                s.id === storeId ? 
                { ...s, weeklyReports: s.weeklyReports.filter((w: any) => w.id !== weekId) } 
                : s
            )
        }));
    };

    const handleManualSave = () => {
        try {
            localStorage.setItem('qb_report_v4_draft', JSON.stringify(formData));
            setSaveStatus('保存完了');
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (e) { alert("保存に失敗しました"); }
    };

    const handleClearData = () => {
        if (!window.confirm("入力データをすべて消去しますか？\nこの操作は取り消せません。")) return;
        try {
            localStorage.removeItem('qb_report_v4_draft');
            setFormData(INITIAL_DATA);
            setActiveStoreId(null);
            setActiveTab('store');
            setSaveStatus('クリア完了');
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (e) { console.error(e); }
    };

    const updateBlockField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateStoreField = (storeId: string, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            storeReports: prev.storeReports.map((s: any) => s.id === storeId ? { ...s, [field]: value } : s)
        }));
    };

    const handleSummarize = async (sectionId: string, label: string, content: string, callback: (s:string) => void) => {
        setLoadingSection(sectionId);
        try {
            const summary = await summarizeText(label, content);
            if (summary) callback(summary);
        } catch (e) { alert("Error: " + e); } finally { setLoadingSection(null); }
    };

    const handleStoreSummarize = (storeId: string, fieldKey: string, label: string, ...inputs: string[]) => {
        const content = inputs.join("\n");
        handleSummarize(`${storeId}-${fieldKey}`, label, content, (summary) => {
            updateStoreField(storeId, fieldKey, summary);
        });
    };

    const addStoreTab = (storeName: string) => {
        if (!storeName.trim()) return;
        if (formData.storeReports.some((s: any) => s.storeName === storeName)) {
            alert("既に追加されています");
            return;
        }
        const newReport = createStoreReport(storeName);
        setFormData(prev => ({ ...prev, storeReports: [...prev.storeReports, newReport] }));
        setActiveStoreId(newReport.id);
        setIsAddingStore(false);
        setNewStoreInput("");
    };

    const removeStoreTab = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm("この店舗のデータを削除しますか？")) return;
        setFormData(prev => ({ ...prev, storeReports: prev.storeReports.filter((s: any) => s.id !== id) }));
        if (activeStoreId === id) setActiveStoreId(null);
    };

    const addHrEvent = () => updateBlockField('hrEvents', [...formData.hrEvents, { id: Date.now().toString(), type: 'hire', date: new Date().toLocaleDateString('ja-JP').split('/').join('-'), store: '', name: '', employeeId: '', details: '' }]);
    const updateHrEvent = (id: string, f: string, v: string) => updateBlockField('hrEvents', formData.hrEvents.map((e: any) => e.id === id ? { ...e, [f]: v } : e));
    const removeHrEvent = (id: string) => updateBlockField('hrEvents', formData.hrEvents.filter((e: any) => e.id !== id));
    
    const addInterviewEvent = () => updateBlockField('interviewEvents', [...formData.interviewEvents, { 
        id: Date.now().toString(), date: new Date().toLocaleDateString('ja-JP').split('/').join('-'), store: '', name: '', status: '継続', importance: '中', interviewType: INTERVIEW_TYPES[0], 
        contentMain: '', contentConcerns: '', contentNextAction: '', contentImpression: '', summary: '' 
    }]);
    const updateInterviewEvent = (id: string, f: string, v: string) => updateBlockField('interviewEvents', formData.interviewEvents.map((e: any) => e.id === id ? { ...e, [f]: v } : e));
    const removeInterviewEvent = (id: string) => updateBlockField('interviewEvents', formData.interviewEvents.filter((e: any) => e.id !== id));

    const availableStores = STORE_MASTER[formData.block] || [];
    const currentStore = formData.storeReports.find((s: any) => s.id === activeStoreId);

    if (isLoadingApp) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-[100] font-[DotGothic16] text-white">
                <div className="dq-window text-center animate-pulse inline-block">
                    <p className="text-xl mb-4">ぼうけんのしょ を よみこんでいます...</p>
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32 font-[DotGothic16] text-white">
            <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-md border-b shadow-md border-white/30">
                <div className="max-w-md mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-file-invoice text-xl"></i>
                            <h1 className="text-lg font-bold tracking-tight">QB REPORT <span className="text-xs opacity-70 font-normal">v4.1</span></h1>
                        </div>
                        <div className="text-xs sm:ml-4 border border-white/50 px-2 py-1 bg-black/40 backdrop-blur rounded">
                            <span className="flex items-center"><i className="fa-solid fa-check mr-1"></i>AI準備完了</span>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button onClick={handleClearData} className="dq-input px-3 py-1.5 hover:text-[#ffdf00] hover:border-[#ffdf00] transition flex items-center" title="データを全消去">
                            <i className="fa-solid fa-trash mr-1"></i>クリア
                        </button>
                        <button onClick={handleManualSave} className="dq-input px-3 py-1.5 hover:text-[#ffdf00] hover:border-[#ffdf00] transition flex items-center">
                            <i className="fa-solid fa-floppy-disk mr-1"></i>{saveStatus || "一時保存"}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-4">
                <section className="dq-window mb-4">
                    <div className="mb-4">
                        <label className="text-xs font-bold text-white block mb-1">エリア (ブロック)</label>
                        <div className="relative">
                            <input list="block-list" value={formData.block} onChange={e => updateBlockField('block', e.target.value)} className="dq-input w-full pl-3 transition" placeholder="ブロックを選択または入力" />
                            <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-white text-xs pointer-events-none"></i>
                        </div>
                        <datalist id="block-list">{Object.keys(STORE_MASTER).map(b => <option key={b} value={b} />)}</datalist>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-white block mb-1">報告者</label>
                        <div className="relative">
                            <input list="reporter-list" value={formData.reporter} onChange={e => updateBlockField('reporter', e.target.value)} className="dq-input w-full pl-3 transition" placeholder="報告者名を入力または選択" />
                            <i className="fa-solid fa-user absolute right-3 top-3 text-white text-xs pointer-events-none"></i>
                        </div>
                        <datalist id="reporter-list">{REPORTERS.map(r => <option key={r} value={r} />)}</datalist>
                    </div>
                </section>

                <div className="flex bg-black/40 backdrop-blur border border-white/50 rounded p-1 mb-4">
                    <button onClick={() => setActiveTab('store')} className={`flex-1 py-1 text-sm rounded transition duration-200 flex items-center justify-center ${activeTab === 'store' ? 'bg-white text-black' : 'text-white hover:text-gray-300'}`}>
                        <i className="fa-solid fa-store mr-2"></i>店舗個別
                    </button>
                    <button onClick={() => setActiveTab('block')} className={`flex-1 py-1 text-sm rounded transition duration-200 flex items-center justify-center ${activeTab === 'block' ? 'bg-white text-black' : 'text-white hover:text-gray-300'}`}>
                        <i className="fa-solid fa-layer-group mr-2"></i>エリア全体
                    </button>
                </div>

                {activeTab === 'store' && (
                    <div className="animate-[fadeIn_0.3s]">
                        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar px-1">
                            {formData.storeReports.map((report: any) => (
                                <div key={report.id} onClick={() => setActiveStoreId(report.id)} className={`flex-shrink-0 px-4 py-2 text-sm whitespace-nowrap cursor-pointer transition relative group border-2 rounded-t-lg ${activeStoreId === report.id ? 'bg-white text-black border-white' : 'bg-black/40 backdrop-blur text-white border-white/50 hover:bg-white/20'}`}>
                                    {report.storeName}
                                    <button onClick={(e) => removeStoreTab(e, report.id)} className={`ml-2 w-4 h-4 inline-flex items-center justify-center ${activeStoreId === report.id ? 'hover:bg-gray-200 text-black' : 'hover:bg-white hover:text-black text-gray-400'}`}>×</button>
                                </div>
                            ))}
                            <button onClick={() => setIsAddingStore(true)} className="flex-shrink-0 w-9 h-9 bg-black/40 backdrop-blur border-2 border-white/50 rounded-t-lg text-white hover:bg-white hover:text-black flex items-center justify-center transition"><i className="fa-solid fa-plus"></i></button>
                        </div>
                        
                        {isAddingStore && (
                            <div className="dq-window p-3 mb-4 animate-[slideUp_0.2s_ease-out]">
                                <div className="flex gap-2 mb-2">
                                    <input list="available-stores" className="dq-input flex-1" placeholder="店舗名を入力または選択..." value={newStoreInput} onChange={(e) => setNewStoreInput(e.target.value)} autoFocus />
                                    <datalist id="available-stores">{availableStores.map(s => <option key={s} value={s} />)}</datalist>
                                    <button onClick={() => { if(newStoreInput) addStoreTab(newStoreInput); }} className="dq-input px-4 hover:border-[#ffdf00] hover:text-[#ffdf00]">追加</button>
                                </div>
                                <div className="text-right">
                                    <button onClick={() => setIsAddingStore(false)} className="text-xs text-white hover:text-[#ffdf00] underline">キャンセル</button>
                                </div>
                            </div>
                        )}

                        {currentStore ? (
                            <div className="space-y-4">
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3 px-3 py-2 bg-black/40 backdrop-blur border border-white/50 rounded">
                                        <h3 className="text-white flex items-center"><i className="fa-solid fa-calendar-week mr-2"></i>週次KPT報告</h3>
                                        <span className="text-xs text-white">週ごとの振り返りを入力</span>
                                    </div>

                                    <div className="space-y-4">
                                        {currentStore.weeklyReports?.map((week: any) => (
                                            <div key={week.id} className="dq-window mb-4 pb-2">
                                                <div className="flex justify-between items-center mb-2 border-b border-white pb-2">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <i className="fa-regular fa-clock text-white"></i>
                                                        <input 
                                                            type="text" 
                                                            value={week.weekLabel} 
                                                            onChange={e => updateWeeklyReport(currentStore.id, week.id, 'weekLabel', e.target.value)}
                                                            placeholder="例: 第1週 (5/1~5/7)"
                                                            className="dq-input font-bold flex-1"
                                                        />
                                                    </div>
                                                    <button onClick={() => removeWeeklyReport(currentStore.id, week.id)} className="text-white hover:text-red-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition ml-2">
                                                        <i className="fa-solid fa-trash text-sm"></i>
                                                    </button>
                                                </div>
                                                
                                                <div className="space-y-5">
                                                    <div>
                                                        <div className="flex items-center gap-2 text-white text-sm font-bold mb-2">
                                                            <i className="fa-solid fa-arrow-up-right-dots"></i> Keep (続けること)
                                                        </div>
                                                        <textarea placeholder="よかった点、続けるべきことを入力してください..." value={week.kptKeep} onChange={e => updateWeeklyReport(currentStore.id, week.id, 'kptKeep', e.target.value)} className="dq-input w-full min-h-[60px] resize-y"/>
                                                    </div>
                                                    
                                                    <hr className="border-white" />
                                                    
                                                    <div>
                                                        <div className="flex items-center gap-2 text-white text-sm font-bold mb-2">
                                                            <i className="fa-solid fa-triangle-exclamation"></i> Problem (問題)
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-white mb-1 pl-1">・本来どうあるべきだったか</label>
                                                                <textarea placeholder="本来の目標やあるべき姿を入力..." value={week.kptProblemIdeal} onChange={e => updateWeeklyReport(currentStore.id, week.id, 'kptProblemIdeal', e.target.value)} className="dq-input w-full min-h-[50px] resize-y"/>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-white mb-1 pl-1">・気になった出来事（GAP）</label>
                                                                <textarea placeholder="実際に起きた出来事や問題点を入力..." value={week.kptProblemGap} onChange={e => updateWeeklyReport(currentStore.id, week.id, 'kptProblemGap', e.target.value)} className="dq-input w-full min-h-[50px] resize-y"/>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr className="border-white" />

                                                    <div>
                                                        <div className="flex items-center gap-2 text-white text-sm font-bold mb-2">
                                                            <i className="fa-solid fa-person-running"></i> Try (来週の実験)
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-white mb-1 pl-1">・誰が・いつ</label>
                                                                <input type="text" placeholder="自分とチーム / 来週の月曜日から" value={week.kptTryWhoWhen} onChange={e => updateWeeklyReport(currentStore.id, week.id, 'kptTryWhoWhen', e.target.value)} className="dq-input w-full"/>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-white mb-1 pl-1">・何をどうする</label>
                                                                <textarea placeholder="▶ (未入力)" value={week.kptTryWhat} onChange={e => updateWeeklyReport(currentStore.id, week.id, 'kptTryWhat', e.target.value)} className="dq-input w-full min-h-[50px] resize-y"/>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-white mb-1 pl-1">・なぜそれをするか（理由）</label>
                                                                <textarea placeholder="▶ (未入力)" value={week.kptTryWhy} onChange={e => updateWeeklyReport(currentStore.id, week.id, 'kptTryWhy', e.target.value)} className="dq-input w-full min-h-[50px] resize-y"/>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!currentStore.weeklyReports || currentStore.weeklyReports.length === 0) && (
                                            <div className="text-center py-6 border-2 border-dashed border-white rounded text-white text-sm">
                                                週次報告がありません。追加してください。
                                            </div>
                                        )}
                                        
                                        <button onClick={() => addWeeklyReport(currentStore.id)} className="w-full py-3 bg-black/40 backdrop-blur text-white border border-white/50 rounded hover:bg-white hover:text-black transition flex items-center justify-center gap-2">
                                            <i className="fa-solid fa-plus"></i> 新しい週次報告を追加
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-3 px-3 py-2 mt-6 bg-black/40 backdrop-blur border border-white/50 rounded">
                                    <h3 className="text-white flex items-center"><i className="fa-solid fa-robot mr-2"></i>月間まとめ生成 (AI)</h3>
                                    <span className="text-xs text-white">週次報告から月間要約を作成</span>
                                </div>

                                <InputGroup title="Keep (月間要約)" icon="fa-arrow-up-right-dots" color="border-white" summaryValue={currentStore.summaryKeep} loadingId={`${currentStore.id}-summaryKeep`} currentLoadingId={loadingSection} onSummarize={() => {
                                    const content = (currentStore.weeklyReports || []).map((w: any) => `【${w.weekLabel || '名称未設定'}】\n${w.kptKeep}`).join('\n\n');
                                    handleStoreSummarize(currentStore.id, 'summaryKeep', 'Keep（続けること）の月間要約。各週の振り返り情報を要約し、今月定着した良い取り組みとしてまとめてください。', content);
                                }}>
                                    <div className="text-xs text-white"><i className="fa-solid fa-circle-info mr-1"></i>上記の週次報告に入力されたすべての「Keep」を結合して、今月の良い取り組みとして要約します。</div>
                                </InputGroup>

                                <InputGroup title="Problem (月間要約)" icon="fa-triangle-exclamation" color="border-white" summaryValue={currentStore.summaryProblem} loadingId={`${currentStore.id}-summaryProblem`} currentLoadingId={loadingSection} onSummarize={() => {
                                    const content = (currentStore.weeklyReports || []).map((w: any) => `【${w.weekLabel || '名称未設定'}】\n・本来の姿: ${w.kptProblemIdeal}\n・GAP: ${w.kptProblemGap}`).join('\n\n');
                                    handleStoreSummarize(currentStore.id, 'summaryProblem', 'Problem（問題）の月間要約。各週の理想とGAP（問題点）を統合し、主要な課題としてまとめてください。', content);
                                }}>
                                    <div className="text-xs text-white"><i className="fa-solid fa-circle-info mr-1"></i>上記の週次報告に入力されたすべての「Problem」を統合し、今月の主要な課題として要約します。</div>
                                </InputGroup>

                                <InputGroup title="Try (月間要約)" icon="fa-person-running" color="border-white" summaryValue={currentStore.summaryTry} loadingId={`${currentStore.id}-summaryTry`} currentLoadingId={loadingSection} onSummarize={() => {
                                    const content = (currentStore.weeklyReports || []).map((w: any) => `【${w.weekLabel || '名称未設定'}】\n・誰がいつ: ${w.kptTryWhoWhen}\n・何を: ${w.kptTryWhat}\n・理由: ${w.kptTryWhy}`).join('\n\n');
                                    handleStoreSummarize(currentStore.id, 'summaryTry', 'Try（来月の実験）の月間要約。各週のアクション（Try）を分析し、来月に持ち越すべき重要アクションとしてまとめてください。', content);
                                }}>
                                    <div className="text-xs text-white"><i className="fa-solid fa-circle-info mr-1"></i>上記の週次報告に入力されたすべての「Try」を分析し、来月のアクションプランとして要約します。</div>
                                </InputGroup>

                                <InputGroup title="販促・設備" icon="fa-shop" color="border-white" summaryValue={currentStore.summaryPromoFacility} loadingId={`${currentStore.id}-summaryPromoFacility`} currentLoadingId={loadingSection} onSummarize={() => handleStoreSummarize(currentStore.id, 'summaryPromoFacility', '販促・設備報告', `【販促】\n${currentStore.textPromo}`, `【設備】\n${currentStore.textFacility}`)}>
                                    <textarea placeholder="【販促】 キャンペーン実施状況など" value={currentStore.textPromo} onChange={e => updateStoreField(currentStore.id, 'textPromo', e.target.value)} className="dq-input w-full h-16 resize-none mb-2"/>
                                    <textarea placeholder="【設備】 修繕・不具合など" value={currentStore.textFacility} onChange={e => updateStoreField(currentStore.id, 'textFacility', e.target.value)} className="dq-input w-full h-16 resize-none"/>
                                </InputGroup>

                                <InputGroup title="売上実績" icon="fa-chart-line" color="border-white">
                                    <div className="grid grid-cols-1 gap-3 p-3 border border-white" onChange={() => setTimeout(() => updateStoreField(currentStore.id, 'summarySales', generateSalesSummary(currentStore.textSalesPrevious || "0", currentStore.textSalesCurrent || "0", currentStore.textSalesBudget || "0")), 0)}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs w-20 text-white bg-black/40 backdrop-blur border border-white/50 rounded px-2 py-1">▼前期実績</span>
                                            <input type="number" placeholder="0" value={currentStore.textSalesPrevious || ""} onChange={e => updateStoreField(currentStore.id, 'textSalesPrevious', e.target.value)} className="dq-input flex-1 h-8"/>
                                            <span className="text-xs text-white">名</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs w-20 text-white bg-black/40 backdrop-blur border border-white/50 rounded px-2 py-1">▼今期実績</span>
                                            <input type="number" placeholder="0" value={currentStore.textSalesCurrent || ""} onChange={e => updateStoreField(currentStore.id, 'textSalesCurrent', e.target.value)} className="dq-input flex-1 h-8"/>
                                            <span className="text-xs text-white">名</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs w-20 text-white bg-black/40 backdrop-blur border border-white/50 rounded px-2 py-1">▼予算</span>
                                            <input type="number" placeholder="0" value={currentStore.textSalesBudget || ""} onChange={e => updateStoreField(currentStore.id, 'textSalesBudget', e.target.value)} className="dq-input flex-1 h-8"/>
                                            <span className="text-xs text-white">名</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-white p-3 border border-white flex items-start">
                                        <i className="fa-solid fa-calculator mt-0.5 mr-2"></i>
                                        {generateSalesSummary(currentStore.textSalesPrevious || "0", currentStore.textSalesCurrent || "0", currentStore.textSalesBudget || "0")}
                                    </div>
                                </InputGroup>

                                <InputGroup title="スタッフの様子 (店舗)" icon="fa-face-smile" color="border-white" summaryValue={currentStore.summaryStaffStore} loadingId={`${currentStore.id}-summaryStaffStore`} currentLoadingId={loadingSection} onSummarize={() => handleStoreSummarize(currentStore.id, 'summaryStaffStore', 'スタッフの様子', currentStore.textStaffStore)}>
                                    <textarea placeholder="例：新人Aさんの技術向上が見られる。チームワークは良好。" value={currentStore.textStaffStore} onChange={e => updateStoreField(currentStore.id, 'textStaffStore', e.target.value)} className="dq-input w-full h-24 resize-none"/>
                                </InputGroup>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-white dq-window border-dashed border-2">
                                <i className="fa-solid fa-store text-4xl mb-2 opacity-50"></i>
                                <p className="text-sm">店舗が選択されていません</p>
                                <p className="text-xs mt-1">上の「＋」ボタンから追加してください</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'block' && (
                    <div className="animate-[fadeIn_0.3s]">
                        <InputGroup title="AM総括" icon="fa-clipboard-list" color="border-white" summaryValue={formData.summaryAm} loadingId="am-summary" currentLoadingId={loadingSection} onSummarize={() => handleSummarize("am-summary", "AM総括", `◆エリアビジョン\n${formData.textAreaVision}\n◆エリア取り組み/総括\n${formData.textAreaSummary}\n◆管轄店長,副店長様子\n${formData.textManagerCondition}`, (s) => updateBlockField('summaryAm', s))}>
                            <div className="space-y-2">
                                <textarea placeholder="◆エリアビジョン" value={formData.textAreaVision} onChange={e => updateBlockField('textAreaVision', e.target.value)} className="dq-input w-full h-20 resize-none"/>
                                <textarea placeholder="◆エリア取り組み/総括" value={formData.textAreaSummary} onChange={e => updateBlockField('textAreaSummary', e.target.value)} className="dq-input w-full h-20 resize-none"/>
                                <textarea placeholder="◆管轄店長,副店長様子" value={formData.textManagerCondition} onChange={e => updateBlockField('textManagerCondition', e.target.value)} className="dq-input w-full h-20 resize-none"/>
                            </div>
                        </InputGroup>

                        <InputGroup title="その他トピックス" icon="fa-lightbulb" color="border-white">
                            <textarea placeholder={otherTopicsPlaceholder} value={formData.textOtherTopics} onChange={e => updateBlockField('textOtherTopics', e.target.value)} className="dq-input w-full h-24 resize-none"/>
                        </InputGroup>

                        <section className="dq-window mb-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white flex items-center"><i className="fa-solid fa-user-group mr-2"></i>入社・退職・休職</h3>
                                <button onClick={addHrEvent} className="dq-input px-3 py-1.5 hover:text-[#ffdf00] hover:border-[#ffdf00] transition"><i className="fa-solid fa-plus mr-1"></i>追加</button>
                            </div>
                            <div className="space-y-3">
                                {formData.hrEvents.map((evt: any) => (
                                    <div key={evt.id} className="border border-white p-3 mb-3 relative animate-[fadeIn_0.3s]">
                                        <button onClick={() => removeHrEvent(evt.id)} className="absolute top-2 right-2 text-white hover:text-red-400 transition"><i className="fa-solid fa-trash"></i></button>
                                        <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
                                            <select value={evt.type} onChange={e => updateHrEvent(evt.id, 'type', e.target.value)} className="dq-input w-full p-1.5"><option value="hire">入社</option><option value="retire">退職</option><option value="leave">休職</option></select>
                                            <input type="date" value={evt.date} onChange={e => updateHrEvent(evt.id, 'date', e.target.value)} className="dq-input w-full p-1.5"/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <select value={evt.store} onChange={e => updateHrEvent(evt.id, 'store', e.target.value)} className="dq-input w-full p-1.5"><option value="">店舗選択</option>{availableStores.map((s: string) => <option key={s} value={s}>{s}</option>)}</select>
                                            <input placeholder="氏名" value={evt.name} onChange={e => updateHrEvent(evt.id, 'name', e.target.value)} className="dq-input w-full p-1.5"/>
                                        </div>
                                        <textarea placeholder="詳細 (理由など)" value={evt.details} onChange={e => updateHrEvent(evt.id, 'details', e.target.value)} className="dq-input w-full h-16 resize-none"/>
                                    </div>
                                ))}
                                {formData.hrEvents.length === 0 && <p className="text-center text-white p-2">データがありません</p>}
                            </div>
                        </section>

                        <section className="dq-window mb-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white flex items-center"><i className="fa-solid fa-comments mr-2"></i>スタッフ面談</h3>
                                <button onClick={addInterviewEvent} className="dq-input px-3 py-1.5 hover:text-[#ffdf00] hover:border-[#ffdf00] transition"><i className="fa-solid fa-plus mr-1"></i>追加</button>
                            </div>
                            <div className="space-y-4">
                                {formData.interviewEvents.map((evt: any) => (
                                    <div key={evt.id} className="border border-white p-4 mb-3 relative animate-[fadeIn_0.3s]">
                                        <button onClick={() => removeInterviewEvent(evt.id)} className="absolute top-3 right-3 text-white hover:text-red-400 transition"><i className="fa-solid fa-trash"></i></button>
                                        
                                        <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
                                            <input type="date" value={evt.date} onChange={e => updateInterviewEvent(evt.id, 'date', e.target.value)} className="dq-input p-1.5 w-full"/>
                                            <div className="flex bg-black/40 backdrop-blur border border-white/50 rounded overflow-hidden">
                                                {['高', '中', '低'].map(imp => (
                                                    <button key={imp} onClick={() => updateInterviewEvent(evt.id, 'importance', imp)} className={`flex-1 text-xs py-1 transition ${evt.importance === imp ? 'bg-white text-black' : 'bg-transparent text-white hover:bg-white/20'}`}>{imp}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <select value={evt.store} onChange={e => updateInterviewEvent(evt.id, 'store', e.target.value)} className="dq-input w-full p-1.5"><option value="">店舗選択</option>{availableStores.map((s: string) => <option key={s} value={s}>{s}</option>)}</select>
                                            <input placeholder="氏名" value={evt.name} onChange={e => updateInterviewEvent(evt.id, 'name', e.target.value)} className="dq-input w-full p-1.5"/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <select value={evt.interviewType} onChange={e => updateInterviewEvent(evt.id, 'interviewType', e.target.value)} className="dq-input w-full p-1.5"><option value="">面談種類を選択</option>{INTERVIEW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                            <select value={evt.status} onChange={e => updateInterviewEvent(evt.id, 'status', e.target.value)} className={`dq-input w-full p-1.5 ${evt.status === '完了' ? 'text-[#ffdf00]' : 'text-white'}`}><option value="継続">継続</option><option value="完了">完了</option><option value="BMフォロー必要">BMフォロー必要</option></select>
                                        </div>
                                        
                                        <div className="space-y-3 mb-3">
                                            {[
                                                {k: 'contentMain', l: '主な内容'},
                                                {k: 'contentConcerns', l: '懸案事項/未解決事項'},
                                                {k: 'contentNextAction', l: '次回アクション'},
                                                {k: 'contentImpression', l: '所感'}
                                            ].map((item: any) => (
                                                <div key={item.k}>
                                                    <div className="text-[10px] text-white mb-0.5 ml-1">【{item.l}】</div>
                                                    <textarea value={evt[item.k]} onChange={e => updateInterviewEvent(evt.id, item.k, e.target.value)} className="dq-input w-full h-12 resize-none"/>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="border border-white p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-white">面談要約</span>
                                                <button 
                                                    onClick={() => handleSummarize(`interview-${evt.id}`, "面談内容", `種類: ${evt.interviewType}\n重要度: ${evt.importance}\n主な内容: ${evt.contentMain}\n懸案: ${evt.contentConcerns}\nアクション: ${evt.contentNextAction}\n所感: ${evt.contentImpression}`, (s) => updateInterviewEvent(evt.id, 'summary', s))} 
                                                    disabled={loadingSection === `interview-${evt.id}`} 
                                                    className="border border-white text-white px-3 py-1 hover:bg-white hover:text-black transition disabled:opacity-50"
                                                >
                                                    {loadingSection === `interview-${evt.id}` ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>} AIにきく
                                                </button>
                                            </div>
                                            <textarea 
                                                value={evt.summary} 
                                                readOnly 
                                                className="dq-input w-full h-16 resize-none" 
                                                placeholder="要約結果がここに表示されます..."
                                            />
                                        </div>
                                    </div>
                                ))}
                                 {formData.interviewEvents.length === 0 && <p className="text-center text-white p-2">データがありません</p>}
                            </div>
                        </section>
                    </div>
                )}
            </main>

            <div className="fixed bottom-0 left-0 w-full bg-black/60 backdrop-blur-md border-t border-white/30 p-3 z-50">
                <button onClick={() => setShowPreview(true)} className="w-full max-w-md mx-auto block dq-window text-white font-bold py-3.5 hover:text-black hover:bg-white hover:border-[#ffdf00] transition flex items-center justify-center">
                    <i className="fa-regular fa-clipboard mr-2 text-lg"></i>レポート全文コピー (要約のみ)
                </button>
            </div>

            <PreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} data={formData} />
        </div>
    );
}

