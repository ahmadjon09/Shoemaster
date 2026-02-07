import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, BrainCircuit } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_SETTINGS = {
    showDollar: true,
    aiAssistant: true,
};

export default function SettingsModal({ open, onClose }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);

    useEffect(() => {
        const saved = localStorage.getItem("shoemaster_settings");
        if (saved) {
            setSettings(JSON.parse(saved));
        } else {
            localStorage.setItem(
                "shoemaster_settings",
                JSON.stringify(DEFAULT_SETTINGS)
            );
        }
    }, []);

    // localStorage га ёзиш
    const toggle = (key) => {
        const updated = { ...settings, [key]: !settings[key] };
        setSettings(updated);
        localStorage.setItem(
            "shoemaster_settings",
            JSON.stringify(updated)
        );
        window.location.reload()
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Overlay */}
                    <motion.div
                        className="fixed inset-0 top-0 z-40 h-screen"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed z-50 top-1/2 left-1/2 w-[90%] max-w-md 
                       -translate-x-1/2 -translate-y-1/2 
                       bg-white rounded-2xl p-5 shadow-xl"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Созламалар</h2>
                            <button onClick={onClose}>
                                <X className="w-5 h-5 text-gray-500 hover:text-black" />
                            </button>
                        </div>

                        {/* Items */}
                        <div className="space-y-4">
                            {/* Dollar */}
                            <SettingItem
                                icon={<DollarSign />}
                                label="Доллар курсини кўрсатиш"
                                enabled={settings.showDollar}
                                onClick={() => toggle("showDollar")}
                            />

                            {/* AI */}
                            <SettingItem
                                icon={<BrainCircuit />}
                                label="AI ёрдамчи"
                                enabled={settings.aiAssistant}
                                onClick={() => toggle("aiAssistant")}
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function SettingItem({ icon, label, enabled, onClick }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between 
                 p-3 rounded-xl cursor-pointer 
                 hover:bg-gray-100 transition"
        >
            <div className="flex items-center gap-3">
                <div className="text-gray-700">{icon}</div>
                <span className="text-sm">{label}</span>
            </div>

            <div
                className={`w-11 h-6 rounded-full transition 
        ${enabled ? "bg-green-500" : "bg-gray-300"}`}
            >
                <div
                    className={`w-5 h-5 bg-white rounded-full mt-[2px] transition
          ${enabled ? "ml-5" : "ml-1"}`}
                />
            </div>
        </div>
    );
}
